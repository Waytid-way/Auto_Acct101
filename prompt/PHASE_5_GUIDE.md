# Phase 5 Implementation Plan: Daily Cron Job (18:00 Batch Export)
## Complete Implementation Guide for Antigravity IDE

**Status**: Ready for Implementation  
**Based on**: Phase 4 Complete (55/100)  
**Duration**: 2-2.5 hours  
**Complexity**: Medium (cron scheduling + batch processing)  
**Target Score**: 70/100 after Phase 5

---

## 🎯 Phase 5 Overview

### What Gets Built

```
┌─────────────────────────────────────────────────┐
│  18:00 Bangkok Time (UTC+7) Daily              │
│  ├─ Cron job triggers                          │
│  ├─ Query ExportQueue: exportPath='scheduled'  │
│  ├─ Fetch all queued entries from medici       │
│  ├─ Generate CSV with all entries              │
│  ├─ Upload to Google Drive                     │
│  ├─ Discord alert: "Batch ready: N entries"    │
│  └─ Mark all as completed                      │
└─────────────────────────────────────────────────┘
```

### Key Deliverables

- [x] DailyExportJob cron task created
- [x] Batch processing logic implemented
- [x] Google Drive upload integration
- [x] Discord notifications for batch
- [x] Error handling + retry logic
- [x] Performance monitoring (metrics)
- [x] Unit + integration tests
- [x] Documentation

---

## 📚 Lessons Learned from Phase 4

### 1. ✅ Idempotency is Critical

**Phase 4 Learning**: Webhooks can fire multiple times → need duplicate checks

**Phase 5 Application**:
```typescript
// ✅ DO: Check if already processed
const processed = await ExportLog.findOne({
  action: 'csv_generated',
  createdAt: { $gte: today }
});

if (processed) {
  console.log('Batch already generated today');
  return; // Don't run again
}
```

**Why**: Prevent generating same CSV twice if cron triggers twice

---

### 2. ✅ Timeout Handling Prevents Cascading Failures

**Phase 4 Learning**: Long operations → webhook timeout → Teable retry

**Phase 5 Application**:
```typescript
// ✅ DO: Hard timeout for batch processing
const batchExport = await Promise.race([
  generateBatchCSV(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Batch timeout')), 30000) // 30s max
  ),
]);
```

**Why**: Prevent cron job from hanging and blocking other jobs

---

### 3. ✅ Comprehensive Logging Enables Debugging

**Phase 4 Learning**: Audit logs + timing metrics are essential

**Phase 5 Application**:
```typescript
// ✅ DO: Log every step with metrics
const startTime = Date.now();
console.log('[Cron] Daily export job started');

// ... processing ...

const duration = Date.now() - startTime;
console.log('[Cron] Daily export completed', {
  entriesCount: 42,
  csvSize: '2.5 MB',
  uploadDuration: 1500, // ms
  totalDuration: duration
});
```

**Why**: Monitor performance, detect slowdowns, debug issues

---

### 4. ✅ Error Handling Must Be Comprehensive

**Phase 4 Learning**: Try-catch alone isn't enough → need different strategies

**Phase 5 Application**:
```typescript
try {
  // Main logic
} catch (error) {
  // Specific error handling
  if (error instanceof TimeoutError) {
    // Retry after 1 hour
    scheduleRetry();
    sendCriticalAlert('Batch timeout - retrying at {time}');
  } else if (error instanceof GoogleDriveError) {
    // Different handling
    sendCriticalAlert('Google Drive unavailable');
  } else {
    // Generic error
    sendCriticalAlert(`Unknown error: ${error.message}`);
  }
}
```

**Why**: Different errors need different recovery strategies

---

### 5. ✅ Type Safety Prevents Runtime Errors

**Phase 4 Learning**: Zod validation catches bad data early

**Phase 5 Application**:
```typescript
// ✅ DO: Validate batch configuration
const batchConfigSchema = z.object({
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/), // "18:00"
  timezone: z.enum(['Asia/Bangkok', 'UTC']),
  maxEntries: z.number().min(1).max(10000),
  retryCount: z.number().min(0).max(3),
});

const config = batchConfigSchema.parse(envVars);
```

**Why**: Catch configuration errors at startup, not runtime

---

### 6. ✅ Dependency Injection Makes Testing Easy

**Phase 4 Learning**: Constructor injection enables mocking

**Phase 5 Application**:
```typescript
// ✅ DO: Inject dependencies
export class DailyExportJob {
  constructor(
    private exportService: ExpressExportService,
    private googleDrive: GoogleDriveService,
    private discord: DiscordService,
    private logger: Logger
  ) {}
}

// Easy to mock in tests
const mockGoogleDrive = {
  uploadFile: jest.fn().mockResolvedValue({ fileId: 'test' })
};
const job = new DailyExportJob(
  exportService,
  mockGoogleDrive,
  discord,
  logger
);
```

**Why**: Test without external dependencies

---

### 7. ✅ Fire-and-Forget for Async Operations

**Phase 4 Learning**: Don't await async operations that might timeout

**Phase 5 Application**:
```typescript
// ✅ DO: Fire-and-forget for async cleanup
// Don't make cron job wait for cleanup
ExportLog.deleteMany({ createdAt: { $lt: thirtyDaysAgo } })
  .catch(err => {
    sendCriticalAlert(`Cleanup failed: ${err.message}`);
  });

// Return immediately
return { success: true, count: 42, url };
```

**Why**: Cron job completes faster, cleanup happens in background

---

### 8. ✅ Discord Alerts Should Be Actionable

**Phase 4 Learning**: Alert users about specific issues they can act on

**Phase 5 Application**:
```typescript
// ✅ DO: Provide actionable information
await sendInfoLog({
  title: 'Daily Batch Export Ready',
  description: `42 entries exported to Express`,
  fields: [
    { name: 'File URL', value: 'https://drive.google.com/...' },
    { name: 'Entries Count', value: '42' },
    { name: 'CSV Size', value: '2.5 MB' },
    { name: 'Action', value: 'Download and review in Express' },
  ],
});

// ❌ DON'T: Generic messages
// await sendInfoLog('Batch export done');
```

**Why**: Users know exactly what to do next

---

## 🎯 Phase 5 Architecture

### Data Flow

```
┌──────────────────────────────────────────┐
│  18:00 Bangkok Time (UTC+7)              │
│  node-cron triggers DailyExportJob       │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  Step 1: Fetch Queued Entries            │
│  ExportQueue.find({                      │
│    exportPath: 'scheduled',              │
│    status: 'queued',                     │
│    scheduledFor: { $lte: now }           │
│  })                                      │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  Step 2: Generate CSV from medici        │
│  Loop through entries, get journal data  │
│  Format as CSV with proper spacing       │
│  Include headers + totals                │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  Step 3: Upload to Google Drive          │
│  Filename: batch_{YYYY-MM-DD}.csv        │
│  Return shareable URL                    │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  Step 4: Notifications                   │
│  Discord: "Batch ready: N entries"       │
│  Alert with download link                │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  Step 5: Mark as Completed               │
│  Update all queued entries: status='done'│
│  Log to ExportLog: 'csv_generated'       │
│  Log to ExportLog: 'completed'           │
└──────────────────────────────────────────┘
```

---

## 📋 Task 5.1: Create Cron Job Class

### Prompt for Antigravity IDE

```
@backend/src/jobs/

Create DailyExportJob.ts

Requirements:

```typescript
import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ExpressExportService } from '../modules/export/ExpressExportService';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { ExportQueue, ExportLog } from '../models';
import { sendInfoLog, sendCriticalAlert } from '../loaders/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

export class DailyExportJob {
  private job: cron.ScheduledTask | null = null;

  constructor(
    private exportService: ExpressExportService,
    private googleDrive: GoogleDriveService
  ) {}

  /**
   * Start the daily export job
   * Schedule: 18:00 Bangkok time (UTC+7) daily
   */
  start(): void {
    // ✅ Cron expression: "0 18 * * *" means 18:00 every day
    // ✅ Use timezone-aware scheduling
    this.job = cron.schedule('0 18 * * *', () => {
      this.executeDaily().catch(err => {
        console.error('[Cron] Daily export failed:', err);
        sendCriticalAlert(\`Daily batch failed: \${err.message}\`);
      });
    }, {
      timezone: 'Asia/Bangkok'
    });

    console.log('[Cron] Daily export job scheduled for 18:00 Bangkok time');
  }

  /**
   * Stop the cron job (for graceful shutdown)
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('[Cron] Daily export job stopped');
    }
  }

  /**
   * Main execution logic
   */
  private async executeDaily(): Promise<void> {
    const startTime = Date.now();
    const today = dayjs().tz('Asia/Bangkok').format('YYYY-MM-DD');

    try {
      console.log(\`[Cron] Daily export started at \${new Date().toISOString()}\`);

      // ✅ Step 1: Check idempotency (prevent duplicate runs)
      const alreadyRun = await ExportLog.findOne({
        action: 'csv_generated',
        createdAt: {
          \$gte: dayjs().tz('Asia/Bangkok').startOf('day').toDate(),
          \$lte: dayjs().tz('Asia/Bangkok').endOf('day').toDate(),
        },
      });

      if (alreadyRun) {
        console.log('[Cron] Batch already generated today, skipping');
        return; // ✅ Idempotent: don't run twice
      }

      // ✅ Step 2: Fetch queued entries
      const queuedEntries = await ExportQueue.find({
        exportPath: 'scheduled',
        status: 'queued',
        scheduledFor: { \$lte: new Date() },
      }).populate('entryId');

      if (queuedEntries.length === 0) {
        console.log('[Cron] No scheduled entries to export');
        return;
      }

      console.log(\`[Cron] Found \${queuedEntries.length} entries to batch\`);

      // ✅ Step 3: Generate CSV with timeout
      const csvBuffer = await Promise.race([
        this.generateBatchCSV(queuedEntries),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('CSV generation timeout')), 30000)
        ),
      ]);

      // ✅ Step 4: Upload to Google Drive
      const uploadStartTime = Date.now();
      const filename = \`batch_\${today}.csv\`;
      const { fileId, webViewLink } = await this.googleDrive.uploadFile(
        filename,
        csvBuffer
      );
      const uploadDuration = Date.now() - uploadStartTime;

      console.log('[Cron] CSV uploaded to Google Drive', {
        filename,
        fileId,
        uploadDuration,
      });

      // ✅ Step 5: Log to ExportLog
      await ExportLog.create({
        queueId: null,
        action: 'csv_generated',
        message: \`Daily batch CSV generated: \${queuedEntries.length} entries\`,
        metadata: {
          filename,
          fileId,
          webViewLink,
          entryCount: queuedEntries.length,
        },
        performedBy: 'system',
      });

      // ✅ Step 6: Mark queue entries as completed
      await ExportQueue.updateMany(
        {
          _id: { \$in: queuedEntries.map(e => e._id) },
        },
        {
          status: 'completed',
          completedAt: new Date(),
          metadata: { googleDriveFileId: fileId, googleDriveUrl: webViewLink },
        }
      );

      // ✅ Step 7: Discord notification
      await sendInfoLog({
        title: '✅ Daily Batch Export Ready',
        description: \`\${queuedEntries.length} entries exported to CSV\`,
        fields: [
          { name: 'Date', value: today },
          { name: 'Entries', value: \`\${queuedEntries.length}\` },
          { name: 'File Size', value: \`\${(csvBuffer.length / 1024).toFixed(2)} KB\` },
          {
            name: 'Download Link',
            value: webViewLink,
          },
        ],
      });

      // ✅ Step 8: Metrics
      const totalDuration = Date.now() - startTime;
      console.log('[Cron] Daily export completed', {
        entriesCount: queuedEntries.length,
        csvSize: \`\${(csvBuffer.length / 1024).toFixed(2)} KB\`,
        uploadDuration,
        totalDuration,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[Cron] Daily export failed', {
        error: error.message,
        duration,
      });

      // Different error handling strategies
      if (error.message === 'CSV generation timeout') {
        await sendCriticalAlert(
          \`⏱️ Batch CSV generation timeout (>30s)\nRetrying in 1 hour\`
        );
        // Schedule retry
        setTimeout(() => this.executeDaily(), 60 * 60 * 1000);
      } else if (error.message.includes('Google Drive')) {
        await sendCriticalAlert(
          \`📁 Google Drive error: \${error.message}\nPlease check credentials\`
        );
      } else {
        await sendCriticalAlert(
          \`❌ Daily batch export failed: \${error.message}\`
        );
      }

      throw error;
    }
  }

  /**
   * Generate CSV from queued entries
   */
  private async generateBatchCSV(
    queuedEntries: Array<{ entryId: any }>
  ): Promise<Buffer> {
    // ✅ CSV Header
    let csv = 'Entry ID,Date,Account,Debit,Credit,Description\n';

    let totalDebit = 0;
    let totalCredit = 0;

    // ✅ CSV Rows
    for (const queue of queuedEntries) {
      const entry = queue.entryId;
      if (!entry) continue;

      const debit = entry.amounts?.debit || 0;
      const credit = entry.amounts?.credit || 0;

      totalDebit += debit;
      totalCredit += credit;

      csv += \`\${entry._id},\${entry.date},\${entry.account},\${debit},\${credit},\${entry.description}\n\`;
    }

    // ✅ CSV Footer (totals)
    csv += \`\\nTOTALS,,,\${totalDebit},\${totalCredit}\n\`;

    // ✅ Return as Buffer
    return Buffer.from(csv, 'utf-8');
  }
}
```

Add:
- ✅ JSDoc comments for all methods
- ✅ Timezone-aware scheduling (Bangkok time)
- ✅ Idempotency check (prevent duplicate runs)
- ✅ Timeout handling (30s max)
- ✅ Comprehensive error handling
- ✅ Audit logging with metrics
- ✅ Fire-and-forget for cleanup

TypeScript strict mode (no 'any').
```

**Verification**: Cron job class created with all methods

---

## 🔧 Task 5.2: Register Cron Job in Loader

### Prompt for Antigravity IDE

```
@backend/src/loaders/

Create or update jobs.ts

File: jobs.ts

Requirements:

```typescript
import { DailyExportJob } from '../jobs/DailyExportJob';
import { ExpressExportService } from '../modules/export/ExpressExportService';
import { GoogleDriveService } from '../services/GoogleDriveService';

let dailyExportJob: DailyExportJob | null = null;

/**
 * Initialize all scheduled jobs
 */
export function initializeJobs(): void {
  const exportService = new ExpressExportService();
  const googleDrive = new GoogleDriveService();

  dailyExportJob = new DailyExportJob(exportService, googleDrive);
  dailyExportJob.start();

  console.log('[Loader] All scheduled jobs initialized');
}

/**
 * Gracefully shutdown jobs
 */
export function shutdownJobs(): void {
  if (dailyExportJob) {
    dailyExportJob.stop();
  }

  console.log('[Loader] All scheduled jobs stopped');
}
```

Then register in @backend/src/index.ts or main server file:

```typescript
import { initializeJobs, shutdownJobs } from './loaders/jobs';

// Start server
const app = express();
// ... setup ...

const server = app.listen(4000, () => {
  console.log('Server started on port 4000');
  
  // ✅ Initialize cron jobs
  initializeJobs();
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  shutdownJobs();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

Verify:
- Jobs loader created
- Registered in main server
- Graceful shutdown implemented
- Logs show job scheduled
```

**Verification**: Cron job registered and starts on server startup

---

## 🧪 Task 5.3: Create Unit Tests for DailyExportJob

### Prompt for Antigravity IDE

```
@backend/tests/unit/jobs/

Create daily-export-job.test.ts

Requirements:

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { DailyExportJob } from '../../../src/jobs/DailyExportJob';
import { ExportQueue, ExportLog } from '../../../src/models';

describe('DailyExportJob', () => {
  let job: DailyExportJob;
  let mockExportService: any;
  let mockGoogleDrive: any;

  beforeEach(() => {
    // Mock dependencies
    mockExportService = {
      processImmediate: mock(() => Promise.resolve()),
    };

    mockGoogleDrive = {
      uploadFile: mock((filename: string, buffer: Buffer) =>
        Promise.resolve({
          fileId: 'file_12345',
          webViewLink: 'https://drive.google.com/file/d/file_12345/view',
        })
      ),
    };

    job = new DailyExportJob(mockExportService, mockGoogleDrive);
  });

  afterEach(async () => {
    job.stop();
    await ExportQueue.deleteMany({});
    await ExportLog.deleteMany({});
  });

  it('should generate CSV from queued entries', async () => {
    // Create test entries
    const entries = await ExportQueue.insertMany([
      {
        entryId: 'entry1',
        exportPath: 'scheduled',
        status: 'queued',
        scheduledFor: new Date(),
      },
      {
        entryId: 'entry2',
        exportPath: 'scheduled',
        status: 'queued',
        scheduledFor: new Date(),
      },
    ]);

    // Execute job
    // Note: This is a private method, so you may need to test via public interface
    // or use reflection in TypeScript tests

    // Verify CSV generated (check mockGoogleDrive.uploadFile called)
    expect(mockGoogleDrive.uploadFile).toHaveBeenCalledWith(
      expect.stringContaining('batch_'),
      expect.any(Buffer)
    );
  });

  it('should prevent duplicate runs (idempotency)', async () => {
    // Create ExportLog entry for today
    await ExportLog.create({
      queueId: null,
      action: 'csv_generated',
      message: 'Already ran today',
      performedBy: 'system',
    });

    // Execute job
    // Should return early without processing

    // Verify no Google Drive upload
    expect(mockGoogleDrive.uploadFile).not.toHaveBeenCalled();
  });

  it('should handle CSV generation timeout', async () => {
    // This test would need to mock Promise.race behavior
    // to simulate timeout
    // Verify error handling strategy
  });

  it('should mark entries as completed after upload', async () => {
    const entries = await ExportQueue.insertMany([
      {
        entryId: 'entry1',
        exportPath: 'scheduled',
        status: 'queued',
      },
    ]);

    // Execute job and wait for completion
    // Verify status changed to 'completed'
    const updated = await ExportQueue.findById(entries[0]._id);
    expect(updated.status).toBe('completed');
  });

  it('should log to ExportLog with metadata', async () => {
    // Execute job
    // Verify ExportLog has entry with:
    // - action: 'csv_generated'
    // - metadata.fileId
    // - metadata.webViewLink
    // - metadata.entryCount
  });
});
```

Run tests:
```bash
bun test backend/tests/unit/jobs/daily-export-job.test.ts
```

Target: 5/5 tests passing
```

**Verification**: Unit tests created and passing

---

## 🔗 Task 5.4: Create Integration Tests

### Prompt for Antigravity IDE

```
@backend/tests/integration/

Create daily-export-integration.test.ts

Test scenarios:

```typescript
describe('Daily Export Integration', () => {
  
  it('should process scheduled entries at 18:00', async () => {
    // Create 5 scheduled queue entries
    // Mock current time to 17:59
    // Wait 61 seconds
    // Verify cron job executed
    // Verify entries marked completed
    // Verify Google Drive upload called
  });

  it('should generate valid CSV format', async () => {
    // Queue entries with various data
    // Execute daily export
    // Verify CSV has:
    // - Headers: Entry ID, Date, Account, Debit, Credit
    // - Data rows
    // - Footer with TOTALS
    // - Correct number formatting
  });

  it('should handle empty queue gracefully', async () => {
    // No queued entries
    // Execute daily export
    // Should return early
    // Should NOT upload to Google Drive
    // Should log "No scheduled entries"
  });

  it('should retry on timeout', async () => {
    // Simulate slow CSV generation
    // Timeout after 30s
    // Verify Discord critical alert sent
    // Verify retry scheduled for 1 hour later
  });

  it('should be idempotent (no duplicates)', async () => {
    // Create ExportLog for today
    // Trigger job twice
    // Verify Google Drive upload called only once
    // Verify entries marked completed only once
  });

  it('should handle Google Drive errors gracefully', async () => {
    // Mock Google Drive upload failure
    // Execute daily export
    // Verify Discord critical alert: "Google Drive error"
    // Verify entries still in 'queued' state (not completed)
  });
});
```

Run tests:
```bash
bun test backend/tests/integration/daily-export-integration.test.ts
```

Target: 6/6 tests passing
```

**Verification**: Integration tests created and passing

---

## 📅 Task 5.5: Manual E2E Testing

### Prompt for Antigravity IDE

```
Manual E2E test procedures:

1. Setup
   - Start server: bun run dev
   - Create 5 test entries in Teable
   - Set all to exportPath='scheduled', status='approved'
   - Verify ExportQueue has 5 entries with status='queued'

2. Simulate 18:00 Time
   - Option A: Temporarily change cron to "*/1 * * * *" (every minute)
   - Add log line: "Cron triggered at {current time}"
   - Wait 61 seconds

3. Verify Execution
   - Check server logs: "[Cron] Daily export started"
   - Check logs: "[Cron] Found 5 entries to batch"
   - Check logs: "CSV uploaded to Google Drive"
   - Verify duration < 30 seconds

4. Verify Database State
   ```javascript
   // MongoDB
   db.exportqueues.find({ exportPath: 'scheduled' })
   // All should have status='completed'
   
   db.exportlogs.find({ action: 'csv_generated' })
   // Should have 1 entry for today
   ```

5. Verify Discord Alert
   - Check Discord channel
   - Should see: "✅ Daily Batch Export Ready"
   - Should show: "5 entries exported to CSV"
   - Should have: Download link to Google Drive

6. Verify Google Drive
   - Open Google Drive
   - Find file: batch_{YYYY-MM-DD}.csv
   - Download and verify CSV format
   - Check: Headers, data rows, footer with TOTALS

7. Idempotency Test
   - Trigger cron job again (same day)
   - Verify: "[Cron] Batch already generated today, skipping"
   - Verify: Google Drive upload NOT called
   - Verify: ExportQueue entries still marked completed

8. Revert Changes
   - Change cron back to "0 18 * * *" (18:00 daily)
   - Restart server
   - Verify: "[Cron] Daily export job scheduled for 18:00 Bangkok time"
```

**Verification**: All 8 E2E scenarios passing

---

## 📝 Task 5.6: Create Documentation

### Prompt for Antigravity IDE

```
Create docs/DAILY_CRON_JOB.md

Sections:

1. Overview
   - What: Automated daily batch export at 18:00
   - Why: Consolidate scheduled entries into single CSV
   - Where: Google Drive (shareable link)
   - When: 18:00 Bangkok time (UTC+7) daily

2. Architecture
   - Include Mermaid diagram showing flow
   - List all components involved
   - Show timezone handling

3. Setup Instructions
   - Install node-cron: bun add node-cron
   - Add Google Drive service (from Phase 3B)
   - Register in jobs loader
   - Set TZ environment variable to Asia/Bangkok

4. Configuration
   - Cron schedule explanation
   - Timezone settings
   - Timeout values
   - Retry logic

5. Monitoring
   - Where to find logs: docker logs auto-acct-backend
   - Discord alerts (success/failure)
   - Key metrics to monitor
     * Processing duration
     * CSV size
     * Entries count

6. Troubleshooting
   - Job not running at 18:00
   - Google Drive upload fails
   - CSV generation timeout
   - Batch already generated error (idempotency)
   - Entries not marked completed

7. Performance Metrics
   - Expected duration: 2-5 seconds
   - CSV size per entry: ~150 bytes
   - Google Drive upload: 500ms-2s

8. Security
   - TEABLE_WEBHOOK_SECRET not needed for cron
   - Google Drive credentials are read from env
   - Entries are queued (user approved them)
```

**Verification**: Documentation complete and accurate

---

## 🧪 Task 5.7: Performance & Load Testing

### Prompt for Antigravity IDE

```
Load test the daily export with large datasets:

Test 1: Small Batch (5 entries)
- Duration target: < 2 seconds
- CSV size: ~750 bytes
- Verify success

Test 2: Medium Batch (50 entries)
- Duration target: < 5 seconds
- CSV size: ~7.5 KB
- Verify success

Test 3: Large Batch (500 entries)
- Duration target: < 15 seconds
- CSV size: ~75 KB
- Verify success

Test 4: Heavy Batch (5000 entries)
- Duration target: < 30 seconds (before timeout)
- CSV size: ~750 KB
- Monitor memory usage
- Verify success

Test 5: Max Load (10000 entries)
- Duration target: Should timeout at 30s
- Verify: Critical alert sent
- Verify: Retry scheduled for 1 hour
- Document findings

Run tests and show performance metrics:
- CSV generation time
- Google Drive upload time
- Total processing time
- Memory usage
- Error rate
```

**Verification**: Load tests completed with metrics documented

---

## 🔍 Task 5.8: Final Verification & Commit

### Prompt for Antigravity IDE

```
Final Phase 5 verification:

1. Run all tests:
   bun test backend/tests/unit/jobs/
   bun test backend/tests/integration/daily-export*
   
   Expected: 11+ tests passing (5 unit + 6 integration)

2. Type check:
   bun tsc --noEmit
   
   Expected: 0 errors

3. Lint:
   bun run lint
   
   Expected: 0 warnings

4. Manual E2E:
   - Follow 8 E2E scenarios
   - Document results

5. Performance baseline:
   - Test with 50, 500, 5000 entries
   - Document timings
   - Verify < 30s timeout

6. Commit:
   git add .
   git commit -m "feat(cron): add daily batch export at 18:00 Bangkok time"

7. Push:
   git push origin feature/phase3c-auto-export-to-express

8. Show:
   - ✅ All tests passing
   - ✅ TypeScript clean
   - ✅ Lint clean
   - ✅ E2E scenarios verified
   - ✅ Performance metrics documented
   - ✅ Ready for merge
```

**Verification**: All checks passing, ready for merge

---

## 🎓 Best Practices for Phase 5

### 1. Timezone Handling

✅ **DO**:
```typescript
dayjs.extend(timezone);
// Schedule in Bangkok timezone
cron.schedule('0 18 * * *', ..., { timezone: 'Asia/Bangkok' });

// Log with timezone
const bangkok = dayjs().tz('Asia/Bangkok');
console.log(`Current time: ${bangkok.format('HH:mm:ss')}`);
```

❌ **DON'T**:
```typescript
// UTC times (confusion!)
cron.schedule('0 11 * * *', ...); // 11:00 UTC = 18:00 Bangkok
```

---

### 2. Idempotency Check

✅ **DO**:
```typescript
const alreadyRun = await ExportLog.findOne({
  action: 'csv_generated',
  createdAt: {
    $gte: dayjs().tz('Asia/Bangkok').startOf('day'),
    $lte: dayjs().tz('Asia/Bangkok').endOf('day'),
  }
});

if (alreadyRun) {
  console.log('Already generated today');
  return;
}
```

❌ **DON'T**:
```typescript
// Run every time (duplicates)
await generateBatchCSV();
```

---

### 3. Timeout Handling

✅ **DO**:
```typescript
const result = await Promise.race([
  operation(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 30000)
  ),
]);
```

❌ **DON'T**:
```typescript
// No timeout (job hangs forever)
const result = await operation();
```

---

### 4. Error Strategies

✅ **DO**:
```typescript
try {
  // logic
} catch (error) {
  if (error.message === 'CSV timeout') {
    scheduleRetry(); // Retry later
  } else if (error.message.includes('Google Drive')) {
    alertGoogleDriveIssue(); // Different handling
  } else {
    throw; // Unknown error
  }
}
```

❌ **DON'T**:
```typescript
catch (error) {
  throw error; // All errors treated the same
}
```

---

### 5. Logging & Metrics

✅ **DO**:
```typescript
console.log('[Cron] Daily export completed', {
  entriesCount: 42,
  csvSize: '2.5 MB',
  uploadDuration: 1500,
  totalDuration: 5000,
});
```

❌ **DON'T**:
```typescript
console.log('Done'); // No metrics
```

---

### 6. Discord Alerts

✅ **DO**:
```typescript
await sendInfoLog({
  title: '✅ Daily Batch Export Ready',
  fields: [
    { name: 'Entries', value: '42' },
    { name: 'Download', value: webViewLink },
  ],
});
```

❌ **DON'T**:
```typescript
await sendInfoLog('Batch done'); // No context
```

---

### 7. Fire-and-Forget for Cleanup

✅ **DO**:
```typescript
// Don't wait for cleanup
ExportLog.deleteMany({ createdAt: { $lt: thirtyDaysAgo } })
  .catch(err => logger.error(err));

return { success: true };
```

❌ **DON'T**:
```typescript
// Job waits for cleanup (slower)
await ExportLog.deleteMany({...});
return { success: true };
```

---

### 8. Graceful Shutdown

✅ **DO**:
```typescript
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  shutdownJobs(); // Stop cron
  server.close();
});
```

❌ **DON'T**:
```typescript
// Job keeps running after server closes
process.exit(0);
```

---

## 🎯 Phase 5 Checklist

Before merging PR:

- [ ] DailyExportJob class created (all methods)
- [ ] Cron job registered in loader
- [ ] Unit tests: 5/5 passing
- [ ] Integration tests: 6/6 passing
- [ ] E2E manual tests: 8/8 scenarios verified
- [ ] Performance baseline documented
- [ ] Documentation complete
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Graceful shutdown implemented
- [ ] Commits clear and descriptive
- [ ] Ready for merge to main

---

## 📈 Success Metrics

| Metric | Target | How to Verify |
|:-------|:--------|:--------------|
| **Tests Passing** | 100% | `bun test` output |
| **Type Safety** | 0 errors | `bun tsc --noEmit` |
| **Lint** | 0 warnings | `bun run lint` |
| **Cron Accuracy** | ±1 min of 18:00 | Server logs |
| **Processing Time** | < 30 seconds | Performance metrics |
| **CSV Size** | 150 bytes/entry | Load test results |
| **Discord Alerts** | Working | Check Discord |
| **Idempotency** | No duplicates | Test twice same day |
| **Documentation** | Complete | Read and verify |
| **Graceful Shutdown** | Working | Test SIGTERM |

---

## 🎉 After Phase 5 Complete

**Progress**: 70/100 (70%)

**Phases Remaining**:
- Phase 6: Documentation + E2E - 1.5h

**Total estimated**: 1.5 more hours until 100/100

---

## 💡 Key Differences from Phase 4

| Aspect | Phase 4 (Webhook) | Phase 5 (Cron) |
|:-------|:-----------------|:--------------|
| **Trigger** | User action (webhook) | System schedule (cron) |
| **Frequency** | Every approval | Once daily at 18:00 |
| **Processing** | Single entry | Batch of entries |
| **Timeout** | 3 seconds | 30 seconds |
| **Idempotency** | Duplicate check | Day-based check |
| **Response** | HTTP 200 | Async background |
| **Retry Logic** | 3 attempts | 1 hour delay |

---

## 🚀 Phase 5 Ready!

**All tasks prepared**:
- ✅ 5.1: DailyExportJob class
- ✅ 5.2: Cron registration
- ✅ 5.3: Unit tests
- ✅ 5.4: Integration tests
- ✅ 5.5: Manual E2E
- ✅ 5.6: Documentation
- ✅ 5.7: Load testing
- ✅ 5.8: Final commit

**Ready to start?** Copy Task 5.1 and go! 🚀

---

**Document**: Phase 5 Implementation Plan  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Date**: January 18, 2026  
**Target Score**: 70/100
