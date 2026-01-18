# ADR-001: Google Drive Authentication Strategy for Auto-Acct-001

**Date**: 2026-01-18  
**Status**: ✅ ACCEPTED  
**Decision**: Use User OAuth (Solution 2) temporarily, migrate to Service Account + Shared Drive (Solution 1) in future  
**Deciders**: Product Owner, Engineering Team  
**Consulted**: Expert Team (Root Cause Analysis)

---

## Context

Auto-Acct-001's Daily Export Job needs to upload CSV files to Google Drive automatically. During Phase 5.5 E2E testing, we encountered a fundamental limitation:

**Problem**: Service Accounts have 0GB storage quota and cannot upload to Personal Google Drive folders, even with Editor permissions [web:40].

**Root Cause**: Google Drive enforces two independent systems:
1. **Authorization** (permissions) - ✅ Working
2. **Quota** (storage space) - ❌ Service Accounts have 0GB by design

This architectural limitation forced us to choose between two authentication strategies.

---

## Decision Drivers

### Business Constraints
- **Budget**: Zero-budget project, cannot purchase Google Workspace immediately
- **Timeline**: Need working solution for Phase 5 completion (Jan 18, 2026)
- **Scale**: Currently single-tenant (one company), may expand to multi-tenant later

### Technical Constraints
- **Current Implementation**: Service Account authentication already coded
- **Infrastructure**: Personal Gmail account (no Shared Drive access)
- **Existing Code**: GoogleDriveService.ts designed for Service Accounts

### Quality Requirements
- Must complete Phase 5 testing this week
- Must not compromise security
- Must be maintainable long-term
- Migration path to production-grade solution must be clear

---

## Options Considered

### Option 1: Service Account + Shared Drive (PRODUCTION-READY)
**Description**: Use Google Workspace Business Standard+ with Shared Drives

**Pros**:
- ✅ Best practice per Google Cloud documentation [web:57]
- ✅ No token refresh/expiration issues
- ✅ No user interaction required (fully automated)
- ✅ Scales to multi-tenant easily
- ✅ Better security posture (centralized service identity)
- ✅ Current code works with minimal changes (just change folder ID)

**Cons**:
- ❌ Requires Google Workspace subscription (~$12/user/month)
- ❌ Requires IT admin to set up Shared Drive
- ❌ Cannot implement immediately (budget approval needed)

**Effort**: 5 minutes setup (if Workspace available)

---

### Option 2: User OAuth + Personal Drive (TEMPORARY BRIDGE)
**Description**: Use User OAuth 2.0 to authenticate as end-user, upload using their 15GB quota

**Pros**:
- ✅ Works with free Personal Gmail account
- ✅ Can implement immediately (no budget approval)
- ✅ Sufficient for Phase 5 completion
- ✅ Uses user's 15GB quota (adequate for CSV files)

**Cons**:
- ❌ Token refresh complexity (expires every 7 days to 6 months)
- ❌ Requires user interaction (initial OAuth consent)
- ❌ Not scalable to multi-tenant without significant rework
- ❌ Higher operational burden (token management)
- ❌ If user changes password/2FA, tokens invalidate
- ❌ Must refactor auth layer when migrating to Solution 1

**Effort**: 
- Implementation: ~2-3 hours (rewrite auth layer)
- Ongoing: Token refresh monitoring required

---

### Option 3: Google Cloud Storage (NOT RECOMMENDED)
**Description**: Replace Google Drive with Cloud Storage buckets

**Pros**:
- ✅ Designed for application storage
- ✅ Works with Service Accounts natively

**Cons**:
- ❌ Completely different storage system (not Drive)
- ❌ Users need different access method (not Drive UI)
- ❌ Incurs Cloud Storage costs
- ❌ Major architectural change

**Decision**: Rejected - changes product vision (users expect Drive)

---

## Decision

**Primary Decision**: Implement **Option 2 (User OAuth)** as temporary solution

**Migration Path**: Plan to migrate to **Option 1 (Shared Drive)** when budget allows

### Rationale

1. **Immediate Needs**: Phase 5 must complete this week; Option 1 requires budget approval
2. **Risk Mitigation**: Temporary solution is acceptable if migration path is clear
3. **Cost-Benefit**: 3 hours implementation vs. waiting weeks for budget approval
4. **Technical Debt**: Acceptable if documented and planned for

---

## Implementation Plan

### Phase 1: Temporary Solution (User OAuth) - THIS WEEK

**Timeline**: Jan 18-19, 2026 (2 days)

#### Step 1.1: Set Up OAuth 2.0 Credentials (30 min)
```bash
# 1. Go to Google Cloud Console → APIs & Services → Credentials
# 2. Create OAuth 2.0 Client ID (Web application)
# 3. Add redirect URI: http://localhost:4000/auth/google/callback
# 4. Download credentials JSON
# 5. Store CLIENT_ID and CLIENT_SECRET in .env
```

**Deliverables**:
- OAuth Client ID + Secret
- Updated `.env` with new credentials

---

#### Step 1.2: Update GoogleDriveService.ts (90 min)

**File**: `backend/src/modules/files/GoogleDriveService.ts`

**Changes Required**:

```typescript
// BEFORE (Service Account)
import { google } from 'googleapis';

export class GoogleDriveService {
    private auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    
    async uploadFile(fileName: string, buffer: Buffer) {
        const drive = google.drive({ version: 'v3', auth: this.auth });
        // ...
    }
}

// AFTER (User OAuth)
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleDriveService {
    private oauth2Client: OAuth2Client;
    
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        // Load stored refresh token
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        if (refreshToken) {
            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        }
    }
    
    async uploadFile(fileName: string, buffer: Buffer) {
        // Auto-refresh access token if expired
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        
        const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        // ... rest of upload logic unchanged
    }
    
    // New method: Get OAuth URL for initial setup
    getAuthUrl(): string {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive.file'],
            prompt: 'consent', // Force to get refresh token
        });
    }
    
    // New method: Exchange code for tokens
    async getTokensFromCode(code: string) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }
}
```

**Key Changes**:
1. Replace `GoogleAuth` with `OAuth2Client`
2. Add token refresh logic
3. Add methods for initial OAuth flow
4. Store refresh token in environment

---

#### Step 1.3: Create OAuth Setup Script (30 min)

**File**: `backend/scripts/setup-google-oauth.ts`

```typescript
#!/usr/bin/env bun

import { GoogleDriveService } from '../src/modules/files/GoogleDriveService';
import config from '../src/config';

async function main() {
    const driveService = new GoogleDriveService();
    
    console.log('🔐 Google Drive OAuth Setup');
    console.log('─────────────────────────────');
    console.log('\n1. Visit this URL to authorize:\n');
    console.log(driveService.getAuthUrl());
    console.log('\n2. After authorization, copy the code from URL');
    console.log('3. Paste the code here:');
    
    // Read code from stdin
    const code = await new Promise<string>((resolve) => {
        process.stdin.once('data', (data) => resolve(data.toString().trim()));
    });
    
    console.log('\n📥 Exchanging code for tokens...');
    const tokens = await driveService.getTokensFromCode(code);
    
    console.log('\n✅ Success! Add this to your .env:');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n⚠️  Keep this token secret! Do not commit to Git.');
}

main().catch(console.error);
```

**Usage**:
```bash
bun backend/scripts/setup-google-oauth.ts
# Follow prompts to get refresh token
# Copy token to .env
```

---

#### Step 1.4: Update Environment Variables (5 min)

**File**: `.env`

```bash
# BEFORE (Service Account)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./backend/service-account.json

# AFTER (User OAuth)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token-from-setup

# Keep folder ID (same for both methods)
GOOGLE_DRIVE_ROOT_FOLDER_ID=18Eozg0rgmC29vPmJpLm0RPZtdLFRYNlI
```

---

#### Step 1.5: Test OAuth Flow (15 min)

```bash
# 1. Run setup script
bun backend/scripts/setup-google-oauth.ts

# 2. Test manual export
bun backend/scripts/trigger-export.ts

# Expected:
# ✅ Connects to MongoDB
# ✅ Generates CSV
# ✅ Uploads to Drive (using user quota)
# ✅ Creates ExportLog
# ✅ Sends Discord notification

# 3. Verify file in Drive
# Go to Google Drive folder → Check for batch_YYYY-MM-DD.csv
```

---

#### Step 1.6: Update Documentation (15 min)

**Files to Update**:
1. `SETUP.md` - Add OAuth setup instructions
2. `ARCHITECTURE.md` - Document temporary OAuth approach
3. `GOOGLE_DRIVE_ROOT_ANALYSIS.md` - Reference this ADR
4. Create `docs/MIGRATION_TO_SHARED_DRIVE.md` - Future migration guide

---

### Phase 2: Migration to Production (Shared Drive) - FUTURE

**Trigger**: When budget approved for Google Workspace

**Timeline**: 1 day (mostly setup, minimal code changes)

#### Step 2.1: Upgrade to Google Workspace
- Purchase Business Standard plan ($12/user/month)
- Create Shared Drive
- Invite Service Account to Shared Drive

#### Step 2.2: Revert to Service Account
```typescript
// Revert GoogleDriveService.ts to original Service Account implementation
// Only change: Update GOOGLE_DRIVE_ROOT_FOLDER_ID to Shared Drive folder ID
```

#### Step 2.3: Clean Up OAuth Code
- Remove OAuth methods from GoogleDriveService
- Remove setup-google-oauth.ts script
- Update .env to use SERVICE_ACCOUNT_KEY_PATH again

**Effort**: ~4 hours (mostly waiting for Workspace setup)

---

## Consequences

### Positive
- ✅ Can complete Phase 5 this week without budget approval
- ✅ Solution works with free Gmail account
- ✅ Migration path to production solution is clear
- ✅ Technical debt is documented and time-boxed

### Negative
- ❌ Technical debt: Auth layer will need refactoring
- ❌ Operational burden: Token refresh monitoring required
- ❌ Risk: If user changes password, system breaks until token renewed
- ❌ Not scalable: Multi-tenant would require token per customer

### Neutral
- 📋 Must document migration path clearly
- 📋 Should set calendar reminder to revisit in 3-6 months
- 📋 Team must understand this is temporary solution

---

## Risk Management

### Risk 1: OAuth Token Expiration
**Likelihood**: Medium  
**Impact**: High (system stops working)

**Mitigation**:
- Implement token refresh in GoogleDriveService (auto-refresh on upload)
- Add monitoring: Alert if upload fails due to invalid token
- Document manual token renewal procedure
- Store refresh token in secure secret manager (not just .env)

---

### Risk 2: User Account Changes
**Likelihood**: Low  
**Impact**: High

**Scenarios**:
- User changes password → Token invalidates
- User enables 2FA → Token may invalidate
- User leaves company → Need new token owner

**Mitigation**:
- Use dedicated "system user" Gmail account (not personal)
- Document account credentials in secure location
- Add fallback: If upload fails, send critical alert to admin

---

### Risk 3: Migration Delay
**Likelihood**: Medium  
**Impact**: Medium (stuck on temporary solution longer)

**Mitigation**:
- Set specific date to review migration (April 2026)
- Include Workspace cost in budget planning
- Estimate migration effort in quarterly planning

---

## Compliance & Security

### OAuth Token Storage
**Requirement**: Refresh token is equivalent to password

**Implementation**:
- ❌ Do NOT commit refresh token to Git
- ✅ Store in `.env` (already in `.gitignore`)
- ✅ Use secret manager in production (AWS Secrets Manager, Google Secret Manager)
- ✅ Rotate tokens every 6 months

### Scope Minimization
**Requirement**: Request minimum necessary permissions

**Implementation**:
- Use `drive.file` scope (access only files created by app)
- Do NOT use `drive` scope (access all Drive files)

### Audit Trail
**Requirement**: Track who accessed Drive

**Implementation**:
- Google Drive audit logs show OAuth app name
- ExportLog in MongoDB tracks each upload
- Discord alerts provide real-time visibility

---

## Monitoring & Alerts

### Health Checks
```typescript
// Add to backend/src/jobs/DailyExportJob.ts

async checkDriveHealth(): Promise<boolean> {
    try {
        // Test token by listing files
        await this.driveService.listFiles({ maxResults: 1 });
        return true;
    } catch (error) {
        if (error.code === 401) {
            // Token expired or invalid
            await sendCriticalAlert('Google Drive token expired - manual renewal required');
        }
        return false;
    }
}
```

### Alert Triggers
1. **Token Expired**: Send critical Discord alert
2. **Upload Failed**: Send error alert with retry count
3. **Token Expires Soon**: Send warning 7 days before expiration (if detectable)

---

## Testing Strategy

### Unit Tests
```typescript
// backend/tests/unit/modules/files/GoogleDriveService.test.ts

describe('GoogleDriveService (OAuth)', () => {
    it('should refresh token automatically before upload', async () => {
        // Mock OAuth2Client.refreshAccessToken()
        // Verify it's called before upload
    });
    
    it('should handle token refresh failure gracefully', async () => {
        // Mock refresh failure
        // Verify error handling
    });
});
```

### Integration Tests
```typescript
// backend/tests/integration/google-drive-oauth.test.ts

describe('Google Drive OAuth Integration', () => {
    it('should upload file using OAuth token', async () => {
        // Uses real OAuth token from test .env
        const result = await driveService.uploadFile('test.csv', buffer);
        expect(result.fileId).toBeDefined();
    });
});
```

### E2E Tests
- Manual trigger script should work end-to-end
- Scheduled cron should work (test at non-18:00 time)

---

## Documentation Requirements

### For Developers
- **README.md**: Add OAuth setup section
- **SETUP.md**: Detail OAuth credential creation steps
- **ARCHITECTURE.md**: Explain temporary vs. final solution

### For Operations
- **Runbook**: How to renew OAuth token manually
- **Incident Response**: What to do if upload fails due to token
- **Migration Guide**: Step-by-step Shared Drive migration

### For Stakeholders
- **This ADR**: Why we chose temporary solution
- **Cost Analysis**: Workspace cost vs. current free solution
- **Timeline**: When migration should happen

---

## Success Criteria

### Immediate (Phase 1)
- ✅ OAuth flow works (can get refresh token)
- ✅ Manual export uploads to Drive successfully
- ✅ Cron job uploads daily exports
- ✅ All tests pass with OAuth implementation
- ✅ Documentation updated

### Long-term (Phase 2)
- ✅ Migrated to Shared Drive within 6 months
- ✅ Service Account auth restored
- ✅ OAuth code removed
- ✅ Zero technical debt from this decision

---

## References

### Technical Resources
- [web:57] Google Cloud: Best practices for using service accounts securely
- [web:55] Google Drive API: OAuth 2.0 authentication
- [web:58] Token refresh best practices
- [file:51] Google Drive Root Cause Analysis (First Principles)

### Internal Documents
- Phase 5 Completion Report (describes current blocker)
- Google Drive Root Cause Analysis (First Principles analysis)
- Expert Team Resolution Guide (3 solutions comparison)

---

## Appendix A: Environment Variable Comparison

| Variable | Service Account (Phase 2) | User OAuth (Phase 1) |
|:---------|:--------------------------|:---------------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | ✅ Required | ❌ Not used |
| `GOOGLE_CLIENT_ID` | ❌ Not used | ✅ Required |
| `GOOGLE_CLIENT_SECRET` | ❌ Not used | ✅ Required |
| `GOOGLE_REDIRECT_URI` | ❌ Not used | ✅ Required |
| `GOOGLE_REFRESH_TOKEN` | ❌ Not used | ✅ Required |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ✅ Required | ✅ Required |

---

## Appendix B: Migration Checklist

When ready to migrate to Shared Drive:

**Pre-Migration**
- [ ] Budget approved for Google Workspace
- [ ] Workspace account created
- [ ] Shared Drive created
- [ ] Service Account invited to Shared Drive
- [ ] Test upload to Shared Drive from local

**Code Changes**
- [ ] Revert GoogleDriveService.ts to Service Account
- [ ] Update .env with SERVICE_ACCOUNT_KEY_PATH
- [ ] Update GOOGLE_DRIVE_ROOT_FOLDER_ID to Shared Drive folder
- [ ] Remove OAuth-specific code
- [ ] Update tests

**Verification**
- [ ] Manual trigger script works
- [ ] Cron job uploads successfully
- [ ] All tests pass
- [ ] Documentation updated

**Cleanup**
- [ ] Remove OAuth credentials from Google Cloud Console
- [ ] Remove refresh token from .env
- [ ] Archive OAuth setup script
- [ ] Update ADR status to SUPERSEDED

---

## Decision Log

| Date | Author | Change |
|:-----|:-------|:-------|
| 2026-01-18 | Expert Team + Product Owner | Initial decision: Use OAuth temporarily, migrate to Shared Drive later |
| TBD | TBD | Migration to Shared Drive completed |

---

## Approval

**Accepted By**: Product Owner  
**Date**: 2026-01-18  
**Next Review**: 2026-04-18 (3 months) or when budget approved

---

**Status**: ✅ ACCEPTED - Implementation begins immediately
