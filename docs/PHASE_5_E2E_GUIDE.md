# Phase 5.5: Manual E2E Testing Guide

**Objective**: Verify the Daily Export Cron Job works in a real running environment.

## 🛠️ Prerequisites

1.  **Backend Running**: `bun run dev`
2.  **MongoDB Running**: `docker-compose up -d mongodb`
3.  **Google Drive Config**: Valid `service-account.json` in `backend/`

## 🧪 Test Scenarios

### Scenario 1: Trigger Export via API (Simulate Cron)

**Action**:
Since we don't have a direct API endpoint to trigger the cron job, we will create a temporary script `scripts/trigger-export.ts` to manually invoke the job.

**Script Content (`backend/scripts/trigger-export.ts`)**:
```typescript
import mongoose from 'mongoose';
import { DailyExportJob } from '../src/jobs/DailyExportJob';
import { ExpressExportService } from '../src/modules/export/ExpressExportService';
import { GoogleDriveService } from '../src/modules/files/GoogleDriveService';
import config from '../src/config';

// Mock logger to see output in console
const logger = {
    info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
};

// @ts-ignore
global.logger = logger;

async function run() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    
    console.log('Initializing Job...');
    const job = new DailyExportJob(
        new ExpressExportService(),
        new GoogleDriveService()
    );
    
    console.log('Executing Daily Export...');
    try {
        await job.executeDaily();
        console.log('✅ Daily Export Execution Completed');
    } catch (err) {
        console.error('❌ Daily Export Failed:', err);
    }
    
    await mongoose.disconnect();
    process.exit(0);
}

run();
```

**Verify**:
- [ ] Console shows "CSV uploaded to Google Drive"
- [ ] Console shows "Daily batch CSV generated"

### Scenario 2: Google Drive Verification

**Action**:
- Go to the Google Drive folder shared with the service account.
- Check for a new file named `batch_YYYY-MM-DD.csv`.

**Verify**:
- [ ] File exists
- [ ] File content matches expected CSV format

### Scenario 3: Database Verification

**Action**:
Run MongoDB query:
```bash
docker exec -it auto_acct_mongo mongosh auto_acct --eval "db.exportlogs.find({action: 'csv_generated'}).sort({createdAt:-1}).limit(1).pretty()"
```

**Verify**:
- [ ] `action`: "csv_generated"
- [ ] `metadata.fileId`: Exists
- [ ] `metadata.webViewLink`: Exists

## 🚀 Execution Script

Run the trigger script:
```bash
bun backend/scripts/trigger-export.ts
```
