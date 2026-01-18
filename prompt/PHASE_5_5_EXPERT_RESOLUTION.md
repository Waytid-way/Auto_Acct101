# 🎯 Phase 5.5 Expert Resolution Guide - Manual E2E Blockers

**Status**: 🟡 BLOCKED (6 issues prevent E2E script from running)  
**Date**: 2026-01-18  
**Priority**: P0 (must fix before Task 5.5)  
**Time to Fix**: ~45 minutes  
**Difficulty**: Medium (straightforward fixes)

---

## 📊 BLOCKER SUMMARY

### Critical Blockers (3) - Prevent Script Execution
| # | Issue | File | Impact | Fix Time |
|:--|:------|:-----|:-------|:--------:|
| 1 | `executeDaily` private | DailyExportJob.ts | Script can't call method | 2 min |
| 2 | Module path broken | trigger-export.ts | Script won't load config | 3 min |
| 3 | `bun:test` missing | trigger-export.ts | Compilation fails | 5 min |

### Quality Issues (3) - Code Quality + Type Safety
| # | Issue | File | Impact | Fix Time |
|:--|:------|:-----|:-------|:--------:|
| 4 | `node-cron` types | DailyExportJob.ts | TS compilation error | 3 min |
| 5 | Discord function sig | DailyExportJob.ts | Wrong embed format | 5 min |
| 6 | Unused property | DailyExportJob.ts | Lint warning | 2 min |

**Total Fix Time**: ~20 minutes (implementation) + 10 minutes (testing) = **30 minutes**

---

## 🔴 CRITICAL BLOCKER #1: executeDaily is Private

### Problem

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line 89)
private async executeDaily() {
    // ← PRIVATE = trigger-export.ts can't call this
}

// File: backend/scripts/trigger-export.ts (Line 42)
await job.executeDaily();  // ❌ TypeScript Error
// Error: Property 'executeDaily' is private and only accessible within class
```

### Why It Matters

The manual trigger script needs to **invoke the same logic** as the cron job for E2E testing. Currently blocked because method is private.

### Solution Options

**Option A: Make Method Public (RECOMMENDED)**
```typescript
// File: backend/src/jobs/DailyExportJob.ts

-private async executeDaily() {
+public async executeDaily() {
     // ... implementation ...
 }

// Reasoning:
// ✅ Simple 1-line change
// ✅ Semantically correct (main entry point)
// ✅ Allows both cron and manual testing
// ✅ No breaking changes
```

**Option B: Add Public Wrapper**
```typescript
// File: backend/src/jobs/DailyExportJob.ts

private async executeDaily() {
    // ... implementation ...
}

// Add public method
public async forceRun(): Promise<void> {
    return this.executeDaily();
}

// Then in trigger-export.ts:
await job.forceRun();

// Reasoning:
// ✅ Encapsulates method intent
// ✅ Extra abstraction (less useful here)
// ❌ More code for same result
```

### Recommended Implementation (Option A)

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line ~89)

// BEFORE:
private async executeDaily() {

// AFTER:
public async executeDaily() {
```

**That's it.** One word change.

### Why This is Safe

The method is an internal handler already called by:
- Cron trigger (internal)
- Now also: Manual trigger script (testing)

Making it public is reasonable because:
1. It's the main entry point for the job
2. It follows the pattern of `start()` and `stop()` (already public)
3. Tests might already call it
4. Manual testing is legitimate use case

---

## 🔴 CRITICAL BLOCKER #2: Module Resolution Failed

### Problem

```typescript
// File: backend/scripts/trigger-export.ts (Line 5)
import config from '../src/config';
// ❌ Error: Cannot find module '../src/config' or its corresponding type declarations.
```

### Root Cause

When running via `bun` as standalone script, relative path resolution differs from compiled application.

**Working directory issue**:
```
Project root:        /Users/dev/Auto_Acct101/
Script location:     /Users/dev/Auto_Acct101/backend/scripts/trigger-export.ts
Relative path:       ../src/config (goes up to backend/, then into src/)
Expected path:       ✅ /Users/dev/Auto_Acct101/backend/src/config

But when bun runs from project root:
Script CWD:          /Users/dev/Auto_Acct101/
Relative from root:  scripts/../src/config = src/config (WRONG!)
Expected:            /Users/dev/Auto_Acct101/backend/src/config
```

### Solution Options

**Option A: Use Absolute Path with Bun Alias (RECOMMENDED)**
```typescript
// File: backend/scripts/trigger-export.ts

// BEFORE:
import config from '../src/config';

// AFTER:
import config from '#/config';  // If '@/' alias points to backend/src/

// Requires tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

**Option B: Fix Relative Path (SIMPLER)**
```typescript
// File: backend/scripts/trigger-export.ts

// BEFORE (wrong from this location):
import config from '../src/config';

// AFTER (correct from /backend/scripts/ → /backend/src/):
import config from '../src/config';  // Same path!

// OR use full path (most reliable):
import config from './src/config';  // From /backend/ (when run from there)
import config from '../backend/src/config';  // From project root
```

**Option C: Change Working Directory (NOT RECOMMENDED)**
```bash
# Run from backend/ directory
cd backend
bun scripts/trigger-export.ts
```

### Recommended Implementation (Option A + Fallback to B)

Check if tsconfig already has path aliases:

```bash
# Check tsconfig.json
cat backend/tsconfig.json | grep -A 10 '"paths"'
```

If path alias exists, use it. If not:

```typescript
// File: backend/scripts/trigger-export.ts (Line 5)

// BEFORE:
import config from '../src/config';

// AFTER (verify from script location /backend/scripts/):
import config from '../src/config';  // Goes: scripts/ → .. (backend/) → src/config ✅

// If still broken, use absolute imports:
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../src/config');
// Then use dynamic import if needed
```

### Test Import

```bash
# Quick test from script location
cd backend/scripts
bun -e "import('../src/config').then(c => console.log('✅ Config loaded'))"
```

---

## 🔴 CRITICAL BLOCKER #3: Missing `bun:test` Types

### Problem

```typescript
// File: backend/scripts/trigger-export.ts (Line 15)
import { mock } from 'bun:test';
// ❌ Error: Cannot find module 'bun:test'
```

### Root Cause

`bun:test` is **only available in test environment**, not in regular scripts.

The script is trying to use `mock()` to simulate logger, but this is:
1. Unnecessary in E2E script (we WANT real logging)
2. Not available outside test context
3. Overcomplicates the manual trigger

### Solution (RECOMMENDED)

**Remove `bun:test`, use console.log instead**

```typescript
// File: backend/scripts/trigger-export.ts (Line 15)

// BEFORE:
import { mock } from 'bun:test';

// Mock logger to avoid side effects
const mockLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
};

// AFTER:
// Remove bun:test import entirely
// Use real logger OR simple console

// Option A: Use real logger (better for E2E)
const logger = console;  // ✅ Simple, works everywhere

// Option B: Create stub logger
const logger = {
    info: (msg: string) => console.log('[INFO]', msg),
    error: (msg: string) => console.error('[ERROR]', msg),
    warn: (msg: string) => console.warn('[WARN]', msg),
};

// OR use actual logger from src/utils/logger
import logger from '../src/utils/logger';  // ✅ Real implementation
```

### Why Remove Mocking?

In E2E testing, you **want** side effects:
- ✅ Real database writes
- ✅ Real Google Drive calls
- ✅ Real Discord notifications
- ✅ Real logging to see what happened

Mocking hides problems. E2E should test the **full real flow**.

### Complete Fixed Script (Top Section)

```typescript
// File: backend/scripts/trigger-export.ts

#!/usr/bin/env bun

import { DailyExportJob } from '../src/jobs/DailyExportJob';
import { ExportQueueModel } from '../src/models/ExportQueue';
import { ExportLogModel } from '../src/models/ExportLog';
import config from '../src/config';
import logger from '../src/utils/logger';  // ✅ Real logger
import { connectDB } from '../src/utils/database';

// ✅ NO bun:test import needed
// ✅ NO mock() calls

async function main() {
    console.log('🚀 Starting Manual E2E Trigger...');
    
    try {
        // Connect to MongoDB
        await connectDB(config.mongoUri);
        console.log('✅ Connected to MongoDB');
        
        // Initialize job
        const job = new DailyExportJob();
        console.log('✅ Job initialized');
        
        // Run the export (now public!)
        const result = await job.executeDaily();  // ✅ Now works!
        console.log('✅ Export completed');
        console.log('Result:', result);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
```

---

## ⚠️ QUALITY ISSUE #4: `node-cron` Type Namespace

### Problem

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line 27)
import cron from 'node-cron';

cron.schedule('0 18 * * *', () => {
    // ...
});

// ❌ Error: Cannot find namespace 'cron'.
```

### Root Cause

TypeScript can't find type definitions for `node-cron`. Either:
1. Package not installed
2. Types package not installed (`@types/node-cron`)
3. Import/usage doesn't match available types

### Solution

**Option A: Install Types (Recommended)**
```bash
bun add -D @types/node-cron
```

**Option B: Use Correct Import**
```typescript
// BEFORE (might be wrong):
import cron from 'node-cron';

// AFTER (explicit named import):
import * as cron from 'node-cron';
// OR
import { schedule } from 'node-cron';

cron.schedule('0 18 * * *', () => {});
// OR
schedule('0 18 * * *', () => {});
```

**Option C: Suppress Error (Not Recommended)**
```typescript
// @ts-ignore
import cron from 'node-cron';
```

### Implementation Steps

```bash
# Step 1: Check if installed
bun ls | grep node-cron
# Expected: node-cron@X.X.X

# Step 2: Install types if missing
bun add -D @types/node-cron

# Step 3: Check import in file
grep "import.*cron" backend/src/jobs/DailyExportJob.ts

# Step 4: Verify type check passes
bun tsc --noEmit
# Should show: 0 errors ✅
```

---

## ⚠️ QUALITY ISSUE #5: Discord Function Signature Mismatch

### Problem

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line 173)

// sendInfoLog expects a string
sendInfoLog('Export completed');  // ✅ Works

// But we're passing an object
await sendInfoLog({
    title: 'Daily Export Complete',
    fields: [
        { name: 'Entries', value: '100' }
    ]
});
// ❌ Error: Argument of type '{ title... }' is not assignable to type 'string'
```

### Root Cause

Mismatch between:
- What we're sending: Rich embed object (Discord format)
- What function expects: String message

### Solution Options

**Option A: Fix Function Signature (RECOMMENDED)**

```typescript
// File: backend/src/utils/discord.ts

// BEFORE:
export async function sendInfoLog(message: string): Promise<void> {
    // Send to Discord webhook
}

// AFTER:
interface DiscordEmbed {
    title?: string;
    description?: string;
    fields?: Array<{ name: string; value: string }>;
    color?: number;
}

export async function sendInfoLog(
    message: string | DiscordEmbed
): Promise<void> {
    const payload = typeof message === 'string'
        ? { content: message }
        : { embeds: [message] };
    
    // Send to Discord webhook
    await sendWebhook(payload);
}
```

**Option B: Stringify Before Calling**

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line 173)

// BEFORE:
await sendInfoLog({
    title: 'Daily Export Complete',
    fields: [...]
});

// AFTER:
const message = `✅ Daily Export Complete\n📊 Entries: 100\n⏱️ Time: 2.5s`;
await sendInfoLog(message);
```

**Option C: Create Wrapper Function**

```typescript
// File: backend/src/jobs/DailyExportJob.ts

// Add helper method
private async logExportComplete(entryCount: number, duration: number) {
    const message = `✅ Daily Export Complete\n📊 Entries: ${entryCount}\n⏱️ Time: ${duration}s`;
    await sendInfoLog(message);
}

// Then call:
await this.logExportComplete(100, 2.5);
```

### Recommended Implementation (Option A)

This allows both string and rich embed format, which is most flexible.

**Implementation Steps**:

```typescript
// File: backend/src/utils/discord.ts

// 1. Add interface at top
interface DiscordEmbed {
    title?: string;
    description?: string;
    fields?: Array<{ name: string; value: string }>;
    color?: number;
    timestamp?: string;
}

// 2. Update function signature
export async function sendInfoLog(
    message: string | DiscordEmbed
): Promise<void> {
    // 3. Handle both types
    let payload: any;
    
    if (typeof message === 'string') {
        payload = { content: message };
    } else {
        payload = { embeds: [message] };
    }
    
    // 4. Send via webhook
    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`);
    }
}
```

---

## ⚠️ QUALITY ISSUE #6: Unused Property

### Problem

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line 32)

export class DailyExportJob {
    private exportService: ExportService;  // ← Never used
    // ...
}

// ⚠️ Warning: Property 'exportService' is declared but its value is never read
```

### Root Cause

Property declared in constructor but never referenced in code.

### Solution Options

**Option A: Remove If Not Needed (RECOMMENDED)**
```typescript
// BEFORE:
export class DailyExportJob {
    private exportService: ExportService;  // ← Delete this line
    
    constructor(
        private exportQueueModel: typeof ExportQueueModel,
        exportService: ExportService  // ← Delete this param
    ) {}
}

// AFTER:
export class DailyExportJob {
    constructor(
        private exportQueueModel: typeof ExportQueueModel
    ) {}
}
```

**Option B: Keep If Future Use (Add Comment)**
```typescript
// Add JSDoc comment explaining future use
/**
 * ExportService reserved for Phase 5.6 - Custom export formats
 * @deprecated Not used in Phase 5.5, will be used in Phase 5.6
 */
private exportService: ExportService;
```

**Option C: Suppress Warning**
```typescript
// Add ESLint comment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
private exportService: ExportService;
```

### Recommended Implementation (Option A)

If it's genuinely not used and won't be in Phase 5.5, remove it.

```typescript
// File: backend/src/jobs/DailyExportJob.ts (Line 32)

// BEFORE:
constructor(
    private exportQueueModel: typeof ExportQueueModel,
    private exportService: ExportService  // ← Remove
) {}

// AFTER:
constructor(
    private exportQueueModel: typeof ExportQueueModel
) {}

// Remove the property declaration (Line ~10)
private exportService: ExportService;  // ← Delete this too
```

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Critical Blockers (Fix in Order)

- [ ] **Blocker #1** (2 min)
  - [ ] Open `backend/src/jobs/DailyExportJob.ts`
  - [ ] Find line with `private async executeDaily()`
  - [ ] Change `private` → `public`
  - [ ] Save

- [ ] **Blocker #2** (3 min)
  - [ ] Open `backend/scripts/trigger-export.ts`
  - [ ] Check import path: `import config from '../src/config';`
  - [ ] Verify file exists: `ls backend/src/config.ts`
  - [ ] If error persists, check tsconfig path aliases
  - [ ] Test: `bun -e "import('../src/config')"`

- [ ] **Blocker #3** (5 min)
  - [ ] Open `backend/scripts/trigger-export.ts`
  - [ ] Remove line: `import { mock } from 'bun:test';`
  - [ ] Remove all `mock(...)` calls
  - [ ] Add: `import logger from '../src/utils/logger';` (if available)
  - [ ] OR use: `const logger = console;`

### Quality Issues (Fix in Order)

- [ ] **Issue #4** (3 min)
  - [ ] Run: `bun add -D @types/node-cron`
  - [ ] Run: `bun tsc --noEmit`
  - [ ] Verify: 0 errors

- [ ] **Issue #5** (5 min)
  - [ ] Open `backend/src/utils/discord.ts`
  - [ ] Update `sendInfoLog` signature to accept `string | DiscordEmbed`
  - [ ] Add `DiscordEmbed` interface
  - [ ] Handle both types in function body

- [ ] **Issue #6** (2 min)
  - [ ] Open `backend/src/jobs/DailyExportJob.ts`
  - [ ] Remove `private exportService: ExportService;` declaration
  - [ ] Remove from constructor parameters
  - [ ] Save

### Final Verification

- [ ] Run type check: `bun tsc --noEmit`
  - [ ] Expected: 0 errors ✅
  - [ ] Expected: 0 critical warnings ✅

- [ ] Run lint: `bun run lint`
  - [ ] Expected: 0 errors ✅
  - [ ] Expected: 0 critical warnings ✅

- [ ] Test script: `bun backend/scripts/trigger-export.ts`
  - [ ] Expected: Compiles without errors ✅
  - [ ] Expected: Connects to MongoDB ✅
  - [ ] Expected: Initializes job ✅
  - [ ] Expected: Executes export (or fails gracefully) ✅

---

## 📝 DETAILED FIX GUIDE (Step by Step)

### Fix #1: Make executeDaily Public

**File**: `backend/src/jobs/DailyExportJob.ts`

**Find** (around line 89):
```typescript
private async executeDaily() {
    // ...
}
```

**Replace with**:
```typescript
public async executeDaily() {
    // ...
}
```

**Verify**:
```bash
# Check the change
grep -n "public async executeDaily" backend/src/jobs/DailyExportJob.ts
# Should show: 89:public async executeDaily(
```

---

### Fix #2: Verify Import Path

**File**: `backend/scripts/trigger-export.ts`

**Current** (line 5):
```typescript
import config from '../src/config';
```

**Verify it exists**:
```bash
ls -la backend/src/config.ts
# Should output: backend/src/config.ts (file exists)

# Or check what exists:
ls backend/src/ | grep -i config
# Should show: config.ts or config/
```

**If file is in folder**:
```typescript
// Change to:
import config from '../src/config/index';  // if folder
// OR
import config from '../src/config.ts';  // explicit extension
```

**Test import**:
```bash
cd backend
bun -e "import('./src/config').then(c => console.log('✅ Loaded')).catch(e => console.error('❌', e.message))"
```

---

### Fix #3: Remove bun:test

**File**: `backend/scripts/trigger-export.ts`

**Step 1**: Remove the import
```typescript
// DELETE this line:
import { mock } from 'bun:test';
```

**Step 2**: Remove mock usages
```typescript
// Search for and DELETE all of these:
mock(() => {})
mockLogger
// ... any other mock() calls
```

**Step 3**: Replace with real logger
```typescript
// Add near top of file:
import logger from '../src/utils/logger';

// OR if logger doesn't exist:
const logger = {
    info: (msg: string, meta?: any) => console.log('[INFO]', msg, meta ?? ''),
    error: (msg: string, err?: any) => console.error('[ERROR]', msg, err ?? ''),
    warn: (msg: string, meta?: any) => console.warn('[WARN]', msg, meta ?? ''),
    debug: (msg: string, meta?: any) => console.log('[DEBUG]', msg, meta ?? ''),
};
```

**Step 4**: Test compile
```bash
bun --compile --target bun backend/scripts/trigger-export.ts
# Should show: 0 errors
```

---

### Fix #4: Install node-cron Types

```bash
# Install types
bun add -D @types/node-cron

# Verify
bun ls | grep node-cron

# Run type check
bun tsc --noEmit
# Should show: 0 errors (or show this specific error is gone)
```

---

### Fix #5: Update Discord Function

**File**: `backend/src/utils/discord.ts`

**Add interface** (near top):
```typescript
interface DiscordEmbed {
    title?: string;
    description?: string;
    fields?: Array<{ name: string; value: string }>;
    color?: number;
}

export interface DiscordMessage {
    content?: string;
    embeds?: DiscordEmbed[];
}
```

**Update function signature**:
```typescript
// BEFORE:
export async function sendInfoLog(message: string): Promise<void> {

// AFTER:
export async function sendInfoLog(
    message: string | DiscordEmbed
): Promise<void> {
    let payload: DiscordMessage;
    
    if (typeof message === 'string') {
        payload = { content: message };
    } else {
        payload = { embeds: [message] };
    }
    
    // Send to webhook...
}
```

---

### Fix #6: Remove Unused Property

**File**: `backend/src/jobs/DailyExportJob.ts`

**Find** (around line 32):
```typescript
private exportService: ExportService;
```

**Delete this line.**

**Find constructor** (around line 40-50):
```typescript
constructor(
    private exportQueueModel: typeof ExportQueueModel,
    exportService: ExportService  // ← Remove this param
) {
    // ...
}
```

**Remove the parameter.**

**Verify**:
```bash
grep -n "exportService" backend/src/jobs/DailyExportJob.ts
# Should output: (empty, no matches)
```

---

## ✅ VERIFICATION TESTS

### Test 1: Type Check
```bash
bun tsc --noEmit

# BEFORE:
# error TS2339: Property 'executeDaily' is private...
# error TS2307: Cannot find module 'bun:test'...
# error TS7017: Cannot find namespace 'cron'...
# (6 errors total)

# AFTER:
# (0 errors)
# ✅ PASS
```

### Test 2: Lint
```bash
bun run lint

# BEFORE:
# warning: unused property 'exportService'
# warning: argument not assignable to string

# AFTER:
# (0 errors, 0 critical warnings)
# ✅ PASS
```

### Test 3: Script Compilation
```bash
bun --compile --target bun backend/scripts/trigger-export.ts

# BEFORE:
# ❌ Compilation failed

# AFTER:
# ✅ trigger-export (executable created)
```

### Test 4: Script Execution (With Real Data)
```bash
bun backend/scripts/trigger-export.ts

# EXPECTED OUTPUT:
# 🚀 Starting Manual E2E Trigger...
# ✅ Connected to MongoDB
# ✅ Job initialized
# ✅ Export completed
# Result: { entriesProcessed: X, csvGenerated: true, ... }

# EXPECTED SIDE EFFECTS:
# ✅ MongoDB: ExportLog entry created
# ✅ Google Drive: CSV file uploaded
# ✅ Discord: Notification sent (if configured)
# ✅ stdout: All logs printed
```

---

## 🚀 READY TO IMPLEMENT!

### Quick Reference

| Issue | File | Fix | Time |
|:------|:-----|:----|:----:|
| Blocker 1 | DailyExportJob.ts | `private` → `public` | 1 min |
| Blocker 2 | trigger-export.ts | Verify path `../src/config` | 2 min |
| Blocker 3 | trigger-export.ts | Remove `bun:test` | 3 min |
| Issue 4 | DailyExportJob.ts | `bun add -D @types/node-cron` | 3 min |
| Issue 5 | discord.ts | Update `sendInfoLog` signature | 5 min |
| Issue 6 | DailyExportJob.ts | Remove `exportService` | 2 min |

**Total**: ~16 minutes implementation + ~4 minutes testing = **20 minutes**

---

## 🎯 SUCCESS CRITERIA

After all fixes:

```bash
# 1. Type check passes
bun tsc --noEmit
# ✅ 0 errors

# 2. Lint passes
bun run lint
# ✅ 0 critical errors

# 3. Script compiles
bun --compile backend/scripts/trigger-export.ts
# ✅ Binary created

# 4. Script runs
bun backend/scripts/trigger-export.ts
# ✅ Connects to DB
# ✅ Executes export
# ✅ Completes or fails with clear error

# 5. All tests still pass
bun test backend/tests/
# ✅ 14/14 passing (unchanged from before)
```

---

## 📊 IMPACT ANALYSIS

### Before Fixes
```
Status: 🔴 BLOCKED (script won't compile)
Errors: 6 (3 critical + 3 quality)
E2E:    ❌ Cannot start
Score:  65/100
```

### After Fixes
```
Status: 🟢 READY (script compiles and runs)
Errors: 0 (all fixed)
E2E:    ✅ Can test manual export
Score:  75/100 → 85/100 (Task 5.5 unblocked)
```

---

## 🎓 KEY LEARNINGS

### Design Pattern: Method Visibility
- **Private**: For internal-only methods
- **Public**: For entry points or external access
- **executeDaily()**: Main job entry point → should be **public** for testing

### Module Resolution
- Be mindful of relative paths and CWD
- Prefer path aliases (`#/config`) over relative (`../src/`)
- Always test imports before relying on them

### Type Safety
- `bun:test` is test-only, not available in regular scripts
- Always prefer real implementations over mocks in E2E
- Side effects are WANTED in E2E testing

### Error Handling
- Specific error codes (Discord 11000) make debugging easier
- Provide helpful messages when operations fail
- Log enough context to reproduce issues

---

**Ready to fix these blockers and get E2E testing started!** 🚀

All fixes are straightforward and low-risk. Once complete, Phase 5.5 can proceed immediately.

**Estimated time to completion**: ~20 minutes implementation + testing

**Next step**: Start with Blocker #1 (1-minute fix)
