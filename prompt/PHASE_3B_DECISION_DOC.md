# 🎯 AUTO-ACCT-001: PHASE 3B STRATEGIC DECISION DOCUMENT
## Pre-Data Phase Workstream Planning & Implementation Roadmap

**Document Type:** Kickoff Brief + Reference Guide + Sprint Planning  
**Scope:** All 6 Workstreams (OCR, Testing, DevOps, Documentation, UI/UX, Security)  
**Target Audience:** Dev Team + Antigravity IDE Context  
**Timeline:** Jan 17-19 (Before Financial Data Arrival)  
**Decision Framework:** Comparative Analysis + Risk Matrix + Architectural Alignment  
**Last Updated:** 2026-01-17 18:33 UTC+7

---

## EXECUTIVE SUMMARY

**Current State:**
- ✅ Phase 1: Financial Foundation (Double-Entry, MongoDB Replica Set, API Health)
- ✅ Phase 2: FlowAccount Integration (OAuth, CSV Export, Data Sync)
- ✅ Phase 3A: AI Classification (Groq Llama 3.3 70B, 97.7% confidence, 12 Thai categories)
- ⏳ Phase 3B: OCR Integration (Awaiting 10-20 receipt samples from Accounting Team)

**Strategic Context:**
Auto-Acct-001 operates under **ZERO-BUDGET** constraints with strict **Financial Integrity** requirements. The pre-data phase (Jan 17-19) provides a critical window to optimize non-dependent workstreams and prepare infrastructure before real financial data arrives.

**Recommendation Summary:**
- **OCR:** Hybrid PaddleOCR (primary) + Google Vision API Free Tier (fallback) - 88-94% Thai accuracy
- **Testing:** Expand to 85%+ coverage with focus on FloatPoint edge cases & OAuth failures
- **DevOps:** Implement GitHub Actions CI/CD + MongoDB backups + Docker Compose optimization
- **Documentation:** API Reference + Architecture Diagrams + OCR Integration Guide
- **UI/UX:** Prioritize Receipt Upload + Review Dashboard (blocks ML pipeline validation)
- **Security:** Implement rate limiting + input validation + Google Drive hybrid encryption

**Risk Assessment:** Medium-Low (all decisions align with zero-budget principle; no external dependencies pre-data)

---

## PART 1: CONTEXT & CONSTRAINTS

### 1.1 Project Constraints (Non-Negotiable)

| Constraint | Impact | Our Approach |
|-----------|--------|-------------|
| **Zero Budget** | No paid cloud services until production scale | Use free tiers + self-hosted (PaddleOCR, EasyOCR) + MongoDB community |
| **Financial Accuracy (Golden Rule)** | All transactions must be ACID-compliant | All OCR/ML output = draft only; human verification mandatory |
| **Thai Language** | OCR must handle mixed Thai-English receipts | PaddleOCR (SOTA for CJK) + EasyOCR fallback |
| **Bun + TypeScript** | Runtime & language non-negotiable | All code: strict TS, Bun-first commands |
| **Self-Hosted** | No external SaaS dependency for core ops | Docker Compose + local MongoDB + service accounts (Drive, Discord) |
| **48-Hour Window** | Data arrives Monday morning | **Deadline: Jan 19 (11:59 PM) for all prep** |

### 1.2 Technical Debt & Opportunity Map

**From Phase Reports:**
- Phase 1 ✅: Financial ledger is production-ready; no debt
- Phase 2 ✅: FlowAccount OAuth fully validated; edge case coverage at 88%
- Phase 3A ✅: Groq classification pipeline stable; 3-tier Discord alerts implemented

**Pre-Data Opportunities:**
- 🟡 Testing coverage: 65% → Target 85% (floating-point errors, OAuth failure modes)
- 🟡 DevOps: Manual deploy → GitHub Actions CI/CD pipeline
- 🟡 Monitoring: Basic logging → Winston + Sentry (free tier)
- 🟡 Documentation: Prompt files scattered → Organized docs/ structure
- 🟡 UI: Zero frontend for receipt flow → Teable + basic Next.js dashboard
- 🟡 Security: No rate limiting or hybrid encryption → Implement both

---

## PART 2: COMPARATIVE ANALYSIS BY WORKSTREAM

### WORKSTREAM 1: OCR INTEGRATION

#### Option A: PaddleOCR (Self-Hosted, Python)
**Characteristics:**
- **Cost:** $0 (open-source)
- **Thai Accuracy:** 88-94% (SOTA for CJK + mixed scripts)
- **Setup Complexity:** Medium (Python 3.10+, ~500MB models)
- **Processing Speed:** 1-2 sec/image on CPU
- **Deployment:** Docker container (isolated from Bun backend)
- **Hallucination Risk:** Low (traditional ML, not LLM)

**Pros:**
- Best accuracy for Thai receipts (comparative: EasyOCR 85-92%, Tesseract 75-85%)
- Table structure detection + handwriting support
- No API rate limits or data retention concerns
- Offline-capable (GDPR-compliant)

**Cons:**
- Requires Python environment + dependencies management
- Higher memory footprint (~2GB during inference)
- Longer initial setup vs cloud APIs

---

#### Option B: EasyOCR (Python Alternative)
**Characteristics:**
- **Cost:** $0 (open-source, PyTorch-based)
- **Thai Accuracy:** 85-92%
- **Setup Complexity:** Low (pip install easycr)
- **Processing Speed:** 0.5-1.5 sec/image on CPU
- **Hallucination Risk:** Medium (neural network)

**Pros:**
- Simpler installation than PaddleOCR
- Good balance of accuracy & speed
- Extensive language support

**Cons:**
- Lower accuracy for Thai than PaddleOCR
- Less robust for table/receipt structure
- Higher false-positive rate on poor image quality

---

#### Option C: Google Vision API (Cloud-Based)
**Characteristics:**
- **Cost:** $1.50/1K images; Free tier: 1K/month
- **Thai Accuracy:** 95-98%
- **Setup Complexity:** Low (REST API)
- **Processing Speed:** 1-2 sec (network latency)
- **Deployment:** Managed by Google

**Pros:**
- Highest accuracy (commercial-grade)
- Automatic rotation + quality detection
- Built-in table extraction

**Cons:**
- Monthly quota: 1K images only (insufficient for production)
- Cloud dependency (fails if offline/API down)
- Data residency concerns (Thailand regulations)
- Cost scales quickly ($1.50 × 10K receipts/month = $15/month baseline)

---

#### Option D: AWS Textract
**Characteristics:**
- **Cost:** $1.50/1K pages; No free tier
- **Thai Accuracy:** 90-95%
- **Setup Complexity:** Medium (SDK)

**Cons:**
- **Violates zero-budget principle**
- Overkill for receipt extraction (not forms-focused)
- No free tier

---

#### 🎯 RECOMMENDED DECISION: Hybrid PaddleOCR + Google Vision Fallback

**Implementation Strategy:**
```
Receipt Upload (image)
    ↓
[1] Preprocess: normalize size, grayscale, contrast enhance
    ↓
[2] Primary: PaddleOCR (Python worker, async)
    ↓
If confidence >= 0.85:
  ✅ Use PaddleOCR result → Groq classification (Phase 3A)
  
Else if confidence < 0.85:
  [3] Fallback: Google Vision API (within free tier)
  ✅ Use Google result → Groq classification
  
Else if Google API fails:
  ⚠️ Create manual review task in Teable
  → Human verification required before posting
```

**Justification:**
- ✅ Aligns with zero-budget (99% free tiers)
- ✅ Thai language optimized (PaddleOCR best-in-class)
- ✅ Handles edge cases (Google as safety net)
- ✅ Self-hosted primary = offline capability
- ✅ Financial accuracy (all outputs = draft; human approval mandatory)

**Risk Matrix: OCR Integration**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **PaddleOCR accuracy < 80% on Thai mixed-script** | Medium | High | Pre-training with accounting team's 20 samples; fallback to Google Vision |
| **Google Vision free tier exhausted** | Low | Medium | Implement quota monitoring + alert Discord; fallback to manual review queue |
| **Python worker crashes during peak load** | Low | Medium | Docker health checks + auto-restart + fallback to cloud API |
| **Memory bloat (PaddleOCR 2GB+)** | Medium | Medium | Use lightweight model variant + stream processing + Docker resource limits |
| **Hallucination: OCR reads phantom amounts** | Low | Critical | **Cannot fail** - all amounts must pass through Double-Entry validation + human review before posting |

---

### WORKSTREAM 2: TESTING & QUALITY ASSURANCE

#### Current State:
- Test coverage: **65%** (Phase 2 OAuth validated; Phase 3A Groq integration tested)
- Testing framework: **Bun Test** (primary) + Jest (legacy compatibility)
- Major gaps: FloatPoint edge cases, OAuth failure scenarios, Teable webhook retries

#### 🎯 RECOMMENDED DECISION: Bun Test Expansion (85% Target)

**Target Coverage Areas:**
1. **Financial Integrity (Critical)**
   - Plug Method split calculation: 0-5000 + 50 edge cases
   - Trial Balance validation after every transaction
   - Currency conversion edge cases (THB ↔ USD)
   - Negative balance scenarios

2. **OAuth Failure Scenarios**
   - Token expiration mid-sync
   - Network timeout (retry logic)
   - Invalid credentials (graceful degradation)
   - Concurrent refresh attempts

3. **OCR Pipeline** (new)
   - Confidence score thresholds
   - Google Vision fallback trigger
   - Image preprocessing edge cases (rotated, low-contrast)
   - Malformed JSON from Python worker

4. **Teable Webhook Reliability**
   - Duplicate webhook delivery (idempotency)
   - Out-of-order event processing
   - Missing required fields (validation)
   - Retry exponential backoff

**Commands:**
```bash
# Run Bun tests
bun test

# Generate coverage report
bun test --coverage

# Watch mode
bun test --watch
```

---

### WORKSTREAM 3: INFRASTRUCTURE & DEVOPS

#### 🎯 RECOMMENDED DECISION: GitHub Actions + Docker Compose Optimization + MongoDB Backup

**Pipeline Architecture:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test --coverage
      - run: bun run lint
  
  docker:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: waytid-way/auto-acct-001:latest
```

**MongoDB Backup Strategy:**
```bash
# Daily backup to Google Drive (via service account)
0 2 * * * mongodump --uri mongodb://localhost:27017 --archive | \
  gsutil cp - gs://auto-acct-backups/mongodb-$(date +\%Y\%m\%d).archive
```

**DevOps Checklist:**
- [ ] GitHub Actions workflow file created
- [ ] Branch protection: require passing tests before merge
- [ ] MongoDB backup script + cron scheduler
- [ ] Environment secrets: SERVICE_ACCOUNT_KEY, GROQ_API_KEY, TEABLE_API_KEY
- [ ] Docker layer caching optimized
- [ ] Health check endpoints for all services

---

### WORKSTREAM 4: DOCUMENTATION

#### 🎯 RECOMMENDED DECISION: Comprehensive Suite + Antigravity Context

**File Structure:**
```
docs/
├── README.md                      # Documentation index
├── API_REFERENCE.md               # OpenAPI 3.0 spec
├── ARCHITECTURE.md                # C4 diagrams (text + Mermaid)
├── INTEGRATIONS/
│   ├── flowaccount.md            # Phase 2 reference
│   ├── groq-classification.md    # Phase 3A reference
│   ├── ocr-pipeline.md           # Phase 3B detailed guide
│   ├── teable-webhook.md         # Webhook reference
│   └── google-drive.md           # Storage reference
├── DEVELOPER_RUNBOOK.md          # Common tasks
├── ANTIGRAVITY_CONTEXT.md        # AI agent guidelines (CRITICAL)
└── diagrams/
    ├── architecture.png
    ├── data-flow.png
    └── deployment.png
```

**Antigravity Context Document Sections:**
- Golden Rules (inviolable financial integrity constraints)
- Architecture patterns (Repository, Error handling, Security)
- Common AI mistakes to avoid
- 50+ usage examples + anti-patterns
- Bun command precedence

---

### WORKSTREAM 5: UI/UX DEVELOPMENT

#### 🎯 RECOMMENDED DECISION: Next.js + Tailwind (Phased)

**Phase 3B Scope (MVP):**
- Receipt upload page
- OCR preview (raw text)
- Manual review queue
- Approve/Reject buttons

**Post-Data Enhancement:**
- Category analytics
- Vendor dashboard
- Monthly reports export

---

### WORKSTREAM 6: SECURITY & PERFORMANCE

#### 🎯 RECOMMENDED DECISION: Production-Grade Security + Performance

**Scope:**
1. **Rate Limiting** (express-rate-limit)
2. **Hybrid File Encryption** (AES-256-GCM for sensitive files)
3. **Input Validation** (file size, MIME type, OCR text sanitization)
4. **Database Query Optimization** (indexes, query profiling)

---

## PART 3: SPRINT PLANNING & TASK BREAKDOWN

### Sprint Timeline: Jan 17-19, 2026

**DAY 1 (Friday): Foundation Setup** — 7 hours
- PaddleOCR environment setup
- Image preprocessing pipeline
- GitHub Actions CI/CD pipeline
- MongoDB backup automation

**DAY 2 (Saturday): Core Implementation** — 14.5 hours
- Expand Bun test suite to 85% coverage
- Next.js project setup + Receipt upload UI
- API reference documentation
- Architecture diagrams

**DAY 3 (Sunday): Polish & Documentation** — 13.5 hours
- Rate limiting + hybrid encryption
- Database query optimization
- Review dashboard UI
- OCR integration guide + Antigravity Context

**Total Effort:** ~35 hours (3-5 person team)

---

## PART 4: RISK MATRIX (CONSOLIDATED)

### Critical Risks (P0)

| Risk | Workstream | Probability | Impact | Mitigation | Owner |
|------|-----------|------------|--------|-----------|-------|
| **Floating-point error causes incorrect posting** | Testing | Low | Critical | 500+ edge case tests + property-based testing | QA |
| **MongoDB data loss (no backup)** | DevOps | Low | Critical | Daily backup to Google Drive + restore testing | DevOps |
| **OCR hallucination reads phantom amounts** | OCR | Low | Critical | All amounts must pass Double-Entry validation + human review | Dev |
| **Encryption key exposed in code** | Security | Low | Critical | GitHub Secrets; audit quarterly | DevOps |

### High Risks (P1)

| Risk | Workstream | Probability | Impact | Mitigation | Owner |
|------|-----------|------------|--------|-----------|-------|
| **PaddleOCR accuracy < 80% on Thai mixed-script** | OCR | Medium | High | Pre-training with 20 samples; Google Vision fallback | Dev |
| **OAuth token refresh fails during batch sync** | Testing | Medium | High | Mock FlowAccount API failures; exponential backoff tests | QA |
| **Database query timeouts on large datasets** | Security | Medium | High | Compound indexes; query plan monitoring | DevOps |

---

## PART 5: IMPLEMENTATION NOTES FOR ANTIGRAVITY IDE

### Critical Context for AI Agents

**Golden Rules (INVIOLABLE):**
1. **All money = integers** (satang/cents). Never use floats. Validate before every calculation.
2. **Double-Entry principle:** Every transaction must have Dr == Cr. Check before posting.
3. **OCR output = draft only.** Never auto-post OCR results. Require human approval.
4. **Immutability:** Never DELETE posted transactions. Use Void/Reversal entries instead.
5. **ACID transactions:** Wrap all ledger writes with MongoDB sessions + commit/abort logic.

**Command Precedence:**
- Always use `bun` (never `npm`, `node`, `yarn`)
- Example: `bun add express` not `npm install express`
- Run tests: `bun test` not `npm test`

**Common Mistakes to Avoid:**
- ❌ `const total = 100 / 3` (floating-point)
- ✅ `const [a, b, c] = plugMethod(100, 3)` // [34, 33, 33]
- ❌ `await ledger.delete(transactionId)` (immutability)
- ✅ `await ledger.createReversal(transactionId)` (Void entry)
- ❌ Auto-post OCR results without human review
- ✅ Create draft in Teable; wait for human approval

---

## PART 6: SIGN-OFF

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Next Milestone:** Data arrives Jan 20 → Phase 3B real-world testing begins

**Approval Authority:** Dev Lead + Project Sponsor
