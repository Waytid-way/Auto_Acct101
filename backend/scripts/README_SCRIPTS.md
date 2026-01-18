# 📂 Scripts: backend/scripts

**Last Updated:** 2026-01-18  
**Total Scripts:** 27  
**Total Lines of Code:** 1627  
**Categories:** CONFIGURATION, MAINTENANCE, TESTING

## 📋 Contents


### CONFIGURATION
- **Count:** 7
- add-drcr-columns.ts
- add-export-path-column.ts
- deploy-commands.ts
- register-teable-webhook.ts
- setup-google-oauth.ts
- setup-teable-schema.ts
- update-teable-options.ts


### MAINTENANCE
- **Count:** 9
- analyze-state.ts
- check-queue.ts
- clear-queue.ts
- clear-teable.ts
- debug-status.ts
- debug-teable.ts
- force-poll.ts
- trigger-export.ts
- wipe-data.ts


### TESTING
- **Count:** 11
- run-full-simulation.ts
- seed-simulation.ts
- simulate-bulk-data.ts
- simulate-realworld-flow.ts
- simulate-realworld-with-ai.ts
- simulate-webhook.ts
- stress-test-discord.ts
- test-discord-webhooks.ts
- test-groq-connection.ts
- test-teable-update.ts
- test-teable.ts

## 📝 Detailed Scripts


### ⚙️ add-drcr-columns.ts
**File Path:** `backend\scripts\add-drcr-columns.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 27 | **Error Handling:** ✅ Yes

**Purpose:**  
Migration: Adds DR/CR columns to Teable schema

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/add-drcr-columns.ts
```

---

### ⚙️ add-export-path-column.ts
**File Path:** `backend\scripts\add-export-path-column.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 35 | **Error Handling:** ✅ Yes

**Purpose:**  
Migration: Adds Export Path column to Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/add-export-path-column.ts
```

---

### ⚙️ analyze-state.ts
**File Path:** `backend\scripts\analyze-state.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 68 | **Error Handling:** ✅ Yes

**Purpose:**  
Analyzes current system state (Journal Entries & Export Queue)

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/loaders/mongoose, ../src/modules/accounting/models/JournalEntry.model, ../src/modules/export/models/ExportQueue

**Usage:**
```bash
bun run backend/scripts/analyze-state.ts
```

---

### ⚙️ check-queue.ts
**File Path:** `backend\scripts\check-queue.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 36 | **Error Handling:** ⚠️ No

**Purpose:**  
Inspects items currently in the export queue

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../src/config/env, ../src/modules/export/models/ExportQueue

**Usage:**
```bash
bun run backend/scripts/check-queue.ts
```

---

### ⚙️ clear-queue.ts
**File Path:** `backend\scripts\clear-queue.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 15 | **Error Handling:** ⚠️ No

**Purpose:**  
Clears all items from the export queue

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/modules/export/models/ExportQueue, ../src/loaders/mongoose

**Usage:**
```bash
bun run backend/scripts/clear-queue.ts
```

---

### ⚙️ clear-teable.ts
**File Path:** `backend\scripts\clear-teable.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 53 | **Error Handling:** ✅ Yes

**Purpose:**  
Deletes all records from Teable (Cleanup)

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/clear-teable.ts
```

---

### ⚙️ debug-status.ts
**File Path:** `backend\scripts\debug-status.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 71 | **Error Handling:** ✅ Yes

**Purpose:**  
Detailed debugging of record status and linking

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/loaders/mongoose, ../src/modules/export/models/ExportQueue, ../src/modules/accounting/models/JournalEntry.model, ../src/modules/teable/TeableClient, ../src/config/env

**Usage:**
```bash
bun run backend/scripts/debug-status.ts
```

---

### ⚙️ debug-teable.ts
**File Path:** `backend\scripts\debug-teable.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 25 | **Error Handling:** ✅ Yes

**Purpose:**  
Debug script for raw Teable API interactions

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/debug-teable.ts
```

---

### ⚙️ deploy-commands.ts
**File Path:** `backend\scripts\deploy-commands.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 38 | **Error Handling:** ✅ Yes

**Purpose:**  
Deploys Discord slash commands to the server

**Key Functions:**
- N/A

**Dependencies:**
- External: discord.js
- Internal: ../src/config/env, ../src/loaders/logger

**Usage:**
```bash
bun run backend/scripts/deploy-commands.ts
```

---

### ⚙️ force-poll.ts
**File Path:** `backend\scripts\force-poll.ts`  
**Category:** MAINTENANCE → Scheduled Tasks  
**Lines:** 23 | **Error Handling:** ✅ Yes

**Purpose:**  
Manually triggers the Teable Polling Job

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/loaders/mongoose, ../src/jobs/TeablePollingJob, ../src/loaders/logger

**Usage:**
```bash
bun run backend/scripts/force-poll.ts
```

---

### ⚙️ register-teable-webhook.ts
**File Path:** `backend\scripts\register-teable-webhook.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 51 | **Error Handling:** ✅ Yes

**Purpose:**  
Registers webhook URL with Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/register-teable-webhook.ts
```

---

### ⚙️ run-full-simulation.ts
**File Path:** `backend\scripts\run-full-simulation.ts`  
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
**File Path:** `backend\scripts\seed-simulation.ts`  
**Category:** TESTING → Data Generation  
**Lines:** 99 | **Error Handling:** ✅ Yes

**Purpose:**  
Seeds database with test data for simulation

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose, fs, path
- Internal: ../src/config/env, ../src/modules/accounting/models/JournalEntry.model, ../src/modules/export/models/ExportQueue, ../src/modules/export/models/ExportLog

**Usage:**
```bash
bun run backend/scripts/seed-simulation.ts
```

---

### ⚙️ setup-google-oauth.ts
**File Path:** `backend\scripts\setup-google-oauth.ts`  
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
**File Path:** `backend\scripts\setup-teable-schema.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 69 | **Error Handling:** ✅ Yes

**Purpose:**  
Full schema initialization for Teable tables

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/setup-teable-schema.ts
```

---

### ⚙️ simulate-bulk-data.ts
**File Path:** `backend\scripts\simulate-bulk-data.ts`  
**Category:** TESTING → Data Generation  
**Lines:** 101 | **Error Handling:** ✅ Yes

**Purpose:**  
Generates bulk transaction data for load testing

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../src/modules/accounting/models/JournalEntry.model, ../src/modules/teable/TeableClient, ../src/config/env, ../src/loaders/mongoose

**Usage:**
```bash
bun run backend/scripts/simulate-bulk-data.ts
```

---

### ⚙️ simulate-realworld-flow.ts
**File Path:** `backend\scripts\simulate-realworld-flow.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 72 | **Error Handling:** ✅ Yes

**Purpose:**  
Simulates a user flow from upload to approval

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/modules/teable/TeableClient, ../src/config/env

**Usage:**
```bash
bun run backend/scripts/simulate-realworld-flow.ts
```

---

### ⚙️ simulate-realworld-with-ai.ts
**File Path:** `backend\scripts\simulate-realworld-with-ai.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 119 | **Error Handling:** ✅ Yes

**Purpose:**  
Simulates flow including AI classification step

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../src/modules/accounting/models/JournalEntry.model, ../src/modules/teable/TeableClient, ../src/modules/ai/GroqClassificationService, ../src/config/env, ../src/loaders/mongoose

**Usage:**
```bash
bun run backend/scripts/simulate-realworld-with-ai.ts
```

---

### ⚙️ simulate-webhook.ts
**File Path:** `backend\scripts\simulate-webhook.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 47 | **Error Handling:** ✅ Yes

**Purpose:**  
Simulates incoming webhook payloads from Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/simulate-webhook.ts
```

---

### ⚙️ stress-test-discord.ts
**File Path:** `backend\scripts\stress-test-discord.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 74 | **Error Handling:** ✅ Yes

**Purpose:**  
Stress tests Discord notification system

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/loaders/logger

**Usage:**
```bash
bun run backend/scripts/stress-test-discord.ts
```

---

### ⚙️ test-discord-webhooks.ts
**File Path:** `backend\scripts\test-discord-webhooks.ts`  
**Category:** TESTING → Integration Tests  
**Lines:** 162 | **Error Handling:** ✅ Yes

**Purpose:**  
Validates Discord webhook alerts for accounting events

**Key Functions:**
- N/A

**Dependencies:**
- External: dotenv, path
- Internal: None

**Usage:**
```bash
bun run backend/scripts/test-discord-webhooks.ts
```

---

### ⚙️ test-groq-connection.ts
**File Path:** `backend\scripts\test-groq-connection.ts`  
**Category:** TESTING → Connectivity Tests  
**Lines:** 45 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests connectivity to Groq API

**Key Functions:**
- N/A

**Dependencies:**
- External: groq-sdk
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/test-groq-connection.ts
```

---

### ⚙️ test-teable-update.ts
**File Path:** `backend\scripts\test-teable-update.ts`  
**Category:** TESTING → API Tests  
**Lines:** 60 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests Teable record update functionality

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/modules/teable/TeableClient, ../src/config/env

**Usage:**
```bash
bun run backend/scripts/test-teable-update.ts
```

---

### ⚙️ test-teable.ts
**File Path:** `backend\scripts\test-teable.ts`  
**Category:** TESTING → API Tests  
**Lines:** 80 | **Error Handling:** ✅ Yes

**Purpose:**  
Tests Teable API integration and webhook handling

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/test-teable.ts
```

---

### ⚙️ trigger-export.ts
**File Path:** `backend\scripts\trigger-export.ts`  
**Category:** MAINTENANCE → Scheduled Tasks  
**Lines:** 46 | **Error Handling:** ✅ Yes

**Purpose:**  
Manually triggers the Daily Export Job

**Key Functions:**
- N/A

**Dependencies:**
- External: mongoose
- Internal: ../src/jobs/DailyExportJob, ../src/modules/files/GoogleDriveService, ../src/modules/export/models/ExportQueue, ../src/config/env

**Usage:**
```bash
bun run backend/scripts/trigger-export.ts
```

---

### ⚙️ update-teable-options.ts
**File Path:** `backend\scripts\update-teable-options.ts`  
**Category:** CONFIGURATION → Setup Scripts  
**Lines:** 58 | **Error Handling:** ✅ Yes

**Purpose:**  
Updates Select field options in Teable

**Key Functions:**
- N/A

**Dependencies:**
- External: axios
- Internal: ../src/config/env

**Usage:**
```bash
bun run backend/scripts/update-teable-options.ts
```

---

### ⚙️ wipe-data.ts
**File Path:** `backend\scripts\wipe-data.ts`  
**Category:** MAINTENANCE → Health Checks  
**Lines:** 31 | **Error Handling:** ✅ Yes

**Purpose:**  
Wipes local MongoDB data for clean slate testing

**Key Functions:**
- N/A

**Dependencies:**
- External: None
- Internal: ../src/loaders/mongoose, ../src/modules/accounting/models/JournalEntry.model, ../src/modules/export/models/ExportQueue, ../src/modules/export/models/ExportLog

**Usage:**
```bash
bun run backend/scripts/wipe-data.ts
```

---

---
**Generated by Auto-Acct Code Scanner**  
**For:** Auto-Acct-001 (Bun + TypeScript)
