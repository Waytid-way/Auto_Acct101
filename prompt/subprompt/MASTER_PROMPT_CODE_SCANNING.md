# 🎯 Master Prompt: Auto-Acct Code Scanning & Categorization (Antigravity IDE)

**Objective:** Scan all scripts in Auto_Acct101 repository, categorize each script by purpose, and generate markdown documentation files for each folder.

**Execution Mode:** Sequential (Step-by-step). Do NOT run all steps at once.

---

## 📋 PHASE 1: DISCOVERY & INVENTORY

### Step 1.1 - Folder Structure Inventory
**Action:**
```bash
bun run list-folders.ts
```

**Script Content:** Generate `list-folders.ts` that outputs:
- All folders containing scripts (root `/scripts`, `/backend/scripts`, `/backend/src/scripts`)
- File count per folder
- Output to `FOLDER_INVENTORY.json`

**Expected Output Format:**
```json
{
  "folders": [
    {
      "path": "scripts/",
      "file_count": 1,
      "files": ["generate-accounting-request-doc.ts"]
    },
    {
      "path": "backend/scripts/",
      "file_count": 2,
      "files": ["test-discord-webhooks.ts", "test-teable.ts"]
    },
    {
      "path": "backend/src/scripts/",
      "file_count": 13,
      "files": ["check-approved-entries.ts", "list-gemini-models.ts", ...]
    }
  ]
}
```

### Step 1.2 - Code Analysis Setup
**Create:** `backend/src/scripts/analyze-scripts.ts` (Bun script)

**Purpose:** Read all scripts and extract metadata
- File path
- First 10 lines (for comments/docstrings)
- Function names and exports
- Dependencies (imports)
- Total lines of code

**Output:** `SCRIPT_METADATA.json` with structured data for each file

---

## 📊 PHASE 2: CATEGORIZATION

### Step 2.1 - Define Script Categories

**Categories (Hierarchical):**

| Category | Subcategory | Examples |
|----------|-------------|----------|
| **TESTING** | API Tests | `test-rest-api.ts`, `test-teable.ts` |
| | Integration Tests | `test-discord-webhooks.ts`, `test-hybrid-logic.ts` |
| | AI/ML Tests | `test-gemini-classification.ts`, `test-groq-classification.ts` |
| | Connectivity Tests | `test-groq-connection.ts` |
| **CONFIGURATION** | Setup Scripts | `setup-teable.ts` |
| | Data Generation | `generate-accounting-request-doc.ts` |
| **MAINTENANCE** | Health Checks | `check-approved-entries.ts` |
| | Queries | `list-gemini-models.ts` |
| | Scheduled Tasks | `sync-flowaccount-cron.ts` |
| **VERIFICATION** | Phase Readiness | `verify-phase3-ready.ts` |

### Step 2.2 - Automated Categorization Script

**Create:** `backend/src/scripts/categorize-scripts.ts` (Bun script)

**Logic:**
1. Read `SCRIPT_METADATA.json`
2. Use filename patterns and function names to infer category
3. Apply rules:
   - Filename starts with `test-` → **TESTING**
   - Filename starts with `setup-` or `generate-` → **CONFIGURATION**
   - Filename starts with `check-` or `list-` → **MAINTENANCE**
   - Filename starts with `verify-` → **VERIFICATION**
   - Contains "cron" → **MAINTENANCE** → Scheduled Tasks

4. Manual override capability (JSON mapping file)
5. Output: `SCRIPT_CATEGORIZATION.json`

**Output Format:**
```json
{
  "scripts": [
    {
      "path": "backend/src/scripts/test-discord-webhooks.ts",
      "category": "TESTING",
      "subcategory": "Integration Tests",
      "purpose": "Validates Discord webhook alerts for accounting events",
      "key_functions": ["testDiscordWebhooks", "sendTestMessage"],
      "dependencies": ["discord.js-alternative", "logger"]
    }
  ]
}
```

---

## 📝 PHASE 3: DOCUMENTATION GENERATION

### Step 3.1 - Create Markdown Templates

**For Each Folder:** Generate `README.md` with structure:

```markdown
# Folder: [Folder Name]
**Purpose:** [High-level description]

## 📂 Contents
- Total Scripts: X
- Categories: [List]
- Last Updated: [Date]

## Scripts

### 1. [Script Name]
**File Path:** `backend/src/scripts/[filename].ts`
**Category:** [TESTING | CONFIGURATION | MAINTENANCE | VERIFICATION]
**Subcategory:** [Specific subcategory]

**Purpose:** [1-2 sentence description]

**Key Functions:**
- `functionName()` - Description
- `functionName2()` - Description

**Dependencies:**
- External: Discord API, Teable API, etc.
- Internal: [Modules used]

**When to Run:**
- Manual: `bun run backend/src/scripts/[filename].ts`
- Automated: [If applicable]

**Expected Output:**
[What the script produces/logs]

**Troubleshooting:**
- Issue 1: Solution
- Issue 2: Solution

---
```

### Step 3.2 - Generate Per-Folder Documentation

**Create:** `backend/src/scripts/generate-docs.ts` (Bun script)

**Actions:**
1. Read `SCRIPT_CATEGORIZATION.json`
2. Group scripts by folder
3. For each folder, generate:
   - **`README.md`** - Main documentation
   - **`USAGE_GUIDE.md`** - How to run each script
   - **`DEPENDENCIES.md`** - Required APIs/Services

**Output Structure:**
```
scripts/
├── README.md
├── USAGE_GUIDE.md
└── DEPENDENCIES.md

backend/scripts/
├── README.md
├── USAGE_GUIDE.md
└── DEPENDENCIES.md

backend/src/scripts/
├── README.md
├── USAGE_GUIDE.md
├── DEPENDENCIES.md
└── SCRIPTS_BY_PHASE.md
```

---

## 🔍 PHASE 4: CODE QUALITY ANALYSIS

### Step 4.1 - Detailed Script Analysis

**Create:** `backend/src/scripts/analyze-script-quality.ts` (Bun script)

**Checks:**
1. Error Handling
   - Try-catch blocks present?
   - Specific error types?
   - Logging errors?

2. TypeScript Quality
   - Any `any` types?
   - Interfaces/DTOs defined?
   - Strict mode compliance?

3. Financial Safety (Auto-Acct specific)
   - Uses integers for money?
   - Transaction handling?
   - Trial balance checks?

4. Performance
   - Database queries optimized?
   - Batch operations used?
   - Rate limiting?

5. Security
   - Credential handling?
   - Input validation?
   - Logging sensitive data?

**Output:** `SCRIPT_QUALITY_REPORT.json`

```json
{
  "script": "test-discord-webhooks.ts",
  "quality_score": 85,
  "checks": {
    "error_handling": { "status": "PASS", "notes": "Good try-catch coverage" },
    "typescript": { "status": "PASS", "notes": "No any types found" },
    "financial_safety": { "status": "N/A", "notes": "Not a financial script" },
    "performance": { "status": "PASS", "notes": "Efficient" },
    "security": { "status": "WARN", "notes": "Webhook URL in logs" }
  },
  "recommendations": ["Remove webhook URL from logs"]
}
```

---

## 🚀 PHASE 5: EXECUTION FLOW

### Recommended Order (for Antigravity):

```
Step 1: Run Phase 1.1 (Inventory)
        ↓
Step 2: Run Phase 1.2 (Metadata Extraction)
        ↓
Step 3: Review & adjust categorization rules
        ↓
Step 4: Run Phase 2.2 (Automated Categorization)
        ↓
Step 5: Manual review of categorization
        ↓
Step 6: Run Phase 3.2 (Generate Documentation)
        ↓
Step 7: Run Phase 4.1 (Quality Analysis)
        ↓
Step 8: Generate Summary Report
```

---

## 📋 BEST PRACTICES FOR ANTIGRAVITY

### 1. **Autonomy Level Setting**
```yaml
autonomy_level: 3  # Execute with confirmation on yellow flags
verbose_logging: true
error_recovery: auto
```

### 2. **Breakpoints & Verification**
- After Step 2: Human reviews categorization
- After Step 4: Human reviews quality issues
- Before Step 6: Approve final documentation structure

### 3. **Error Handling**
- If file not found → Skip & log
- If parse error → Flag & ask for manual review
- If quality issues → Add to recommendations, don't fail

### 4. **Output Management**
- Store all JSON outputs in `backend/ANALYSIS/`
- Keep markdown docs in each folder
- Generate master summary in root: `SCRIPTS_ANALYSIS_SUMMARY.md`

### 5. **Idempotency**
- Re-running should be safe
- Update timestamps, don't duplicate
- Check existing docs before overwriting

---

## 🎯 SUCCESS CRITERIA

- [ ] All scripts categorized correctly (95%+ accuracy)
- [ ] Each folder has README.md with purpose & contents
- [ ] Usage guide for every script
- [ ] Dependencies clearly documented
- [ ] No financial safety violations detected
- [ ] Code quality score generated for each script
- [ ] Summary report generated (1 page)

---

## 📌 CUSTOM INSTRUCTIONS FOR AI

**When running this prompt with Antigravity IDE:**

1. **Verbose Mode:** Log every file processed
2. **Confirmation Points:** Stop at end of each PHASE for human review
3. **Error Strategy:** Skip gracefully, never halt the process
4. **Documentation Quality:** Use markdown properly (tables, lists, code blocks)
5. **Keep It Organized:** Group related outputs together
6. **Be Specific:** Include exact file paths, line numbers, function names
7. **No Guessing:** If purpose unclear, flag for manual review
8. **Security First:** Never log credentials, API keys, or sensitive data

---

## 🔗 RELATED DOCUMENTATION

- [Auto-Acct Architecture](./ARCHITECTURE.md)
- [Financial Rules](./FINANCIAL_RULES.md)
- [Phase Roadmap](./PHASE_3B_DECISION_DOC.md)

---

**Created:** 2026-01-18  
**For Project:** Auto-Acct-001 (Bun-based Zero-Budget Accounting System)  
**Status:** Ready for Antigravity IDE Execution