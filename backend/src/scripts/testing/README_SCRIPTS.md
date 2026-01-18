# 📂 Scripts: backend/src/scripts/testing

**Last Updated:** 2026-01-18  
**Total Scripts:** 18  
**Total Lines of Code:** 1408  
**Categories:** TESTING, VERIFICATION

## 📋 Contents


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


### VERIFICATION
- **Count:** 1
- verify-phase3-ready.ts

## 📝 Detailed Scripts


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

---
**Generated by Auto-Acct Code Scanner**  
**For:** Auto-Acct-001 (Bun + TypeScript)
