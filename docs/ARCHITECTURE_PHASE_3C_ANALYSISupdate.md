# Architecture Analysis: Phase 3C (Smart Auto-Export)

**Generated**: 2026-01-17
**Status**: Analysis Complete

---

## 🔍 System State Analysis

### 1. Teable Integration
- **Current State**: 
  - `TeableClient.ts` exists for API calls (create/update records).
  - **Webhook Handler**: `src/modules/teable/routes.ts` is currently **EMPTY**.
  - **Payload**: No existing schema defined in code.
  - **Gap**: Need to implement the webhook endpoint `POST /webhooks/teable` from scratch to handle `exportPath` field.

### 2. Medici Integration (Accounting)
- **Current State**:
  - `JournalEntry` model (Mongoose) maps to `medici` book structure.
  - `AccountingRepository` likely encapsulates `medici` calls.
  - **Validation**: Double-entry (Dr == Cr) needs to be enforced before export.
  - **Gap**: `ExpressExportService` needs to query `JournalEntry` and validate `medici` transactions (Dr/Cr balance) exactly as Phase 3C requires.

### 3. Google Drive Service
- **Current State**:
  - `files/routes.ts` is **EMPTY**.
  - `OCRService` and `Receipt` model reference `driveFileId`.
  - **Gap**: **CRITICAL**. No dedicated `GoogleDriveService.ts` found in `src/services` or `src/modules/files`. 
  - **Action**: Must create `GoogleDriveService` (wrapper around `googleapis` or REST API) as part of Phase 3C (Task 2.1 dependency).

### 4. Discord Service
- **Current State**: ✅ **READY**
- **Location**: `src/loaders/logger.ts` exports `sendCriticalAlert`, `sendInfoLog`, `sendMLUpdate`.
- **Usage**: ready to be imported and used in `ExpressExportService`.

---

## 🏗️ Proposed Architecture (Phase 3C)

### New Modules & Locations

| Component | Proposed Path | Description |
|:----------|:--------------|:------------|
| **ExportQueue Model** | `src/modules/export/models/ExportQueue.ts` | Tracks export requests & status |
| **ExportLog Model** | `src/modules/export/models/ExportLog.ts` | Audit trail for debugging |
| **ExpressExportService** | `src/modules/export/ExpressExportService.ts` | Core logic (3 paths, validations) |
| **ExportController** | `src/modules/export/ExportController.ts` | API endpoints (`/queue`, `/metrics`) |
| **GoogleDriveService** | `src/modules/files/GoogleDriveService.ts` | **NEW**: File upload/auth logic |
| **DailyExportJob** | `src/jobs/DailyExportJob.ts` | Cron job for 18:00 batch |
| **Teable Webhook** | `src/modules/teable/controllers/TeableWebhookController.ts` | Handles incoming approval events |

### 📊 Interaction Diagram

```mermaid
sequenceDiagram
    participant U as Accountant (Teable)
    participant T as Teable Webhook
    participant API as Backend API
    participant SVC as ExpressExportService
    participant DB as MongoDB (ExportQueue)
    participant DRIVE as Google Drive
    participant EXP as Express API
    participant D as Discord

    Note over U, T: Approval with Export Path

    U->>T: Approves Record (Path: Immediate)
    T->>API: POST /webhooks/teable
    API->>SVC: queueForExport(Immediate)
    
    SVC->>DB: Create ExportQueue (status=queued)
    SVC->>DB: Create ExportLog
    
    rect rgb(240, 248, 255)
        Note right of SVC: Path 2: Immediate Export
        SVC->>SVC: validateEntry(Dr==Cr)
        
        alt Valid
            SVC->>EXP: POST /gl/journal
            EXP-->>SVC: 200 OK
            SVC->>DB: Update Queue (status=completed)
            SVC->>D: Alert: "Export Success"
        else Invalid
            SVC->>DB: Update Queue (status=failed)
            SVC->>D: Alert: "Validation Failed"
        end
    end

    Note over U, T: Daily Batch (Cron 18:00)
    
    rect rgb(255, 245, 238)
        loop Every Day 18:00
            SVC->>DB: Find 'scheduled' & 'queued'
            SVC->>SVC: Generate CSV Batch
            SVC->>DRIVE: Upload CSV
            DRIVE-->>SVC: fileUrl
            SVC->>D: Alert: "Batch Ready: [Download Link]"
            SVC->>DB: Mark all completed
        end
    end
```

---

## ⚠️ Critical Dependencies Missing

1.  **GoogleDriveService**: Needs implementation (using service account credentials from env).
2.  **Teable Webhook Handler**: Needs implementation from scratch.

## ✅ Readiness
- **Database**: MongoDB ready.
- **Logging**: Discord Logger ready.
- **Config**: Env vars for Drive/Teable exist.

**Recommendation**: Proceed to Task 0.2 (Branch Creation), but acknowledge `GoogleDriveService` needs to be added to **Task 2.1** scope.
