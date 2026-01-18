# 📑 Auto-Acct Code Audit Report (Final)

**Date:** 2026-01-18
**Total Scripts:** 47
**Total Lines of Code:** 4065
**Overall Quality Score:** 91/100

## 1. 🏗️ Architecture Overview

### Distribution by Category
| Category | Scripts | % of Codebase |
|:---|:---:|:---:|
| VERIFICATION | 4 | 9% |
| TESTING | 17 | 36% |
| MAINTENANCE | 16 | 34% |
| CONFIGURATION | 10 | 21% |

### Folder Structure
- **scripts**: 0 files
- **backend/scripts**: 0 files
- **backend/src/scripts**: 3 files
- **backend/src/scripts/testing**: 18 files
- **backend/src/scripts/maintenance**: 11 files
- **backend/src/scripts/setup**: 8 files
- **backend/src/scripts/tools**: 5 files
- **backend/src/scripts/legacy**: 2 files

## 2. 🛡️ Quality Assurance

### Key Metrics
- **Perfect Scripts (100/100):** 19
- **Scripts Needing Review (<70):** 0

### ⚠️ Top 5 Refactoring Candidates
These scripts have the lowest quality scores and should be prioritized for refactoring.

| Score | Script | Key Issues |
|:---:|:---|:---|
| **80** | `generate-accounting-request-doc.ts` | Missing error handling |
| **80** | `check-queue.ts` | Missing error handling |
| **80** | `clear-queue.ts` | Missing error handling |
| **85** | `add-drcr-columns.ts` | Found 1 usage(s) of 'any'. |
| **85** | `add-export-path-column.ts` | Found 1 usage(s) of 'any'. |

## 3. 🔍 Detailed Inventory & Analysis

### 📦 Dependencies
- **External Packages:** 16 unique packages used.
- **Internal Modules:** 17 internal import paths.

### Full Script List
See [SCRIPT_CATEGORIZATION.json](backend/ANALYSIS/SCRIPT_CATEGORIZATION.json) for raw data.

---
**Report Generated via Auto-Acct Code Scanner**
