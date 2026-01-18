# 🕵️‍♂️ Root Cause Analysis: Data Mismatch (Teable vs Google Drive)

**Date**: 2026-01-18
**Priority**: Critical
**Status**: Investigating

## 1. Problem Description
The user reports a discrepancy between the data stored in the source of truth (Teable) and the final output (CSV in Google Drive).
**Symptoms**:
- Row counts do not match? (TBC)
- Field values are different? (TBC)
- Records missing entirely? (TBC)

## 2. Data Pipeline Overview
1.  **Ingestion**: Teable -> MongoDB (`JournalEntry`)
2.  **Queueing**: `JournalEntry` -> `ExportQueue`
3.  **Processing**: `ExportQueue` (Daily Cron) -> CSV Generation
4.  **Delivery**: CSV -> Google Drive

## 3. Potential Failure Points (Hypotheses)

### H1: Ingestion Sync Latency/Failure
- **Theory**: Data in Teable hasn't made it to MongoDB yet.
- **Check**: Webhook handlers, Polling intervals, Error logs in Ingestion.

### H2: Export Queue Filtering
- **Theory**: The `DailyExportJob` is filtering out valid records (e.g., status != 'approved', wrong date range).
- **Check**: `find()` queries in `DailyExportJob.ts`.

### H3: Timezone/Date Boundary Issues
- **Theory**: "Daily" export is running in UTC but user expects Local Time (cutoff issues).
- **Check**: Date comparisons in query logic.

### H4: Max Limit / Pagination
- **Theory**: The export job has a hard limit (e.g., 50 or 100 records) and is dropping the rest.
- **Check**: `limit()` clauses in Mongoose queries.

### H5: CSV Formatting Bugs
- **Theory**: Data exists but CSV generation fails for specific characters (e.g., commas, newlines) or drops columns.
- **Check**: CSV library usage and field mapping.

## 4. Investigation Findings (Updated)

### 🚨 Major Finding 1: Broken Data Ingestion (H1 Confirmed)
**Status**: 🔴 **CRITICAL**
- **Observation**: The system has **NO CODE** to create new `JournalEntry` documents in MongoDB from Teable.
- **Evidence**:
    - `TeablePollingJob.ts`: Skips entry if `findById` returns null.
    - `TeableWebhookController.ts`: Updates existing entry (`updateOne`), does not create.
    - Global Search: `JournalEntryModel.create` is not called in any production service.
- **Impact**: New records created in Teable **never** appear in MongoDB, so they are never exported. Only records manually seeded (e.g., via `seed-simulation.ts`) exist.

### 🚨 Major Finding 2: Schema & CSV Mismatch (H5 Confirmed)
**Status**: 🔴 **High Priority**
- **Observation**: `DailyExportJob.ts` uses property names that do not exist on the Mongoose model.
- **Evidence**:
    - Job uses: `entry.amounts.debit` / `entry.amounts.credit`
    - Model has: `entry.amount` (Number) and `entry.type` ('debit'/'credit')
- **Impact**: Even if records existed, the CSV `Debit` and `Credit` columns would be empty/zero because `entry.amounts` is undefined.

### 🚨 Major Finding 3: CSV Format Inconsistency
**Status**: 🟠 **Medium Priority**
- **Observation**: Two different CSV formats exist in the codebase.
    - `DailyExportJob`: Single-entry (1 row per doc), 6 columns.
    - `ExpressExportService` (Unused?): Double-entry (2 rows per doc), more columns.
- **Impact**: User receiving "Single Entry" format may expect "Double Entry" format.

## 5. Next Steps (Remediation Plan)
1.  **Implement Ingestion**: Modify `TeablePollingJob` to **CREATE** new `JournalEntry` documents if they don't exist.
2.  **Fix CSV Logic**: Update `DailyExportJob` to correctly look up `amount` and `type` fields to map to Debit/Credit columns.
3.  **Standardize Format**: Confirm with user which CSV format (Single or Double) is required.

