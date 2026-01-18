# Phase 5.5: Critical Issues Report (Manual E2E Blockers)

This report details the compilation and linting issues encountered while preparing for Manual E2E Testing (Task 5.5). These issues must be resolved to run the `script/trigger-export.ts` successfully.

## 🚨 Critical Blockers (Prevents E2E Testing)

### 1. `DailyExportJob.executeDaily` is Private
**File**: `backend/scripts/trigger-export.ts` (Line 42)
**Error**: `Property 'executeDaily' is private and only accessible within class 'DailyExportJob'.`
**Impact**: The manual trigger script cannot invoke the job logic.
**Solution**:
- Change visibility of `executeDaily` to `public` in `DailyExportJob.ts`.
- OR add a public wrapper method like `forceRun()`.

### 2. Module Resolution Failed
**File**: `backend/scripts/trigger-export.ts` (Line 5)
**Error**: `Cannot find module '../src/config' or its corresponding type declarations.`
**Impact**: Script cannot load configuration (MongoDB URI).
**Cause**: Relative path might be incorrect depending on where `bun` runs the script from, or `tsconfig` paths not respected in standalone script mode.
**Solution**: verify relative path `../src/config`, or use absolute path alias if supported by runtime.

### 3. Missing `bun:test` Types
**File**: `backend/scripts/trigger-export.ts` (Line 15)
**Error**: `Cannot find module 'bun:test'`
**Impact**: Script fails to compile.
**Cause**: The script attempts to use `mock` from `bun:test`, but this module is only available in test environment or needs explicit types.
**Solution**: Remove `bun:test` dependency from the E2E script. Use simple console logging instead of mocking.

---

## ⚠️ High Priority Lint Errors (Code Quality)

### 4. `node-cron` Type Namespace Missing
**File**: `backend/src/jobs/DailyExportJob.ts` (Line 27)
**Error**: `Cannot find namespace 'cron'.`
**Impact**: TypeScript compilation error.
**Cause**: Likely missing `@types/node-cron` or incorrect usage of namespace in JSDoc/Types.
**Solution**: Install types or fix import.

### 5. `sendInfoLog` Type Mismatch (Discord Notification)
**File**: `backend/src/jobs/DailyExportJob.ts` (Line 173)
**Error**: Argument of `{ title... }` is not assignable to `string`.
**Impact**: Discord alerts might fail or send `[Object object]`.
**Cause**: The `sendInfoLog` function expects a message string, but we are passing a rich embed object.
**Solution**: Update `sendInfoLog` signature to accept objects/embeds OR stringify the message.

### 6. Unused Property
**File**: `backend/src/jobs/DailyExportJob.ts` (Line 32)
**Error**: `Property 'exportService' is declared but its value is never read.`
**Impact**: Minor warning.
**Solution**: Remove property if unused, or suppress warning.

---

## 📋 Recommended Action Plan

1.  **Refactor Trigger Script**: Remove `bun:test` dependency and fix import paths.
2.  **Update `DailyExportJob`**: Make `executeDaily` public (it's the main entry point, reasonable to be public).
3.  **Fix Path Imports**: Ensure `trigger-export.ts` uses valid relative paths for pure Bun execution.
4.  **Fix Types**: Install missing types and correct `sendInfoLog` usage.
