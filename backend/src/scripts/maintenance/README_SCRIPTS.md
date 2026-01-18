# 📂 Scripts: backend/src/scripts/maintenance

**Last Updated:** 2026-01-18  
**Total Scripts:** 11  
**Total Lines of Code:** 455  
**Categories:** MAINTENANCE

## 📋 Contents


### MAINTENANCE
- **Count:** 11
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

## 📝 Detailed Scripts


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

---
**Generated by Auto-Acct Code Scanner**  
**For:** Auto-Acct-001 (Bun + TypeScript)
