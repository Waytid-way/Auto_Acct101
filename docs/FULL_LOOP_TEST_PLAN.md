# Full Loop Simulation Test Plan

**Objective:** Simulate a complete "Real World" daily cycle for Auto-Acct101.
**Goal:** Verify that 5 new accounting entries are correctly processed, exported, uploaded, and logged without manual intervention.

---

## 1. Test Scenario
- **Input:** 5 Mock Journal Entries (Revenue, Expense, Asset) scheduled for "Today".
- **Environment:** Production-like (using OAuth 2.0, Real MongoDB).
- **Triggers:** Manual invocation of the `DailyExportJob`.

## 2. Execution Steps

### Step 1: Clean & Seed State (`scripts/seed-simulation.ts`)
1.  **Clean**: Remove existing `ExportQueue` and `ExportLog` entries for "Today".
2.  **Load Data**: Read `backend/data/synthetic_batch_001.json` (Provided by Data Team).
3.  **Seed**: Bulk insert the 50 synthetic entries into MongoDB `JournalEntry` collection.
4.  **Queue**: Add these 50 entries to `ExportQueue` with status `queued` and `scheduledFor = Now`.

### Step 2: Trigger Job (`scripts/trigger-export.ts`)
1.  Run the existing manual trigger script.
2.  Script will:
    - Pick up the 5 queued entries.
    - Generate `batch_YYYY-MM-DD.csv`.
    - Upload to Google Drive (OAuth).
    - Send Discord Notification.

### Step 3: Verification
1.  **Console Output**: Check for "File uploaded to Google Drive".
2.  **Discord**: Check for Embed with "Entries: 50".
3.  **Google Drive**: Verify file `batch_YYYY-MM-DD.csv` exists and contains 50 rows + header.

---

## 3. Automation Scripts
I will create the following scripts to automate this test:

- `backend/scripts/seed-simulation.ts`: Handles data prep.
- `backend/scripts/run-full-simulation.ts`: Orchestrates Seed -> Trigger.

## 4. Expected Result
- **Success**: Code 0.
- **Artifacts**: 1 CSV on Drive, 1 Log in DB, 1 Discord Message.
