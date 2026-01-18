# Phase 4 Implementation Guide: Teable Integration
## Complete Prompts + Best Practices for Antigravity IDE

**Status**: Ready for Implementation  
**Estimated Duration**: 2.5-3 hours  
**Complexity**: Medium (webhook integration + validation)  
**Based on**: Phase 3 Complete (40/100)  
**Target Score**: 55/100 after Phase 4

---

## 🎯 Phase 4 Overview

### What Gets Built
```
Teable Form (User selects exportPath)
      ↓
Teable Webhook fires
      ↓
TeableWebhookController validates payload
      ↓
ExpressExportService.queueForExport() called
      ↓
ExportQueue + ExportLog created
      ↓
3 Paths:
  1. Manual → No action (user downloads CSV manually)
  2. Immediate → processImmediate() async (POST to Express)
  3. Scheduled → Queue for 18:00 cron job
```

### Key Deliverables
- [x] Teable form field added (exportPath selector)
- [x] TeableWebhookController updated
- [x] Webhook signature validation (security)
- [x] Zod schema for payload validation
- [x] Integration with ExpressExportService
- [x] Discord alerts for all paths
- [x] Integration tests (5+ scenarios)
- [x] Error handling + retry logic

---

## 📋 Task 4.1: Analyze Current Teable Setup

### Prompt for Antigravity IDE

```
@backend/src/modules/teable/ @backend/src/controllers/

Analyze current Teable webhook implementation:

1. Find the webhook receiver endpoint (POST /webhooks/teable or similar)
2. Identify the payload structure
3. Find where "approved" status is checked
4. Locate where JournalEntry is created/updated
5. Find Discord alert code that's already used

Then answer these questions:
- What fields are currently extracted from Teable webhook?
- Where is the entry status checked?
- How are errors currently logged?
- Is there rate limiting on webhook?

Create a summary document with:
- Current webhook endpoint path
- Payload structure (JSON example)
- Fields currently extracted
- Error handling pattern used
- Existing Discord alert code snippet

Do NOT modify code. Just analyze and document.
```

**Verification**: Summary document shows current webhook structure

---

## 🔧 Task 4.2: Add exportPath Field to Teable Form

### Prompt for Antigravity IDE

```
@backend/src/services/TeableService.ts (or similar)

Update Teable table schema to add exportPath field.

Requirements:
1. Field name: exportPath
2. Field type: Single Select (dropdown)
3. Options:
   - "manual" (label: "Manual - Download CSV later")
   - "immediate" (label: "Immediate - Post to Express now")
   - "scheduled" (label: "Scheduled - Queue for 18:00 batch")
4. Default value: "scheduled"
5. Required: true (must select one)
6. Description: "How should this entry be exported to Express?"
7. Help text: "Manual: You'll download CSV. Immediate: Auto-posts now. Scheduled: Queued for 18:00 daily."

Using Teable SDK (teable.com/api):
- Get table schema
- Add new field with single select type
- Push changes
- Return confirmation

If using API directly (no SDK):
- POST /api/tables/{tableId}/fields
- Body: { name: 'exportPath', type: 'singleSelect', options: [...] }
```

**Verification**: Field appears in Teable form with 3 options

---

## 📝 Task 4.3: Create Zod Schema for Webhook Payload

### Prompt for Antigravity IDE

```
@backend/src/modules/teable/schemas/

Create webhook payload validation schema.

File: TeableWebhookSchema.ts

Requirements:

```typescript
import { z } from 'zod';

// Export path enum
export const ExportPathSchema = z.enum(['manual', 'immediate', 'scheduled']);

// Teable record fields
export const TeableRecordFieldsSchema = z.object({
  status: z.string(), // 'approved', 'draft', etc
  exportPath: ExportPathSchema, // New field we just added
  entryId: z.string(), // Reference to JournalEntry._id
});

// Full webhook payload
export const TeableWebhookSchema = z.object({
  event: z.enum(['record.created', 'record.updated']),
  data: z.object({
    recordId: z.string(),
    tableId: z.string(),
    fields: TeableRecordFieldsSchema,
  }),
});

export type TeableWebhookPayload = z.infer<typeof TeableWebhookSchema>;
export type ExportPath = z.infer<typeof ExportPathSchema>;
```

This schema:
- ✅ Validates event type (only updated records matter)
- ✅ Validates exportPath is one of 3 options
- ✅ Ensures required fields present
- ✅ Type-safe inference for TypeScript

Test schema with invalid inputs:
- Missing exportPath
- Invalid exportPath value ("invalid")
- Missing entryId
- Missing status

All should throw zod.ZodError.
```

**Verification**: Schema created, tests show correct validation

---

## 🎮 Task 4.4: Create TeableWebhookController

### Prompt for Antigravity IDE

```
@backend/src/modules/teable/controllers/

Create TeableWebhookController.ts

Requirements:

```typescript
import { Request, Response } from 'express';
import { TeableWebhookSchema } from '../schemas/TeableWebhookSchema';
import { ExpressExportService } from '../../export/ExpressExportService';
import { sendInfoLog, sendCriticalAlert } from '../../../loaders/logger';

export class TeableWebhookController {
  constructor(private exportService: ExpressExportService) {}

  async processWebhook(req: Request, res: Response) {
    try {
      // 1. Validate payload with Zod
      const payload = TeableWebhookSchema.parse(req.body);
      
      // 2. Extract fields
      const { recordId, fields, tableId } = payload.data;
      const { status, exportPath, entryId } = fields;
      
      // 3. Only process if status='approved'
      if (status !== 'approved') {
        return res.status(200).json({ 
          message: 'Ignored: Record not approved yet',
          recordId 
        });
      }
      
      // 4. Validate entryId exists (optional but recommended)
      // You might want to check JournalEntry._id exists before queueing
      
      // 5. Call exportService.queueForExport()
      const queue = await this.exportService.queueForExport(
        entryId,
        exportPath,
        'system' // system user for webhook
      );
      
      // 6. If immediate, trigger async export
      if (exportPath === 'immediate') {
        // Fire-and-forget (don't await)
        this.exportService.processImmediate(queue._id).catch(err => {
          sendCriticalAlert(\`Immediate export failed: \${err.message}\`);
        });
      }
      
      // 7. Discord alert
      await sendInfoLog(
        \`Teable webhook: Entry \${entryId} queued (exportPath=\${exportPath})\`
      );
      
      // 8. Return success response
      return res.status(200).json({
        success: true,
        queueId: queue._id,
        status: queue.status,
        exportPath: queue.exportPath,
        message: \`Queued for \${exportPath} export\`
      });
      
    } catch (error) {
      // Validation error from Zod
      if (error instanceof ZodError) {
        sendCriticalAlert(\`Webhook validation failed: \${error.message}\`);
        return res.status(400).json({ 
          error: 'Invalid payload',
          details: error.errors 
        });
      }
      
      // Other errors
      sendCriticalAlert(\`Webhook processing error: \${error.message}\`);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
}
```

Important notes:
- ✅ Uses ZodError for validation
- ✅ Only processes 'approved' status
- ✅ Fire-and-forget pattern for immediate
- ✅ Proper error handling
- ✅ Discord alerts for failures
- ✅ Appropriate HTTP status codes (200, 400, 500)

Add JSDoc comments for all methods.
Ensure TypeScript strict mode (no 'any').
```

**Verification**: Controller created, logic clear

---

## 🛣️ Task 4.5: Register Webhook Route

### Prompt for Antigravity IDE

```
@backend/src/modules/teable/routes.ts

Create/Update routes file:

```typescript
import { Router } from 'express';
import { TeableWebhookController } from './controllers/TeableWebhookController';
import { ExpressExportService } from '../export/ExpressExportService';

const router = Router();

// Inject dependencies
const exportService = new ExpressExportService();
const webhookController = new TeableWebhookController(exportService);

// Webhook endpoint (no auth needed - Teable calls this)
// But ADD signature verification for security
router.post(
  '/webhooks/export',
  // Optional: Add middleware for signature verification
  // middleware.verifyTeableSignature(),
  webhookController.processWebhook.bind(webhookController)
);

export default router;
```

Then register in backend/src/loaders/express.ts:

```typescript
// Add this line with other route registrations
import teableRouter from '../modules/teable/routes';
app.use('/api/teable', teableRouter);
```

Final route: POST /api/teable/webhooks/export

Verify:
- Route registered
- Controller bound correctly
- No circular dependencies
```

**Verification**: Route accessible at POST /api/teable/webhooks/export

---

## 🔐 Task 4.6: Add Webhook Signature Verification (SECURITY)

### Prompt for Antigravity IDE

```
@backend/src/middleware/

Create webhook signature verification middleware.

File: verifyTeableSignature.ts

Requirements:

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function verifyTeableSignature(req: Request, res: Response, next: NextFunction) {
  // Get signature from header
  const signature = req.headers['x-teable-signature'] as string;
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  // Get webhook secret from env
  const webhookSecret = process.env.TEABLE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    // Log warning but allow (webhook secret not configured)
    console.warn('TEABLE_WEBHOOK_SECRET not set - skipping signature verification');
    return next();
  }
  
  // Create HMAC with body + secret
  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  // Compare signatures
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}
```

Add to express.ts:

```typescript
import { verifyTeableSignature } from '../middleware/verifyTeableSignature';

// Add middleware to webhook route ONLY
app.post('/api/teable/webhooks/export', verifyTeableSignature, (req, res) => {
  // Route handler
});
```

Add to .env:
```
TEABLE_WEBHOOK_SECRET=your_webhook_secret_from_teable_dashboard
```

Note: timingSafeEqual prevents timing attacks.
```

**Verification**: Signature verification working

---

## 🧪 Task 4.7: Create Integration Tests

### Prompt for Antigravity IDE

```
@backend/tests/integration/

Create teable-webhook-export.test.ts

Requirements:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import request from 'supertest';
import { app } from '../../../src/index';
import { ExportQueue } from '../../../src/models/ExportQueue';
import { ExportLog } from '../../../src/models/ExportLog';
import { JournalEntry } from '../../../src/models/JournalEntry';

describe('Teable Webhook Export Integration', () => {
  
  beforeEach(async () => {
    // Clear collections
    await ExportQueue.deleteMany({});
    await ExportLog.deleteMany({});
  });
  
  afterEach(async () => {
    // Cleanup
    await ExportQueue.deleteMany({});
    await ExportLog.deleteMany({});
  });

  it('should queue entry with exportPath=manual', async () => {
    // Create approved entry first
    const entry = await JournalEntry.create({
      status: 'approved',
      amounts: { debit: 1000, credit: 1000 }
    });

    // Send webhook
    const payload = {
      event: 'record.updated',
      data: {
        recordId: 'rec_xxx',
        tableId: 'tbl_yyy',
        fields: {
          status: 'approved',
          exportPath: 'manual',
          entryId: entry._id.toString()
        }
      }
    };

    const res = await request(app)
      .post('/api/teable/webhooks/export')
      .send(payload)
      .expect(200);

    // Verify response
    expect(res.body).toHaveProperty('queueId');
    expect(res.body.exportPath).toBe('manual');
    expect(res.body.success).toBe(true);

    // Verify queue created
    const queue = await ExportQueue.findOne({ entryId: entry._id });
    expect(queue).toBeDefined();
    expect(queue.status).toBe('queued');
    expect(queue.exportPath).toBe('manual');
  });

  it('should queue entry with exportPath=immediate and trigger async', async () => {
    const entry = await JournalEntry.create({
      status: 'approved',
      amounts: { debit: 1000, credit: 1000 }
    });

    const payload = {
      event: 'record.updated',
      data: {
        recordId: 'rec_xxx',
        tableId: 'tbl_yyy',
        fields: {
          status: 'approved',
          exportPath: 'immediate',
          entryId: entry._id.toString()
        }
      }
    };

    const res = await request(app)
      .post('/api/teable/webhooks/export')
      .send(payload)
      .expect(200);

    expect(res.body.exportPath).toBe('immediate');
    expect(res.body.success).toBe(true);

    // Wait for async processing
    await new Promise(r => setTimeout(r, 500));

    // Check if queue processed
    const queue = await ExportQueue.findOne({ entryId: entry._id });
    expect(queue).toBeDefined();
  });

  it('should queue entry with exportPath=scheduled and set scheduledFor', async () => {
    const entry = await JournalEntry.create({
      status: 'approved',
      amounts: { debit: 1000, credit: 1000 }
    });

    const payload = {
      event: 'record.updated',
      data: {
        recordId: 'rec_xxx',
        tableId: 'tbl_yyy',
        fields: {
          status: 'approved',
          exportPath: 'scheduled',
          entryId: entry._id.toString()
        }
      }
    };

    const res = await request(app)
      .post('/api/teable/webhooks/export')
      .send(payload)
      .expect(200);

    const queue = await ExportQueue.findOne({ entryId: entry._id });
    expect(queue.scheduledFor).toBeDefined();
    expect(queue.scheduledFor.getHours()).toBe(18); // 18:00
  });

  it('should ignore unapproved record', async () => {
    const payload = {
      event: 'record.updated',
      data: {
        recordId: 'rec_xxx',
        tableId: 'tbl_yyy',
        fields: {
          status: 'draft', // NOT approved
          exportPath: 'manual',
          entryId: 'entry_123'
        }
      }
    };

    const res = await request(app)
      .post('/api/teable/webhooks/export')
      .send(payload)
      .expect(200);

    expect(res.body.message).toContain('not approved');

    // Verify queue NOT created
    const count = await ExportQueue.countDocuments();
    expect(count).toBe(0);
  });

  it('should reject invalid exportPath', async () => {
    const payload = {
      event: 'record.updated',
      data: {
        recordId: 'rec_xxx',
        tableId: 'tbl_yyy',
        fields: {
          status: 'approved',
          exportPath: 'invalid_path', // Invalid!
          entryId: 'entry_123'
        }
      }
    };

    const res = await request(app)
      .post('/api/teable/webhooks/export')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Invalid');
  });

  it('should reject missing required fields', async () => {
    const payload = {
      event: 'record.updated',
      data: {
        recordId: 'rec_xxx',
        // Missing 'fields'
      }
    };

    const res = await request(app)
      .post('/api/teable/webhooks/export')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});
```

Run tests:
```bash
bun test backend/tests/integration/teable-webhook-export.test.ts
```

Target: 6/6 passing
```

**Verification**: Integration tests passing

---

## 🚀 Task 4.8: End-to-End Testing (Manual)

### Prompt for Antigravity IDE

```
Manual E2E test without automation:

1. Start server:
   ```bash
   cd backend && bun run dev
   ```

2. Create test entry in Teable:
   - Form Fields:
     * Amount: 5000 (satang)
     * Category: Office Supplies
     * Status: draft
     * exportPath: (leave empty for now)

3. Test Manual Path:
   a) Set exportPath='manual' in Teable
   b) Set status='approved'
   c) Watch server logs for webhook
   d) Expected: "Teable webhook: Entry xxx queued (exportPath=manual)"
   e) Check MongoDB:
      ```javascript
      db.getCollection('exportqueues').findOne()
      // Should show: status='queued', exportPath='manual'
      ```
   f) Call API to download:
      ```bash
      curl http://localhost:4000/api/export/status/{queueId}
      ```

4. Test Immediate Path:
   a) Create new entry
   b) Set exportPath='immediate'
   c) Set status='approved'
   d) Watch server logs
   e) Expected: "processing..." then "completed" or "failed"
   f) Check Discord: Should see alert

5. Test Scheduled Path:
   a) Create new entry
   b) Set exportPath='scheduled'
   c) Set status='approved'
   d) Check queue status:
      ```bash
      curl http://localhost:4000/api/export/status/{queueId}
      ```
   e) Should show: status='queued', scheduledFor='18:00'

6. Test Error: Invalid Payload
   a) Send curl with invalid data:
      ```bash
      curl -X POST http://localhost:4000/api/teable/webhooks/export \
        -H "Content-Type: application/json" \
        -d '{"invalid": "data"}'
      ```
   b) Expected: 400 error

7. Check Logs:
   ```bash
   docker logs auto-acct-backend | grep "Teable webhook"
   ```

8. Check MongoDB Audit Trail:
   ```javascript
   db.getCollection('exportlogs').find({ action: 'queued' })
   // Should show all webhook events
   ```
```

**Verification**: All 7 test scenarios working

---

## ✅ Task 4.9: Documentation Update

### Prompt for Antigravity IDE

```
Create/Update docs/TEABLE_EXPORT_INTEGRATION.md

Include sections:

1. Overview
   - Teable form field (exportPath)
   - 3 export paths explained
   - Architecture diagram

2. Setup Instructions
   - Add exportPath field to Teable form
   - Set TEABLE_WEBHOOK_SECRET in .env
   - Register routes in express.ts
   - Restart server

3. Webhook Payload
   - Example JSON
   - Field explanations
   - Validation rules

4. API Endpoints Used
   - /api/teable/webhooks/export (receives)
   - /api/export/queue (calls internally)
   - /api/export/status (users check status)

5. Error Handling
   - What happens if validation fails
   - Retry logic
   - Discord alerts

6. Testing
   - cURL examples
   - Expected responses
   - Common issues

7. Troubleshooting
   - Webhook not firing
   - Validation errors
   - Discord alerts missing
   - Database issues
```

**Verification**: Documentation complete and accurate

---

## 🎯 Task 4.10: Final Testing + Commit

### Prompt for Antigravity IDE

```
Finalize Phase 4:

1. Run full test suite:
   ```bash
   bun test
   ```
   Should see: all previous tests + new webhook tests passing

2. Type check:
   ```bash
   bun tsc --noEmit
   ```
   Should have: zero errors

3. Lint:
   ```bash
   bun run lint
   ```
   Should have: zero warnings

4. Commit:
   ```bash
   git add .
   git commit -m "feat(teable): add webhook export integration with 3 paths"
   ```

5. Push:
   ```bash
   git push origin feature/phase3c-auto-export-to-express
   ```

6. Show:
   - ✅ All tests passing (unit + integration + e2e)
   - ✅ TypeScript strict mode passed
   - ✅ Git log showing commits
   - ✅ Coverage report (>80% target)
```

**Verification**: All checks passing

---

## 📊 Best Practices for Phase 4

### 1. Zod Validation (Security)

✅ **DO**:
```typescript
const payload = TeableWebhookSchema.parse(req.body); // Safe
```

❌ **DON'T**:
```typescript
const payload = req.body; // Unsafe - no validation
```

---

### 2. Fire-and-Forget Pattern (Performance)

✅ **DO**:
```typescript
if (exportPath === 'immediate') {
  // Don't await - fire and forget
  this.exportService.processImmediate(queue._id).catch(err => {
    sendCriticalAlert(`Failed: ${err.message}`);
  });
}
// Return immediately
return res.status(200).json({ success: true });
```

❌ **DON'T**:
```typescript
// This blocks the webhook response
await this.exportService.processImmediate(queue._id);
```

---

### 3. HTTP Status Codes

✅ **Correct**:
```
POST /webhook
- 200: Webhook received (regardless of if approved)
- 400: Validation failed (malformed JSON)
- 500: Server error
```

❌ **Wrong**:
```
POST /webhook
- 204: No content (webhook expects response body)
- 202: Accepted (confusing with queuing semantics)
```

---

### 4. Error Handling

✅ **DO**:
```typescript
try {
  const payload = TeableWebhookSchema.parse(req.body);
  // ... logic
} catch (error) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed' });
  }
  return res.status(500).json({ error: 'Server error' });
}
```

❌ **DON'T**:
```typescript
const payload = req.body; // Will crash if invalid
// ... logic (unreachable if bad data)
```

---

### 5. Discord Alerts

✅ **DO**:
```typescript
await sendInfoLog(`Webhook received: Entry ${entryId}`); // Info level
// ...
if (error) {
  await sendCriticalAlert(`Failed: ${error}`); // Critical level
}
```

❌ **DON'T**:
```typescript
// Every detail as critical
await sendCriticalAlert(`Webhook received`); // Alert fatigue
```

---

### 6. Dependency Injection

✅ **DO**:
```typescript
export class TeableWebhookController {
  constructor(private exportService: ExpressExportService) {}
}

// Easy to test (mock exportService)
```

❌ **DON'T**:
```typescript
export class TeableWebhookController {
  private exportService = new ExpressExportService();
  // Hard to test (can't mock)
}
```

---

### 7. Idempotency

✅ **DO**:
```typescript
// Check for duplicate before creating
const existing = await ExportQueue.findOne({ entryId });
if (existing) {
  return res.status(400).json({ error: 'Already queued' });
}
```

❌ **DON'T**:
```typescript
// Create every time (duplicates)
await ExportQueue.create({ entryId });
```

---

### 8. Logging

✅ **DO**:
```typescript
console.log(`[Teable] Webhook received: ${entryId}`);
console.error(`[Teable] Validation failed: ${error.message}`);
```

❌ **DON'T**:
```typescript
console.log(req.body); // Entire payload (too noisy)
console.log(error); // Stack trace (not helpful)
```

---

## 🚨 Common Pitfalls to Avoid

| Pitfall | Solution |
|:--------|:---------|
| **Webhook times out** | Use fire-and-forget for immediate exports |
| **Duplicate entries** | Check unique index before creating |
| **Invalid signature** | Use timing-safe comparison (crypto.timingSafeEqual) |
| **Discord alert spam** | Use appropriate alert levels (info, warn, critical) |
| **Database locking** | Use MongoDB transactions for atomic operations |
| **Memory leaks** | Properly cleanup event listeners in tests |
| **Type errors** | Use TypeScript strict mode everywhere |
| **Missing env vars** | Check TEABLE_WEBHOOK_SECRET in .env |

---

## 🎓 Key Takeaways

1. **Zod validates** everything from Teable before processing
2. **Fire-and-forget** keeps webhook response fast (<100ms)
3. **3 paths** (manual/immediate/scheduled) handled appropriately
4. **Discord alerts** inform ops team of issues
5. **Integration tests** verify all 3 paths work
6. **Signature verification** secures the webhook (optional but recommended)
7. **Idempotency** prevents duplicate queuing
8. **Error handling** is comprehensive with proper HTTP codes

---

## ✅ Phase 4 Checklist

Before merging PR:

- [ ] TeableWebhookController created
- [ ] Zod schema validates all payloads
- [ ] 3 export paths handled correctly
- [ ] Fire-and-forget pattern for immediate
- [ ] Discord alerts working
- [ ] Signature verification implemented
- [ ] Integration tests: 6/6 passing
- [ ] E2E manual tests: 7/7 scenarios working
- [ ] Documentation complete
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Commits clear and descriptive
- [ ] Ready for merge to main

---

## 📈 Success Metrics

| Metric | Target | How to Verify |
|:-------|:--------|:--------------|
| **Tests Passing** | 100% | `bun test` output |
| **Coverage** | >80% | `bun test --coverage` |
| **Type Safety** | 0 errors | `bun tsc --noEmit` |
| **Lint** | 0 warnings | `bun run lint` |
| **Webhook Latency** | <100ms | curl + time measurement |
| **Manual Tests** | 7/7 passing | Walk through all scenarios |
| **Discord Alerts** | Working | Check Discord channel |
| **Documentation** | Complete | Read all docs + verify |

---

## 🎉 After Phase 4 Complete

**Progress**: 55/100 (55%)

**Phases Remaining**:
- Phase 5: Daily Cron Job (18:00 batch) - 1.5h
- Phase 6: Documentation + E2E - 1.5h

**Total estimated**: 3 more hours until 100/100

---

**Ready to Start Phase 4?** 🚀

Copy the task prompts above and paste into Antigravity IDE!
