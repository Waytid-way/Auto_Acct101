# 📂 Scripts: backend/src/scripts

**Last Updated:** 2026-01-18  
**Total Scripts:** 47  
**Total Lines of Code:** 4065  
**Categories:** VERIFICATION, TESTING, MAINTENANCE, CONFIGURATION

## 📋 Contents


### VERIFICATION
- **Count:** 4
- analyze-script-quality.ts
- generate-final-report.ts
- restructure-project.ts
- verify-phase3-ready.ts


### TESTING
- **Count:** 17
- manual-full-loop-test.ts
- run-full-simulation.ts
- seed-simulation.ts
- simple-gemini-test.ts
- simulate-bulk-data.ts
- simulate-realworld-flow.ts
- simulate-realworld-with-ai.ts
- simulate-webhook.ts
- stress-test-discord.ts
- test-discord-webhooks.ts
- test-gemini-classification.ts
- test-groq-classification.ts
- test-groq-connection.ts
- test-hybrid-logic.ts
- test-rest-api.ts
- test-teable-update.ts
- test-teable.ts


### MAINTENANCE
- **Count:** 16
- analyze-state.ts
- check-approved-entries.ts
- check-queue.ts
- clear-queue.ts
- clear-teable.ts
- debug-status.ts
- debug-teable.ts
- force-poll.ts
- sync-flowaccount-cron.ts
- trigger-export.ts
- wipe-data.ts
- analyze-scripts.ts
- categorize-scripts.ts
- generate-docs.ts
- list-folders.ts
- list-gemini-models.ts


### CONFIGURATION
- **Count:** 10
- deploy-commands.ts
- generate-accounting-request-doc.ts
- register-discord-commands.ts
- register-teable-webhook.ts
- setup-google-oauth.ts
- setup-teable-schema.ts
- setup-teable.ts
- update-teable-options.ts
- add-drcr-columns.ts
- add-export-path-column.ts

## 📝 Detailed Scripts


### ⚙️ analyze-script-quality.ts
**File Path:** `backend\src\scripts\analyze-script-quality.ts`  
**Category:** VERIFICATION → Unknown  
**Lines:** 150 | **Error Handling:** ✅ Yes

**Purpose:**  
Purpose unknown - requires manual review

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/analyze-script-quality.ts
```

---

### ⚙️ generate-final-report.ts
**File Path:** `backend\src\scripts\generate-final-report.ts`  
**Category:** VERIFICATION → Unknown  
**Lines:** 85 | **Error Handling:** ⚠️ No

**Purpose:**  
Purpose unknown - requires manual review

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/generate-final-report.ts
```

---

### ⚙️ restructure-project.ts
**File Path:** `backend\src\scripts\restructure-project.ts`  
**Category:** VERIFICATION → Unknown  
**Lines:** 112 | **Error Handling:** ✅ Yes

**Purpose:**  
Purpose unknown - requires manual review

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/restructure-project.ts
```

---

### ⚙️ manual-full-loop-test.ts
**File Path:** `backend\src\scripts\testing\manual-full-loop-test.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 84 | **Error Handling:** ✅ Yes

**Purpose:**  
Manual trigger script for verifying full loop

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../../modules/teable/TeableClient, ../../jobs/TeablePollingJob, ../../jobs/DailyExportJob, ../../modules/files/GoogleDriveService, ../../modules/accounting/models/JournalEntry.model, ../../modules/export/models/ExportQueue, ../../config/env

**Usage:**
```bash
bun run backend/scripts/manual-full-loop-test.ts
```

---

### ⚙️ run-full-simulation.ts
**File Path:** `backend\src\scripts\testing\run-full-simulation.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 49 | **Error Handling:** ✅ Yes

**Purpose:**  
Orchestrates a full end-to-end system simulation

**Key Functions:**
- N/A

**Dependencies:**
- External: child_process, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/run-full-simulation.ts
```

---

### ⚙️ seed-simulation.ts
**File Path:** `backend\src\scripts\testing\seed-simulation.ts`  
**Category:** TESTING → Data Generation  
**Lines:** 99 | **Error Handling:** ✅ Yes

**Purpose:**  
Seeds database with test data for simulation

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose, fs, path
- Internal: ../../config/env, ../../modules/accounting/models/JournalEntry.model, ../../modules/export/models/ExportQueue, ../../modules/export/models/ExportLog

**Usage:**
```bash
bun run backend/scripts/seed-simulation.ts
```

---

### ⚙️ simple-gemini-test.ts
**File Path:** `backend\src\scripts\testing\simple-gemini-test.ts`  
**Category:** TESTING → AI/ML Tests  
**Lines:** 66 | **Error Handling:** ✅ Yes

**Purpose:**  
Simple connectivity test for Gemini API

**Key Functions:**
- N/A

**Dependencies:**
- External: @google/generative-ai
- Internal: ../../config/env.js

**Usage:**
```bash
bun run backend/scripts/simple-gemini-test.ts
```

---

### ⚙️ simulate-bulk-data.ts
**File Path:** `backend\src\scripts\testing\simulate-bulk-data.ts`  
**Category:** TESTING → Data Generation  
**Lines:** 101 | **Error Handling:** ✅ Yes

**Purpose:**  
Generates bulk transaction data for load testing

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../../modules/accounting/models/JournalEntry.model, ../../modules/teable/TeableClient, ../../config/env, ../../loaders/mongoose

**Usage:**
```bash
bun run backend/scripts/simulate-bulk-data.ts
```

---

### ⚙️ simulate-realworld-flow.ts
**File Path:** `backend\src\scripts\testing\simulate-realworld-flow.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 72 | **Error Handling:** ✅ Yes

**Purpose:**  
Simulates a user flow from upload to approval

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../modules/teable/TeableClient, ../../config/env

**Usage:**
```bash
bun run backend/scripts/simulate-realworld-flow.ts
```

---

### ⚙️ simulate-realworld-with-ai.ts
**File Path:** `backend\src\scripts\testing\simulate-realworld-with-ai.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 119 | **Error Handling:** ✅ Yes

**Purpose:**  
Simulates flow including AI classification step

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../../modules/accounting/models/JournalEntry.model, ../../modules/teable/TeableClient, ../../modules/ai/GroqClassificationService, ../../config/env, ../../loaders/mongoose

**Usage:**
```bash
bun run backend/scripts/simulate-realworld-with-ai.ts
```

---

### ⚙️ simulate-webhook.ts
**File Path:** `backend\src\scripts\testing\simulate-webhook.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 47 | **Error Handling:** ✅ Yes

**Purpose:**  
Simulates incoming webhook payloads from Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/simulate-webhook.ts
```

---

### ⚙️ stress-test-discord.ts
**File Path:** `backend\src\scripts\testing\stress-test-discord.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 74 | **Error Handling:** ✅ Yes

**Purpose:**  
Stress tests Discord notification system

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/logger

**Usage:**
```bash
bun run backend/scripts/stress-test-discord.ts
```

---

### ⚙️ test-discord-webhooks.ts
**File Path:** `backend\src\scripts\testing\test-discord-webhooks.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 91 | **Error Handling:** ✅ Yes

**Purpose:**  
Validates Discord webhook alerts for accounting events

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/mongoose.js, ../../config/env.js

**Usage:**
```bash
bun run backend/scripts/test-discord-webhooks.ts
```

---

### ⚙️ test-gemini-classification.ts
**File Path:** `backend\src\scripts\testing\test-gemini-classification.ts`  
**Category:** TESTING → AI/ML Tests  
**Lines:** 79 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests Gemini AI classification model

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../modules/gemini/GeminiClassificationService.js, ../../loaders/logger.js, ../../loaders/logger.js

**Usage:**
```bash
bun run backend/scripts/test-gemini-classification.ts
```

---

### ⚙️ test-groq-classification.ts
**File Path:** `backend\src\scripts\testing\test-groq-classification.ts`  
**Category:** TESTING → AI/ML Tests  
**Lines:** 75 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests Groq AI (Llama 3.3) classification

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../modules/ai/GroqClassificationService.js, ../../loaders/logger.js, ../../loaders/logger.js

**Usage:**
```bash
bun run backend/scripts/test-groq-classification.ts
```

---

### ⚙️ test-groq-connection.ts
**File Path:** `backend\src\scripts\testing\test-groq-connection.ts`  
**Category:** TESTING → Connectivity Tests  
**Lines:** 42 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests connectivity to Groq API

**Key Functions:**
- N/A

**Dependencies:**
- External: @config/env, @modules/ai/GroqClassificationService, @loaders/logger
- Internal: None

**Usage:**
```bash
bun run backend/scripts/test-groq-connection.ts
```

---

### ⚙️ test-hybrid-logic.ts
**File Path:** `backend\src\scripts\testing\test-hybrid-logic.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 90 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests hybrid OCR logic (PaddleOCR + Google Vision)

**Key Functions:**
- N/A

**Dependencies:**
- External: @modules/flowaccount/FlowAccountSyncService, @modules/ai/GroqClassificationService
- Internal: None

**Usage:**
```bash
bun run backend/scripts/test-hybrid-logic.ts
```

---

### ⚙️ test-rest-api.ts
**File Path:** `backend\src\scripts\testing\test-rest-api.ts`  
**Category:** TESTING → API Tests  
**Lines:** 50 | **Error Handling:** ✅ Yes

**Purpose:**  
Validates REST API endpoints and health checks

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env.js

**Usage:**
```bash
bun run backend/scripts/test-rest-api.ts
```

---

### ⚙️ test-teable-update.ts
**File Path:** `backend\src\scripts\testing\test-teable-update.ts`  
**Category:** TESTING → API Tests  
**Lines:** 60 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests Teable record update functionality

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../modules/teable/TeableClient, ../../config/env

**Usage:**
```bash
bun run backend/scripts/test-teable-update.ts
```

---

### ⚙️ test-teable.ts
**File Path:** `backend\src\scripts\testing\test-teable.ts`  
**Category:** TESTING → API Tests  
**Lines:** 43 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests Teable API integration and webhook handling

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/test-teable.ts
```

---

### ⚙️ verify-phase3-ready.ts
**File Path:** `backend\src\scripts\testing\verify-phase3-ready.ts`  
**Category:** VERIFICATION → Phase Readiness  
**Lines:** 167 | **Error Handling:** ✅ Yes

**Purpose:**  
Verifies Phase 3 readiness before deployment

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/mongoose.js, ../../modules/accounting/AccountingModel.js, ../../loaders/logger.js

**Usage:**
```bash
bun run backend/scripts/verify-phase3-ready.ts
```

---

### ⚙️ analyze-state.ts
**File Path:** `backend\src\scripts\maintenance\analyze-state.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 68 | **Error Handling:** ✅ Yes

**Purpose:**  
Analyzes current system state (Journal Entries & Export Queue)

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/mongoose, ../../modules/accounting/models/JournalEntry.model, ../../modules/export/models/ExportQueue

**Usage:**
```bash
bun run backend/scripts/analyze-state.ts
```

---

### ⚙️ check-approved-entries.ts
**File Path:** `backend\src\scripts\maintenance\check-approved-entries.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 45 | **Error Handling:** ✅ Yes

**Purpose:**  
Verifies approved ledger entries

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../../config/env.js

**Usage:**
```bash
bun run backend/scripts/check-approved-entries.ts
```

---

### ⚙️ check-queue.ts
**File Path:** `backend\src\scripts\maintenance\check-queue.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 36 | **Error Handling:** ⚠️ No

**Purpose:**  
Inspects items currently in the export queue

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../../config/env, ../../modules/export/models/ExportQueue

**Usage:**
```bash
bun run backend/scripts/check-queue.ts
```

---

### ⚙️ clear-queue.ts
**File Path:** `backend\src\scripts\maintenance\clear-queue.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 15 | **Error Handling:** ⚠️ No

**Purpose:**  
Clears all items from the export queue

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../modules/export/models/ExportQueue, ../../loaders/mongoose

**Usage:**
```bash
bun run backend/scripts/clear-queue.ts
```

---

### ⚙️ clear-teable.ts
**File Path:** `backend\src\scripts\maintenance\clear-teable.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 53 | **Error Handling:** ✅ Yes

**Purpose:**  
Deletes all records from Teable (Cleanup)

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/clear-teable.ts
```

---

### ⚙️ debug-status.ts
**File Path:** `backend\src\scripts\maintenance\debug-status.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 71 | **Error Handling:** ✅ Yes

**Purpose:**  
Detailed debugging of record status and linking

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/mongoose, ../../modules/export/models/ExportQueue, ../../modules/accounting/models/JournalEntry.model, ../../modules/teable/TeableClient, ../../config/env

**Usage:**
```bash
bun run backend/scripts/debug-status.ts
```

---

### ⚙️ debug-teable.ts
**File Path:** `backend\src\scripts\maintenance\debug-teable.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 25 | **Error Handling:** ✅ Yes

**Purpose:**  
Debug script for raw Teable API interactions

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/debug-teable.ts
```

---

### ⚙️ force-poll.ts
**File Path:** `backend\src\scripts\maintenance\force-poll.ts`  
**Category:** MAINTENANCE → Scheduled Tasks  
**Lines:** 23 | **Error Handling:** ✅ Yes

**Purpose:**  
Manually triggers the Teable Polling Job

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/mongoose, ../../jobs/TeablePollingJob, ../../loaders/logger

**Usage:**
```bash
bun run backend/scripts/force-poll.ts
```

---

### ⚙️ sync-flowaccount-cron.ts
**File Path:** `backend\src\scripts\maintenance\sync-flowaccount-cron.ts`  
**Category:** MAINTENANCE → Scheduled Tasks  
**Lines:** 42 | **Error Handling:** ✅ Yes

**Purpose:**  
Scheduled sync job with FlowAccount API

**Key Functions:**
- N/A

**Dependencies:**
- External: @loaders/mongoose, @modules/flowaccount/FlowAccountSyncService, @loaders/logger
- Internal: None

**Usage:**
```bash
bun run backend/scripts/sync-flowaccount-cron.ts
```

---

### ⚙️ trigger-export.ts
**File Path:** `backend\src\scripts\maintenance\trigger-export.ts`  
**Category:** MAINTENANCE → Scheduled Tasks  
**Lines:** 46 | **Error Handling:** ✅ Yes

**Purpose:**  
Manually triggers the Daily Export Job

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../../jobs/DailyExportJob, ../../modules/files/GoogleDriveService, ../../modules/export/models/ExportQueue, ../../config/env

**Usage:**
```bash
bun run backend/scripts/trigger-export.ts
```

---

### ⚙️ wipe-data.ts
**File Path:** `backend\src\scripts\maintenance\wipe-data.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 31 | **Error Handling:** ✅ Yes

**Purpose:**  
Wipes local MongoDB data for clean slate testing

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../../loaders/mongoose, ../../modules/accounting/models/JournalEntry.model, ../../modules/export/models/ExportQueue, ../../modules/export/models/ExportLog

**Usage:**
```bash
bun run backend/scripts/wipe-data.ts
```

---

### ⚙️ deploy-commands.ts
**File Path:** `backend\src\scripts\setup\deploy-commands.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 38 | **Error Handling:** ✅ Yes

**Purpose:**  
Deploys Discord slash commands to the server

**Key Functions:**
- N/A

**Dependencies:**
- External: discord.js
- Internal: ../../config/env, ../../loaders/logger

**Usage:**
```bash
bun run backend/scripts/deploy-commands.ts
```

---

### ⚙️ generate-accounting-request-doc.ts
**File Path:** `backend\src\scripts\setup\generate-accounting-request-doc.ts`  
**Category:** CONFIGURATION → Data Generation  
**Lines:** 582 | **Error Handling:** ⚠️ No

**Purpose:**  
Generates accounting team request forms

**Key Functions:**
- N/A

**Dependencies:**
- External: docx, fs
- Internal: None

**Usage:**
```bash
bun run backend/scripts/generate-accounting-request-doc.ts
```

---

### ⚙️ register-discord-commands.ts
**File Path:** `backend\src\scripts\setup\register-discord-commands.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 95 | **Error Handling:** ✅ Yes

**Purpose:**  
Registers Discord slash commands (alternative)

**Key Functions:**
- N/A

**Dependencies:**
- External: discord.js, fs, path
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/register-discord-commands.ts
```

---

### ⚙️ register-teable-webhook.ts
**File Path:** `backend\src\scripts\setup\register-teable-webhook.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 51 | **Error Handling:** ✅ Yes

**Purpose:**  
Registers webhook URL with Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/register-teable-webhook.ts
```

---

### ⚙️ setup-google-oauth.ts
**File Path:** `backend\src\scripts\setup\setup-google-oauth.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 73 | **Error Handling:** ✅ Yes

**Purpose:**  
Interactive setup for Google Drive OAuth2

**Key Functions:**
- N/A

**Dependencies:**
- External: googleapis, google-auth-library, readline
- Internal: None

**Usage:**
```bash
bun run backend/scripts/setup-google-oauth.ts
```

---

### ⚙️ setup-teable-schema.ts
**File Path:** `backend\src\scripts\setup\setup-teable-schema.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 76 | **Error Handling:** ✅ Yes

**Purpose:**  
Full schema initialization for Teable tables

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/setup-teable-schema.ts
```

---

### ⚙️ setup-teable.ts
**File Path:** `backend\src\scripts\setup\setup-teable.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 53 | **Error Handling:** ✅ Yes

**Purpose:**  
Initializes Teable database schema and configuration

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env, ../../loaders/logger

**Usage:**
```bash
bun run backend/scripts/setup-teable.ts
```

---

### ⚙️ update-teable-options.ts
**File Path:** `backend\src\scripts\setup\update-teable-options.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 58 | **Error Handling:** ✅ Yes

**Purpose:**  
Updates Select field options in Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/update-teable-options.ts
```

---

### ⚙️ analyze-scripts.ts
**File Path:** `backend\src\scripts\tools\analyze-scripts.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 175 | **Error Handling:** ✅ Yes

**Purpose:**  
Extracts metadata from script files

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/analyze-scripts.ts
```

---

### ⚙️ categorize-scripts.ts
**File Path:** `backend\src\scripts\tools\categorize-scripts.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 264 | **Error Handling:** ✅ Yes

**Purpose:**  
Categorizes scripts based on metadata and rules

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/categorize-scripts.ts
```

---

### ⚙️ generate-docs.ts
**File Path:** `backend\src\scripts\tools\generate-docs.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 195 | **Error Handling:** ✅ Yes

**Purpose:**  
Generates markdown documentation for scripts

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/generate-docs.ts
```

---

### ⚙️ list-folders.ts
**File Path:** `backend\src\scripts\tools\list-folders.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 82 | **Error Handling:** ✅ Yes

**Purpose:**  
Inventories script folders for code scanning

**Key Functions:**
- N/A

**Dependencies:**
- External: fs, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/list-folders.ts
```

---

### ⚙️ list-gemini-models.ts
**File Path:** `backend\src\scripts\tools\list-gemini-models.ts`  
**Category:** MAINTENANCE → Queries  
**Lines:** 51 | **Error Handling:** ✅ Yes

**Purpose:**  
Lists available Gemini AI models

**Key Functions:**
- N/A

**Dependencies:**
- External: @google/generative-ai
- Internal: ../../config/env.js

**Usage:**
```bash
bun run backend/scripts/list-gemini-models.ts
```

---

### ⚙️ add-drcr-columns.ts
**File Path:** `backend\src\scripts\legacy\add-drcr-columns.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 27 | **Error Handling:** ✅ Yes

**Purpose:**  
Migration: Adds DR/CR columns to Teable schema

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/add-drcr-columns.ts
```

---

### ⚙️ add-export-path-column.ts
**File Path:** `backend\src\scripts\legacy\add-export-path-column.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 35 | **Error Handling:** ✅ Yes

**Purpose:**  
Migration: Adds Export Path column to Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../../config/env

**Usage:**
```bash
bun run backend/scripts/add-export-path-column.ts
```

---

---
**Generated by Auto-Acct Code Scanner**  
**For:** Auto-Acct-001 (Bun + TypeScript)
