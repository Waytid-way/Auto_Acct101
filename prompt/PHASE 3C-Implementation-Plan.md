# 🚀 Phase 3C: Smart Auto-Export to Express
## Antigravity IDE Implementation Plan (Revised)

**Status**: Ready for Implementation  
**Based on**: Phase 3B Completion Report [file:16]  
**Created**: January 17, 2026  
**Estimated Time**: 8-10 hours (1 dev day)  
**Complexity**: Medium-High (Financial Integrity Critical)

---

## 📊 Foundation Status (Phase 3B ✅ COMPLETE)

From Phase 3B Report [file:16], the system now has:

| Component | Status | Details |
|:----------|:-------|:--------|
| **OCR System** | ✅ Complete | Hybrid PaddleOCR + Google Vision (88-94% Thai accuracy) |
| **Financial Validation** | ✅ Complete | All 4 Critical Modifications implemented (23 tests passing) |
| **MongoDB Models** | ✅ Complete | ReceiptModel + QuotaModel with indexes |
| **Groq AI Classification** | ✅ Complete | 97.7% avg confidence (Phase 3A) |
| **Teable Webhook** | ✅ Ready | Can trigger export queue on approval |
| **Docker Infrastructure** | ✅ Ready | Auto-restart, health checks, resource limits |
| **Discord Alerts** | ✅ Ready | 3-tier alerts (info, warn, critical) |

**What's Missing** → Phase 3C will add:
- ❌ ExportQueue + ExportLog MongoDB models
- ❌ ExpressExportService (3 paths logic)
- ❌ Export API endpoints (/api/export/*)
- ❌ Teable form field (exportPath selector)
- ❌ Daily cron job (18:00 batch export)
- ❌ Documentation

---

## 🎯 Architecture: 3 Export Paths

```
┌─────────────────────────────────────────────────────────┐
│  Approved Entry in Teable (OCR + Groq classified)      │
├─────────────────────────────────────────────────────────┤
│  NEW FIELD: "Export Path"                              │
│  ○ 🔒 Manual      (accountant exports manually)        │
│  ○ ⚡ Immediate   (auto-post to Express now)           │
│  ○ 📅 Scheduled   (queue for 18:00 daily batch)        │
└─────────────────────────────────────────────────────────┘
         ↓ User clicks "Approve"
    Teable Webhook Fires
         ↓
    Backend checks exportPath field
         ↓
    ┌─────────────────────────────────────────┐
    │ ExportQueue document created            │
    │ - entryId, exportPath, status='queued'  │
    │ - ExportLog entry created               │
    └─────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────┐
    │ Path 1: Manual                          │
    │ → No automatic action                   │
    │ → Accountant downloads CSV manually     │
    └─────────────────────────────────────────┘
    
    OR
    
    ┌─────────────────────────────────────────┐
    │ Path 2: Immediate                       │
    │ → Validate amount (integer, trial bal)  │
    │ → POST to Express API                   │
    │ → Mark status='completed'               │
    │ → Discord alert (success/failure)       │
    └─────────────────────────────────────────┘
    
    OR
    
    ┌─────────────────────────────────────────┐
    │ Path 3: Scheduled                       │
    │ → Stays in queue (status='queued')      │
    │ → At 18:00 daily (cron job)             │
    │ → Generate CSV of all queued            │
    │ → Save to Google Drive                  │
    │ → Discord alert: "Download CSV"         │
    │ → Accountant reviews & imports          │
    └─────────────────────────────────────────┘
```

---

## 🛠️ Implementation Phases (for Antigravity IDE)

### **Phase 0: Setup & Context** (30 min)

#### Task 0.1: Analyze Architecture
**Prompt for Antigravity**:
```
@ARCHITECTURE.md @API.md @PHASE_3B_REPORTcompleted.md

Analyze current Auto-Acct-001 post-Phase-3B state:

1. Map Teable webhook handler → where does it live?
2. Locate medici integration (double-entry logic)
3. Find existing Google Drive service code
4. Create Mermaid diagram: approval flow → need for export queue
5. Identify where to add ExportQueue + ExportLog models

DO NOT code. Create an Artifact with findings + diagram.

Then ask: "Ready to proceed to Phase 1?"
```

**Verification**: Review diagram accuracy before approval

---

#### Task 0.2: Create Feature Branch
```bash
git checkout main && git pull origin main
git checkout -b feature/phase3c-auto-export-to-express
git push -u origin feature/phase3c-auto-export-to-express
```

**Verification**: On correct branch

---

### **Phase 1: MongoDB Models** (2 hours)

#### Task 1.1: ExportQueue Model
**Prompt**:
```
@backend/src/models/

Create `ExportQueue.ts` with:

Schema:
- entryId: ObjectId (ref: JournalEntry), required, unique
- exportPath: enum [manual, immediate, scheduled], required
- status: enum [queued, processing, completed, failed], default: queued
- scheduledFor: Date, default to today 18:00 when exportPath=scheduled
- attempts: Number, default 0, max 3 retries
- lastError: String (optional)
- completedAt: Date (optional)
- createdBy: ObjectId (ref: User)
- metadata: Object (store Express response, CSV URL, etc)
- timestamps: createdAt, updatedAt

Indexes:
- status + scheduledFor (for daily cron)
- entryId (unique, prevent duplicates)
- createdAt desc (for dashboard)

Methods:
- markAsProcessing(): Promise<void>
- markAsCompleted(metadata: any): Promise<void>
- markAsFailed(error: string): Promise<void>
- canRetry(): boolean (attempts < 3)

Strict TypeScript, JSDoc comments, inherit from mongoose.Document.

Create Implementation Plan before coding.
```

**Expected**: Implementation Plan (TypeScript + Mongoose syntax)

---

#### Task 1.2: ExportLog Model
**Prompt**:
```
@backend/src/models/

Create `ExportLog.ts` audit trail with:

Schema:
- queueId: ObjectId (ref: ExportQueue), required
- action: enum [queued, export_started, csv_generated, sent_to_express, completed, failed, retry]
- message: String
- metadata: Object
- performedBy: ObjectId | 'system' (for cron)
- createdAt: Date (default: now)

Indexes:
- queueId + createdAt desc (query by queue)
- createdAt desc (cleanup queries)

Static method:
- log(queueId, action, message, metadata): Promise<void>

NO update() or delete() methods (immutable audit trail).

Create Implementation Plan.
```

**Expected**: Implementation Plan (immutable design)

---

#### Task 1.3: Implement Models + Tests
```
Execute Plans from 1.1 & 1.2.

Create unit tests:
- Schema validation
- Status transitions (queued → processing → completed)
- Retry logic (attempts < 3)
- Unique constraint on entryId
- ImmutabilityLog (no updates)

Run: bun test backend/tests/unit/models/
Commit: "feat: add ExportQueue and ExportLog models"
```

**Verification**: All tests pass, commit shown

---

### **Phase 2: Export Service** (2.5 hours)

#### Task 2.1: ExpressExportService
**Prompt**:
```
@backend/src/services/

Create `ExpressExportService.ts` with methods:

1. queueForExport(entryId, exportPath, userId)
   - Validate entry exists + is approved
   - Check if already queued (throw if duplicate)
   - Create ExportQueue doc
   - Log to ExportLog
   - Return queue doc

2. processImmediate(queueId)
   - Fetch entry from medici
   - Validate Trial Balance (Dr === Cr) ← GOLDEN RULE #2
   - Generate CSV line (reuse existing export logic)
   - POST to Express API
   - Wrap in MongoDB transaction
   - Mark as completed or failed
   - Discord alert on failure

3. generateDailyBatch(date)
   - Query queued entries with exportPath='scheduled'
   - Generate CSV with all entries
   - Save to Google Drive (use existing service)
   - Return Drive URL
   - Log batch generation

4. retryFailed()
   - Find failed entries with canRetry()=true
   - Re-attempt processImmediate
   - Discord alert on final failure

5. validateEntry(entryId)
   - Check amounts are integers ← GOLDEN RULE #1
   - Check Trial Balance ← GOLDEN RULE #2
   - Check status='approved'
   - Return { valid, errors[] }

Inject dependencies (ExportQueue, ExportLog, GoogleDriveService, DiscordService).
Repository Pattern.
Strict TypeScript.

Create detailed Implementation Plan with pseudo-code.
```

**Expected**: Implementation Plan with pseudo-code for each method

---

#### Task 2.2: Implement Service + Tests
```
Execute Plan from 2.1.

Create unit tests:
- Validation logic (amounts, trial balance)
- Queue creation
- Immediate export flow (mock Express API)
- Batch generation
- Retry logic
- Mock all external dependencies

Run: bun test backend/tests/unit/services/express-export.test.ts
Commit: "feat: add ExpressExportService with validation"
```

**Verification**: Coverage >80%, all edge cases tested

---

### **Phase 3: API Endpoints** (2 hours)

#### Task 3.1: ExportController
**Prompt**:
```
@backend/src/controllers/

Create `ExportController.ts` with endpoints:

1. POST /api/export/queue
   Body: { entryId, exportPath: manual|immediate|scheduled }
   - Validate with Zod
   - Call ExpressExportService.queueForExport()
   - If immediate, trigger async processImmediate()
   - Response: { queueId, status, scheduledFor }

2. GET /api/export/status/:queueId
   - Return queue status + logs
   - Response: { queue, logs[] }

3. POST /api/export/retry/:queueId (admin only)
   - Manual retry trigger
   - Response: { success, message }

4. GET /api/export/metrics
   - Statistics: queued/processing/completed/failed counts
   - Success rate, avg processing time
   - Response: { metrics }

Add express-rate-limit middleware (100 req/hour per user).
Validate inputs with Zod.
Proper HTTP status codes (200, 201, 400, 404, 500).

Create Implementation Plan.
```

**Expected**: Implementation Plan

---

#### Task 3.2: Implement Controller + Tests
```
Execute Plan from 3.1.

Register routes in backend/src/loaders/express.ts:
- app.use('/api/export', exportRouter)

Create integration tests:
- Test all 3 export paths
- Test rate limiting (101 requests → 429)
- Test Zod validation
- Test authentication/authorization

Run: bun test backend/tests/integration/export-api.test.ts
Manual test with curl examples
Commit: "feat: add export API endpoints with rate limiting"
```

**Verification**: All tests pass, rate limiting works

---

### **Phase 4: Teable Integration** (1.5 hours)

#### Task 4.1: Update Teable Webhook
**Prompt**:
```
@backend/src/controllers/TeableController.ts

Modify existing Teable webhook handler:

1. Add field to Teable form schema: exportPath
   Type: Single Select
   Options: [Manual, Immediate, Scheduled]
   Default: Scheduled
   Description: "How to export to Express?"

2. Update webhook logic:
   When record.status → 'approved':
   - Extract exportPath from webhook payload
   - Call ExpressExportService.queueForExport(entryId, exportPath, userId)
   - If immediate, trigger async export
   - Discord log: "Entry {id} approved - {exportPath} export queued"

3. Validation:
   - Ensure exportPath ∈ [manual, immediate, scheduled]
   - Default to manual if invalid
   - Log warnings

Create Implementation Plan with before/after code.
```

**Expected**: Implementation Plan with diff-style changes

---

#### Task 4.2: Implement + Test
```
Execute Plan from 4.1.

Create integration tests:
- Mock Teable webhook with exportPath=immediate
- Verify ExportQueue created + export triggered
- Mock with exportPath=scheduled
- Verify queued for 18:00

Run: bun test backend/tests/integration/teable-webhook-export.test.ts
Commit: "feat: integrate export path selection in Teable webhook"
```

**Verification**: Tests pass, no breaking changes

---

### **Phase 5: Daily Cron Job** (1.5 hours)

#### Task 5.1: DailyExportJob
**Prompt**:
```
@backend/src/jobs/

Create `DailyExportJob.ts` cron job:

Requirements:
- Use node-cron (bun add node-cron @types/node-cron)
- Schedule: Daily 18:00 Bangkok time (UTC+7)
- Logic:
  1. Query ExportQueue: status=queued AND exportPath=scheduled AND scheduledFor <= now
  2. Call ExpressExportService.generateDailyBatch(today)
  3. Get CSV URL from Google Drive
  4. Discord alert: "Daily batch ready: {count} entries. Download: {url}"
  5. Mark all as completed
  6. Log to ExportLog

- Error handling:
  * Wrap in try-catch
  * Discord alert on failure
  * Retry after 1 hour if failed

- Timezone:
  * Use dayjs with timezone plugin
  * Bangkok time: UTC+7

Create Implementation Plan with cron syntax.
```

**Expected**: Implementation Plan with cron schedule

---

#### Task 5.2: Implement + Test
```
Execute Plan from 5.1.

Register job in backend/src/loaders/jobs.ts (create if needed):
- Start cron on server startup
- Log: "Daily export job scheduled for 18:00 Bangkok time"

Create tests:
- Mock time to 18:00
- Create 3 queued entries
- Trigger job manually
- Verify CSV generated
- Verify Discord alert
- Verify entries marked completed

Run: bun test backend/tests/unit/jobs/daily-export.test.ts
Manual test: Temporarily set cron to "* * * * *" (every minute)
Restart server, wait 1 min, verify Discord alert
Revert cron to 18:00
Commit: "feat: add daily export cron job at 18:00"
```

**Verification**: Cron triggers, batch generated

---

### **Phase 6: Documentation & Testing** (1.5 hours)

#### Task 6.1: Documentation
```
Create docs/EXPORT_TO_EXPRESS.md with sections:

1. Overview
   - 3 export paths
   - Architecture diagram (Mermaid)
   - Data flow

2. API Reference
   - All endpoints + examples
   - curl commands

3. Configuration
   - Environment variables
   - Teable form setup
   - Cron schedule

4. User Guide
   - How to choose export path
   - How to download batch CSV
   - How to manually export

5. Monitoring
   - Discord alerts
   - Metrics endpoint
   - Troubleshooting

6. Golden Rule Compliance
   - How each rule is enforced
   - Validation checks

7. Rollback Plan
   - Emergency steps if export fails

Also update docs/API.md with new endpoints.

Create documentation.
```

**Verification**: Accurate and complete

---

#### Task 6.2: E2E Testing
```
Create backend/tests/e2e/export-workflow.test.ts:

Test scenarios:
1. Path 1 (Manual):
   - Create + approve with exportPath=manual
   - Verify NO automatic export
   - Manual CSV export
   - Verify CSV downloaded

2. Path 2 (Immediate):
   - Create + approve with exportPath=immediate
   - Wait 5 seconds
   - Verify status='posted'
   - Verify Discord alert
   - Verify ExportQueue status='completed'

3. Path 3 (Scheduled):
   - Create 3 entries, exportPath=scheduled
   - Approve all
   - Mock time to 18:00
   - Trigger cron manually
   - Verify CSV in Google Drive
   - Verify Discord alert
   - Verify all completed

4. Edge cases:
   - Duplicate entry (fail)
   - Invalid amount (fail validation)
   - Trial balance mismatch (fail)
   - Network error (retry)

Run: bun test backend/tests/e2e/
```

**Verification**: All tests pass, coverage >85%

---

#### Task 6.3: Final PR
```
Finalize feature:

1. bun test (full suite)
2. bun run lint
3. Fix issues
4. bun test --coverage
5. git add . && git commit -m "docs: add export to Express documentation"
6. git push origin feature/phase3c-auto-export-to-express
7. Create Pull Request:
   - Title: "[Phase 3C] Smart Auto-Export to Express"
   - Description: Summary + changes + testing + screenshots
   - Add reviewers

Show PR URL and summary.
```

**Verification**: PR link valid, CI passing

---

## ✅ Golden Rule Compliance

| Rule | Constraint | How Phase 3C Complies |
|:-----|:-----------|:----------------------|
| **#1: Integers Only** | No floats for money | `validateEntry()` rejects float amounts before export |
| **#2: Double-Entry** | Dr === Cr always | Trial balance check before marking as 'posted' |
| **#3: Human Approval** | Explicit consent | User selects export path in Teable (not automatic) |
| **#4: Immutability** | Never DELETE posted | Once status='posted', cannot revert (void/reversal only) |
| **#5: ACID** | All writes in transactions | MongoDB sessions wrap all ledger changes |

---

## 🔐 Key Differences from Phase 3B

| Aspect | Phase 3B (OCR) | Phase 3C (Export) |
|:-------|:---------------|:-----------------|
| **Input** | Receipt images | Approved ledger entries |
| **Processing** | Text extraction | Financial validation + Express API |
| **Golden Rules** | Input validation | Output immutability |
| **Models** | ReceiptModel | ExportQueue + ExportLog |
| **Cron** | None (on-demand) | Daily 18:00 batch export |
| **Human Role** | Review OCR accuracy | Choose export path + review batch |

---

## 🚨 Rollback Plan

### If Export Fails:
1. Comment out cron job registration
2. Set all `exportPath` to 'manual' in Teable
3. Accountants export CSV manually
4. Review logs: `docker logs auto-acct-backend`
5. Fix and redeploy

### If Critical Bug:
1. Revert: `git revert <commit-hash>`
2. Remove export endpoints
3. Deploy hotfix
4. Investigate in dev

---

## 📊 Antigravity IDE Best Practices [file:3]

1. **Use Planning Mode** for this feature (multi-file changes)
2. **Review Implementation Plans** before executing
3. **Commit every 5-10 minutes** to prevent data loss
4. **Use @filename mentions** when referencing code
5. **Ask questions** if requirements unclear
6. **Test as you go** - don't wait until end
7. **Use Bun-first** commands (never npm/node)

---

## 📚 References

- **Phase 3B Report**: [file:16] - OCR integration complete
- **Phase 3A Report**: [file:2] - Groq AI classification (97.7% accuracy)
- **Best Practices for Antigravity**: [file:3] - 50 prompts + strategies
- **Architecture**: [file:9] - System overview
- **Financial Rules**: [file:8] - Golden rules enforcement

---

## 🎯 Success Criteria

Before shipping Phase 3C:

- [ ] All 3 export paths implemented and tested
- [ ] ExportQueue + ExportLog models in place
- [ ] API endpoints with rate limiting
- [ ] Teable form field (exportPath selector)
- [ ] Daily cron job at 18:00
- [ ] Unit tests >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Documentation complete
- [ ] No breaking changes
- [ ] TypeScript strict mode (no 'any')
- [ ] Bun commands used throughout
- [ ] Golden Rules compliance verified

---

**Ready to Start?** 🚀

Copy Task 0.1 prompt into Antigravity IDE and begin!

*Questions or need adjustments?* Let me know! 💪

---

**Document**: Phase 3C Implementation Plan  
**Version**: 1.0 (Revised for Phase 3B Completion)  
**Last Updated**: January 17, 2026  
**Status**: Ready for Implementation