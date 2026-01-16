<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 🎯 PHASE 2 MISSION PROMPT: FlowAccount Integration

นี่คือ prompt ฉบับสมบูรณ์สำหรับ Antigravity IDE ในการพัฒนา Phase 2 โดยต่อจาก codebase ที่มีอยู่แล้ว[^1]

***

```markdown
# Auto-Acct-001: Phase 2 - FlowAccount Integration

## Context & Prerequisites

You are continuing development of the Auto-Acct-001 production accounting system.
**Phase 1 Status**: ✅ Complete (Bun + Express + MongoDB + MoneyInt types)

**Repository**: https://github.com/Waytid-way/Auto_Acct101.git
**Current Branch**: main

### Phase 1 Accomplishments (Do NOT recreate these)
- ✅ Bun runtime with TypeScript strict mode
- ✅ MongoDB v7 with replica set enabled
- ✅ MoneyInt type system (integer-only money)
- ✅ Global error handler with Discord alerts
- ✅ Health check endpoint
- ✅ Repository pattern architecture
- ✅ PII sanitization in logs

### Phase 2 Objectives (What You Will Build)
According to PROJECT BRIEF Week 1-3 priorities:

1. **FlowAccount OAuth 2.0 Integration**
   - Implement 3-legged OAuth flow
   - Secure token storage with encryption
   - Token refresh mechanism

2. **Nightly Data Sync**
   - Cron job to pull documents from FlowAccount API
   - Support multiple clients (each with their own OAuth token)
   - Incremental sync (only new/updated documents)

3. **Validation Engine**
   - VAT 7% calculation and verification
   - Category mapping (FlowAccount → Internal chart of accounts)
   - Attachment requirement (>1000 THB requires proof)
   - Amount consistency checks

4. **Teable Integration**
   - Push validated records to Teable as "pending_review"
   - Include confidence scores and validation warnings
   - Support bulk operations

5. **Express CSV Generator**
   - Map approved records to Express accounting software format
   - UTF-8 with BOM (Thai language support)
   - Configurable chart of accounts mapping

---

## CRITICAL CONSTRAINTS (Inherited from Phase 1)

### Financial Integrity (NON-NEGOTIABLE)
- ✅ ALL money values must use `MoneyInt` (integer satang)
- ✅ ALL FlowAccount amounts must be converted: `Math.round(amount * 100)`
- ✅ ALL database writes involving ledger must use MongoDB session transactions
- ✅ VAT calculations must be exact (7% of base amount, rounded)
- ✅ NEVER delete synced documents (use status flags only)

### Security Rules
- ✅ OAuth tokens encrypted with AES-256-GCM before storing in MongoDB
- ✅ FlowAccount Client Secret stored in .env ONLY (never in code)
- ✅ All API requests include request tracing (req.id)
- ✅ PII sanitization in all logs (no account numbers, amounts in Discord)

### Coding Standards
- ✅ TypeScript strict mode (no `any` type)
- ✅ Zod schemas for ALL external API responses
- ✅ Repository pattern (Controller → Service → Repository)
- ✅ Error handling with try-catch and proper logging
- ✅ Bun-first (use `bun` commands, not `npm`)

---

## Phase 2: Implementation Tasks

### Task 2.1: FlowAccount OAuth 2.0 Implementation

#### 2.1.1 Create OAuth Models

**File**: `backend/src/modules/flowaccount/models/FlowAccountToken.model.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IFlowAccountToken extends Document {
  clientId: string;              // Internal client reference
  accessToken: string;           // Encrypted access token
  refreshToken: string;          // Encrypted refresh token
  expiresAt: Date;               // Token expiration time
  scope: string;                 // OAuth scopes granted
  flowAccountCompanyId: string;  // FlowAccount company ID
  isActive: boolean;             // Enable/disable sync
  lastSyncAt?: Date;             // Last successful sync timestamp
  metadata?: {
    companyName?: string;
    taxId?: string;
  };
}

const FlowAccountTokenSchema = new Schema<IFlowAccountToken>(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },      // Will be encrypted
    refreshToken: { type: String, required: true },     // Will be encrypted
    expiresAt: { type: Date, required: true, index: true },
    scope: { type: String, required: true },
    flowAccountCompanyId: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    lastSyncAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'flowaccount_tokens' }
);

export const FlowAccountToken = mongoose.model<IFlowAccountToken>(
  'FlowAccountToken',
  FlowAccountTokenSchema
);
```

**Requirements**:

- Index on `clientId` (unique) for fast lookup
- Index on `expiresAt` for token refresh queries
- Index on `isActive` for sync cron job filtering

---

#### 2.1.2 Create Encryption Service

**File**: `backend/src/modules/files/EncryptionService.ts`

```typescript
import crypto from 'crypto';
import config from '@config/env';

export class EncryptionService {
  private algorithm = config.ENCRYPTION_ALGORITHM; // aes-256-gcm
  private key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
  private ivLength = config.ENCRYPTION_IV_LENGTH; // 16

  /**
   * Encrypt sensitive data (OAuth tokens, passwords)
   * Returns: base64(iv + authTag + encrypted)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine: iv + authTag + encrypted
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return combined.toString('base64');
  }

  /**
   * Decrypt data encrypted by encrypt()
   */
  decrypt(ciphertext: string): string {
    const combined = Buffer.from(ciphertext, 'base64');

    const iv = combined.subarray(0, this.ivLength);
    const authTag = combined.subarray(this.ivLength, this.ivLength + 16);
    const encrypted = combined.subarray(this.ivLength + 16);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

**Security Notes**:

- Uses GCM mode (provides authentication + encryption)
- Random IV per encryption (prevents pattern detection)
- Auth tag prevents tampering

---

#### 2.1.3 Implement OAuth Flow

**File**: `backend/src/modules/flowaccount/FlowAccountOAuthService.ts`

```typescript
import axios from 'axios';
import config from '@config/env';
import { FlowAccountToken } from './models/FlowAccountToken.model';
import { EncryptionService } from '@modules/files/EncryptionService';
import logger from '@loaders/logger';

export class FlowAccountOAuthService {
  private baseURL = 'https://openapi.flowaccount.com';
  private encryption = new EncryptionService();

  /**
   * Step 1: Generate authorization URL
   * User will be redirected to FlowAccount to grant access
   */
  getAuthorizationURL(state: string): string {
    const params = new URLSearchParams({
      client_id: config.FLOWACCOUNT_CLIENT_ID,
      redirect_uri: config.FLOWACCOUNT_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email document.read document.write',
      state, // CSRF protection
    });

    return `${this.baseURL}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for access token
   * Called from callback endpoint after user approves
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string
  ): Promise<IFlowAccountToken> {
    try {
      const response = await axios.post(
        `${this.baseURL}/oauth/token`,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.FLOWACCOUNT_REDIRECT_URI,
          client_id: config.FLOWACCOUNT_CLIENT_ID,
          client_secret: config.FLOWACCOUNT_CLIENT_SECRET,
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, refresh_token, expires_in, scope } = response.data;

      // Get company info to link token to client
      const companyInfo = await this.getCompanyInfo(access_token);

      // Encrypt tokens before storage
      const encryptedAccess = this.encryption.encrypt(access_token);
      const encryptedRefresh = this.encryption.encrypt(refresh_token);

      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Store in database
      const token = await FlowAccountToken.findOneAndUpdate(
        { clientId },
        {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          expiresAt,
          scope,
          flowAccountCompanyId: companyInfo.id,
          isActive: true,
          metadata: {
            companyName: companyInfo.name,
            taxId: companyInfo.taxId,
          },
        },
        { upsert: true, new: true }
      );

      logger.info('FlowAccount token stored', {
        clientId,
        companyId: companyInfo.id,
        expiresAt,
      });

      return token;
    } catch (error) {
      logger.error('Failed to exchange OAuth code', { error, clientId });
      throw new Error('OAuth token exchange failed');
    }
  }

  /**
   * Step 3: Refresh expired access token
   */
  async refreshToken(clientId: string): Promise<string> {
    const tokenDoc = await FlowAccountToken.findOne({ clientId });

    if (!tokenDoc) {
      throw new Error(`No token found for client: ${clientId}`);
    }

    const decryptedRefresh = this.encryption.decrypt(tokenDoc.refreshToken);

    try {
      const response = await axios.post(
        `${this.baseURL}/oauth/token`,
        {
          grant_type: 'refresh_token',
          refresh_token: decryptedRefresh,
          client_id: config.FLOWACCOUNT_CLIENT_ID,
          client_secret: config.FLOWACCOUNT_CLIENT_SECRET,
        }
      );

      const { access_token, expires_in } = response.data;

      const encryptedAccess = this.encryption.encrypt(access_token);
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      tokenDoc.accessToken = encryptedAccess;
      tokenDoc.expiresAt = expiresAt;
      await tokenDoc.save();

      logger.info('FlowAccount token refreshed', { clientId, expiresAt });

      return access_token;
    } catch (error) {
      logger.error('Token refresh failed', { error, clientId });
      tokenDoc.isActive = false;
      await tokenDoc.save();
      throw new Error('Token refresh failed - re-authorization required');
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidAccessToken(clientId: string): Promise<string> {
    const tokenDoc = await FlowAccountToken.findOne({ clientId, isActive: true });

    if (!tokenDoc) {
      throw new Error(`No active token for client: ${clientId}`);
    }

    // Check if token expires in next 5 minutes
    const expiresIn = tokenDoc.expiresAt.getTime() - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      return this.refreshToken(clientId);
    }

    return this.encryption.decrypt(tokenDoc.accessToken);
  }

  /**
   * Helper: Get company info from FlowAccount
   */
  private async getCompanyInfo(accessToken: string): Promise<any> {
    const response = await axios.get(`${this.baseURL}/v1/company/info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  }
}
```

**Key Features**:

- Token encryption before database storage
- Automatic refresh when expiring (5 min buffer)
- CSRF protection with state parameter
- Error handling with token deactivation

---

#### 2.1.4 Create OAuth Controller \& Routes

**File**: `backend/src/modules/flowaccount/FlowAccountOAuthController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { FlowAccountOAuthService } from './FlowAccountOAuthService';
import { randomUUID } from 'crypto';
import logger from '@loaders/logger';

const oauthService = new FlowAccountOAuthService();

// Temporary state storage (in production, use Redis)
const pendingStates = new Map<string, { clientId: string; timestamp: number }>();

export class FlowAccountOAuthController {
  /**
   * Step 1: Initiate OAuth flow
   * GET /api/flowaccount/authorize?clientId=xxx
   */
  async authorize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.query;

      if (!clientId || typeof clientId !== 'string') {
        res.status(400).json({
          error: 'BadRequest',
          message: 'clientId query parameter required',
        });
        return;
      }

      // Generate CSRF state token
      const state = randomUUID();
      pendingStates.set(state, {
        clientId,
        timestamp: Date.now(),
      });

      // Clean up expired states (older than 10 minutes)
      this.cleanupExpiredStates();

      const authURL = oauthService.getAuthorizationURL(state);

      logger.info('OAuth flow initiated', { clientId, state });

      res.redirect(authURL);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 2: Handle OAuth callback
   * GET /api/flowaccount/callback?code=xxx&state=xxx
   */
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).json({
          error: 'BadRequest',
          message: 'code and state parameters required',
        });
        return;
      }

      // Verify state (CSRF protection)
      const pending = pendingStates.get(state);
      if (!pending) {
        res.status(400).json({
          error: 'InvalidState',
          message: 'Invalid or expired state parameter',
        });
        return;
      }

      pendingStates.delete(state);

      const { clientId } = pending;

      // Exchange code for token
      const token = await oauthService.exchangeCodeForToken(code, clientId);

      logger.info('OAuth flow completed', {
        clientId,
        companyId: token.flowAccountCompanyId,
      });

      res.status(200).json({
        success: true,
        message: 'FlowAccount connected successfully',
        data: {
          clientId,
          companyName: token.metadata?.companyName,
          expiresAt: token.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke OAuth token
   * POST /api/flowaccount/revoke
   */
  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.body;

      await FlowAccountToken.findOneAndUpdate(
        { clientId },
        { isActive: false }
      );

      logger.info('FlowAccount token revoked', { clientId });

      res.json({ success: true, message: 'Token revoked' });
    } catch (error) {
      next(error);
    }
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of pendingStates.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) {
        pendingStates.delete(state);
      }
    }
  }
}
```

**File**: `backend/src/modules/flowaccount/routes.ts`

```typescript
import { Router } from 'express';
import { FlowAccountOAuthController } from './FlowAccountOAuthController';

const router = Router();
const controller = new FlowAccountOAuthController();

router.get('/authorize', controller.authorize.bind(controller));
router.get('/callback', controller.callback.bind(controller));
router.post('/revoke', controller.revoke.bind(controller));

export default router;
```

**Update**: `backend/src/loaders/express.ts`

```typescript
import flowAccountRouter from '@modules/flowaccount/routes';
// ...
app.use('/api/flowaccount', flowAccountRouter);
```


---

### Task 2.2: FlowAccount Data Sync Service

#### 2.2.1 Define FlowAccount Document DTO

**File**: `backend/src/modules/flowaccount/dtos/FlowAccountDocument.dto.ts`

```typescript
import { z } from 'zod';

export const FlowAccountDocumentSchema = z.object({
  recordId: z.string(),
  documentType: z.enum(['income', 'expense', 'revenue', 'purchase_order']),
  documentDate: z.string().datetime(),
  contactName: z.string(),
  grandTotal: z.number(),
  grandTotalWithTax: z.number(),
  taxAmount: z.number(),
  remarks: z.string().optional(),
  referenceDocument: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })
  ),
  attachments: z.array(
    z.object({
      fileName: z.string(),
      fileUrl: z.string().url(),
    })
  ).optional(),
});

export type FlowAccountDocumentDTO = z.infer<typeof FlowAccountDocumentSchema>;
```


---

#### 2.2.2 Create FlowAccount API Client

**File**: `backend/src/modules/flowaccount/FlowAccountClient.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import { FlowAccountOAuthService } from './FlowAccountOAuthService';
import { FlowAccountDocumentSchema, FlowAccountDocumentDTO } from './dtos/FlowAccountDocument.dto';
import logger from '@loaders/logger';

export class FlowAccountClient {
  private client: AxiosInstance;
  private oauthService = new FlowAccountOAuthService();

  constructor() {
    this.client = axios.create({
      baseURL: 'https://openapi.flowaccount.com/v1',
      timeout: 30000,
    });
  }

  /**
   * Fetch documents from FlowAccount for a date range
   */
  async getDocuments(
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FlowAccountDocumentDTO[]> {
    try {
      const accessToken = await this.oauthService.getValidAccessToken(clientId);

      const response = await this.client.get('/documents', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          startDate: startDate.toISOString().split('T'),
          endDate: endDate.toISOString().split('T'),
        },
      });

      // Validate response with Zod
      const documents = z.array(FlowAccountDocumentSchema).parse(response.data.data);

      logger.info('FlowAccount documents fetched', {
        clientId,
        count: documents.length,
        startDate,
        endDate,
      });

      return documents;
    } catch (error) {
      logger.error('Failed to fetch FlowAccount documents', {
        error,
        clientId,
      });
      throw error;
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(
    clientId: string,
    documentId: string
  ): Promise<FlowAccountDocumentDTO> {
    const accessToken = await this.oauthService.getValidAccessToken(clientId);

    const response = await this.client.get(`/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return FlowAccountDocumentSchema.parse(response.data);
  }
}
```


---

#### 2.2.3 Create Sync Service with Validation

**File**: `backend/src/modules/flowaccount/FlowAccountSyncService.ts`

```typescript
import mongoose from 'mongoose';
import { FlowAccountClient } from './FlowAccountClient';
import { FlowAccountToken } from './models/FlowAccountToken.model';
import { AccountingService } from '@modules/accounting/AccountingService';
import { AccountingRepository } from '@modules/accounting/AccountingRepository';
import { CreateJournalEntryDTO } from '@modules/accounting/dtos/CreateJournalEntry.dto';
import { parseMoneyFromString, MoneyInt } from '@types/money';
import logger from '@loaders/logger';
import { sendDiscordAlert } from '@loaders/logger';

export class FlowAccountSyncService {
  private client = new FlowAccountClient();
  private accountingService = new AccountingService(new AccountingRepository());

  /**
   * Sync documents for a single client
   */
  async syncClient(clientId: string, date: Date = new Date()): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch documents from FlowAccount
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const documents = await this.client.getDocuments(clientId, startDate, endDate);

      logger.info('Starting FlowAccount sync', {
        clientId,
        documentCount: documents.length,
        date,
      });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const doc of documents) {
        try {
          await this.processDocument(clientId, doc, session);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${doc.recordId}: ${error.message}`);
          logger.error('Failed to process document', {
            clientId,
            documentId: doc.recordId,
            error,
          });
        }
      }

      await session.commitTransaction();

      // Update last sync timestamp
      await FlowAccountToken.findOneAndUpdate(
        { clientId },
        { lastSyncAt: new Date() }
      );

      logger.info('FlowAccount sync completed', {
        clientId,
        results,
      });

      // Alert if errors
      if (results.failed > 0) {
        await sendDiscordAlert(
          `⚠️ FlowAccount sync completed with errors for client ${clientId}`,
          { results }
        );
      }
    } catch (error) {
      await session.abortTransaction();
      logger.error('FlowAccount sync failed', { error, clientId });
      
      await sendDiscordAlert(
        `🚨 FlowAccount sync failed for client ${clientId}`,
        { error: (error as Error).message }
      );
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process a single FlowAccount document
   */
  private async processDocument(
    clientId: string,
    doc: any,
    session: mongoose.ClientSession
  ): Promise<void> {
    // Convert FlowAccount amounts to MoneyInt (satang)
    const amount: MoneyInt = Math.round(doc.grandTotal * 100);
    const vatAmount: MoneyInt = Math.round(doc.taxAmount * 100);

    // Validation 1: VAT 7% check
    const expectedVAT = Math.round(amount * 0.07);
    const vatDiff = Math.abs(vatAmount - expectedVAT);
    
    if (vatDiff > 100) { // Allow 1 THB difference
      logger.warn('VAT mismatch detected', {
        documentId: doc.recordId,
        expected: expectedVAT,
        actual: vatAmount,
        diff: vatDiff,
      });
    }

    // Validation 2: Attachment requirement (>1000 THB)
    const requiresAttachment = amount > 100000; // 1000 THB in satang
    const hasAttachment = doc.attachments && doc.attachments.length > 0;

    if (requiresAttachment && !hasAttachment) {
      throw new Error(
        `Document ${doc.recordId} requires attachment (amount > 1000 THB)`
      );
    }

    // Validation 3: Category mapping
    const category = this.mapCategory(doc.documentType, doc.contactName);

    if (!category) {
      throw new Error(`Unable to map category for document ${doc.recordId}`);
    }

    // Create journal entry
    const entryDTO: CreateJournalEntryDTO = {
      clientId,
      date: new Date(doc.documentDate),
      accountCode: category.accountCode,
      description: doc.remarks || `${doc.contactName} - ${doc.documentType}`,
      amount,
      type: doc.documentType === 'expense' ? 'debit' : 'credit',
      category: category.name,
      vatAmount,
      attachmentId: hasAttachment ? doc.attachments.fileUrl : undefined,
      source: 'flowaccount',
      metadata: {
        flowAccountRecordId: doc.recordId,
        contactName: doc.contactName,
        referenceDocument: doc.referenceDocument,
      },
      createdBy: 'system:flowaccount-sync',
    };

    // Save to database with status "pending_review"
    const entry = await this.accountingService.createEntry(entryDTO);

    logger.debug('Document processed', {
      documentId: doc.recordId,
      entryId: entry._id,
      amount,
      category: category.name,
    });
  }

  /**
   * Map FlowAccount document type to internal category
   * TODO: Load from configuration file or database
   */
  private mapCategory(
    documentType: string,
    contactName: string
  ): { name: string; accountCode: string } | null {
    // Simple rule-based mapping (Phase 2)
    // Phase 3 will use ML classification
    
    const categoryMap: Record<string, { name: string; accountCode: string }> = {
      expense: { name: 'General Expense', accountCode: '5000' },
      income: { name: 'Revenue', accountCode: '4000' },
      revenue: { name: 'Sales Revenue', accountCode: '4100' },
    };

    // Keyword-based subcategory detection
    const lowerContact = contactName.toLowerCase();
    
    if (lowerContact.includes('electricity') || lowerContact.includes('ไฟฟ้า')) {
      return { name: 'Utilities - Electricity', accountCode: '5110' };
    }
    
    if (lowerContact.includes('water') || lowerContact.includes('ประปา')) {
      return { name: 'Utilities - Water', accountCode: '5120' };
    }
    
    if (lowerContact.includes('rent') || lowerContact.includes('ค่าเช่า')) {
      return { name: 'Rent Expense', accountCode: '5200' };
    }
    
    if (lowerContact.includes('meal') || lowerContact.includes('อาหาร')) {
      return { name: 'Meals & Entertainment', accountCode: '5300' };
    }

    // Fallback to document type
    return categoryMap[documentType] || null;
  }

  /**
   * Sync all active clients (used by cron)
   */
  async syncAllClients(date: Date = new Date()): Promise<void> {
    const activeTokens = await FlowAccountToken.find({ isActive: true });

    logger.info('Starting bulk FlowAccount sync', {
      clientCount: activeTokens.length,
      date,
    });

    for (const token of activeTokens) {
      try {
        await this.syncClient(token.clientId, date);
      } catch (error) {
        // Continue with other clients even if one fails
        logger.error('Client sync failed', {
          clientId: token.clientId,
          error,
        });
      }
    }

    logger.info('Bulk FlowAccount sync completed');
  }
}
```

**Key Features**:

- VAT 7% validation with tolerance
- Attachment requirement enforcement
- Category mapping (rule-based, ready for ML upgrade)
- Transaction-safe processing
- Error handling per document (doesn't fail entire batch)

---

### Task 2.3: Nightly Cron Job

**File**: `backend/src/scripts/sync-flowaccount-cron.ts`

```typescript
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import { FlowAccountSyncService } from '@modules/flowaccount/FlowAccountSyncService';
import logger from '@loaders/logger';
import { sendDiscordAlert } from '@loaders/logger';

async function runNightlySync(): Promise<void> {
  try {
    await connectMongoDB();

    logger.info('🌙 Starting nightly FlowAccount sync');

    const syncService = new FlowAccountSyncService();
    const today = new Date();

    await syncService.syncAllClients(today);

    logger.info('✅ Nightly FlowAccount sync completed successfully');

    await sendDiscordAlert(
      '✅ Nightly FlowAccount sync completed',
      { date: today.toISOString().split('T'), status: 'success' }
    );
  } catch (error) {
    logger.error('❌ Nightly sync failed', { error });

    await sendDiscordAlert(
      '🚨 Nightly FlowAccount sync FAILED',
      { error: (error as Error).message }
    );

    process.exit(1);
  } finally {
    await disconnectMongoDB();
  }
}

runNightlySync();
```

**Crontab Entry** (for production deployment):

```bash
# Run every night at 11:00 PM
0 23 * * * cd /path/to/backend && bun run scripts/sync-flowaccount-cron.ts >> logs/cron.log 2>&1
```

**For Development Testing**:

```bash
# Manual trigger
bun run scripts/sync-flowaccount-cron.ts
```


---

### Task 2.4: Teable Integration (Push Records)

**File**: `backend/src/modules/teable/TeableClient.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import config from '@config/env';
import logger from '@loaders/logger';

export interface TeableRecordDTO {
  fields: {
    clientId: string;
    journalEntryId: string;
    date: string;
    vendor: string;
    amount: number; // Display as THB (divided by 100)
    category: string;
    status: string;
    vatAmount?: number;
    confidenceScore?: number;
    warnings?: string[];
    attachmentUrl?: string;
  };
}

export class TeableClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.TEABLE_API_URL,
      headers: {
        Authorization: `Bearer ${config.TEABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Create a record in Teable
   */
  async createRecord(tableId: string, record: TeableRecordDTO): Promise<string> {
    try {
      const response = await this.client.post(`/table/${tableId}/record`, {
        records: [record],
      });

      const recordId = response.data.records.id;

      logger.info('Teable record created', {
        tableId,
        recordId,
        journalEntryId: record.fields.journalEntryId,
      });

      return recordId;
    } catch (error) {
      logger.error('Failed to create Teable record', { error, record });
      throw error;
    }
  }

  /**
   * Bulk create records (for batch sync)
   */
  async bulkCreateRecords(
    tableId: string,
    records: TeableRecordDTO[]
  ): Promise<string[]> {
    try {
      const response = await this.client.post(`/table/${tableId}/record`, {
        records,
      });

      const recordIds = response.data.records.map((r: any) => r.id);

      logger.info('Teable bulk records created', {
        tableId,
        count: recordIds.length,
      });

      return recordIds;
    } catch (error) {
      logger.error('Failed to bulk create Teable records', { error });
      throw error;
    }
  }

  /**
   * Update record status (after approval)
   */
  async updateRecordStatus(
    tableId: string,
    recordId: string,
    status: string
  ): Promise<void> {
    await this.client.patch(`/table/${tableId}/record/${recordId}`, {
      fields: { status },
    });

    logger.info('Teable record status updated', {
      tableId,
      recordId,
      status,
    });
  }
}
```

**Integration with Sync Service**:

Update `FlowAccountSyncService.processDocument()` to push to Teable:

```typescript
// After creating journal entry
const entry = await this.accountingService.createEntry(entryDTO);

// Push to Teable for human review
const teableClient = new TeableClient();
await teableClient.createRecord('pending_review_table_id', {
  fields: {
    clientId,
    journalEntryId: entry._id.toString(),
    date: entry.date.toISOString().split('T'),
    vendor: doc.contactName,
    amount: amount / 100, // Convert satang to THB for display
    category: category.name,
    status: 'pending_review',
    vatAmount: vatAmount / 100,
    confidenceScore: 0.85, // TODO: Implement ML confidence
    warnings: vatDiff > 100 ? ['VAT mismatch detected'] : undefined,
    attachmentUrl: entryDTO.attachmentId,
  },
});
```


---

### Task 2.5: Express CSV Export

**File**: `backend/src/modules/export/ExpressCSVGenerator.ts`

```typescript
import { IJournalEntry } from '@modules/accounting/models/JournalEntry.model';
import { formatMoney } from '@types/money';

export interface ChartOfAccountsMapping {
  [internalCode: string]: {
    expressCode: string;
    expressName: string;
  };
}

export class ExpressCSVGenerator {
  private chartOfAccounts: ChartOfAccountsMapping;

  constructor(chartOfAccountsPath: string) {
    // Load chart of accounts mapping from JSON file
    this.chartOfAccounts = require(chartOfAccountsPath);
  }

  /**
   * Generate Express-compatible CSV from journal entries
   */
  generate(entries: IJournalEntry[]): string {
    const header = [
      'วันที่',           // Date
      'เลขที่เอกสาร',     // Document No
      'คำอธิบาย',         // Description
      'รหัสบัญชี',        // Account Code (Express format)
      'ชื่อบัญชี',        // Account Name
      'เดบิต',            // Debit
      'เครดิต',           // Credit
      'ผู้บันทึก',        // Created By
    ];

    const rows = entries.map((entry) => {
      const mapping = this.chartOfAccounts[entry.accountCode];

      if (!mapping) {
        throw new Error(`No Express mapping for account code: ${entry.accountCode}`);
      }

      const debit = entry.type === 'debit' ? formatMoney(entry.amount) : '0.00';
      const credit = entry.type === 'credit' ? formatMoney(entry.amount) : '0.00';

      return [
        entry.date.toISOString().split('T'),
        entry._id.toString().substring(0, 10), // Short ID
        entry.description,
        mapping.expressCode,
        mapping.expressName,
        debit,
        credit,
        entry.approvedBy || entry.createdBy,
      ];
    });

    // Add UTF-8 BOM for Thai language support
    const BOM = '\uFEFF';
    const csvContent = [header, ...rows]
      .map((row) => row.join(','))
      .join('\n');

    return BOM + csvContent;
  }

  /**
   * Generate CSV and return as Buffer (for download)
   */
  generateBuffer(entries: IJournalEntry[]): Buffer {
    const csv = this.generate(entries);
    return Buffer.from(csv, 'utf-8');
  }
}
```

**File**: `backend/src/modules/export/ExportService.ts`

```typescript
import { AccountingRepository } from '@modules/accounting/AccountingRepository';
import { ExpressCSVGenerator } from './ExpressCSVGenerator';
import config from '@config/env';
import logger from '@loaders/logger';

export class ExportService {
  private repository = new AccountingRepository();
  private csvGenerator = new ExpressCSVGenerator(
    config.EXPRESS_CHART_OF_ACCOUNTS_PATH
  );

  /**
   * Export approved entries for a client as Express CSV
   */
  async exportClientEntries(
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    const entries = await this.repository.findByClientId(clientId, {
      status: 'approved',
      startDate,
      endDate,
    });

    if (entries.length === 0) {
      throw new Error('No approved entries found for export');
    }

    logger.info('Exporting entries to Express CSV', {
      clientId,
      count: entries.length,
      dateRange: { startDate, endDate },
    });

    return this.csvGenerator.generateBuffer(entries);
  }
}
```

**File**: `backend/src/modules/export/ExportController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ExportService } from './ExportService';

const service = new ExportService();

export class ExportController {
  async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, startDate, endDate } = req.query;

      if (!clientId || !startDate || !endDate) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'clientId, startDate, endDate required',
        });
        return;
      }

      const buffer = await service.exportClientEntries(
        clientId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      const fileName = `express_export_${clientId}_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
```

**File**: `backend/src/modules/export/routes.ts`

```typescript
import { Router } from 'express';
import { ExportController } from './ExportController';

const router = Router();
const controller = new ExportController();

router.get('/csv', controller.exportCSV.bind(controller));

export default router;
```

**Update**: `backend/src/loaders/express.ts`

```typescript
import exportRouter from '@modules/export/routes';
// ...
app.use('/api/export', exportRouter);
```


---

### Task 2.6: Chart of Accounts Configuration

**File**: `backend/config/chart-of-accounts.json`

```json
{
  "5000": {
    "expressCode": "5000",
    "expressName": "ค่าใช้จ่ายทั่วไป"
  },
  "5110": {
    "expressCode": "5110",
    "expressName": "ค่าไฟฟ้า"
  },
  "5120": {
    "expressCode": "5120",
    "expressName": "ค่าประปา"
  },
  "5200": {
    "expressCode": "5200",
    "expressName": "ค่าเช่าสถานที่"
  },
  "5300": {
    "expressCode": "5300",
    "expressName": "ค่าอาหารและความบันเทิง"
  },
  "4000": {
    "expressCode": "4000",
    "expressName": "รายได้"
  },
  "4100": {
    "expressCode": "4100",
    "expressName": "รายได้จากการขาย"
  }
}
```

**Update**: `.env.example`

```bash
# Express CSV Export
EXPRESS_CHART_OF_ACCOUNTS_PATH=./config/chart-of-accounts.json
```


---

### Task 2.7: Update Environment Config

**Update**: `backend/src/config/env.ts`

Add FlowAccount OAuth variables:

```typescript
const envSchema = z.object({
  // ... existing fields ...
  
  FLOWACCOUNT_CLIENT_ID: z.string().min(1, 'FlowAccount Client ID required'),
  FLOWACCOUNT_CLIENT_SECRET: z.string().min(1, 'FlowAccount Client Secret required'),
  FLOWACCOUNT_REDIRECT_URI: z.string().url('Invalid FlowAccount redirect URI'),
  
  EXPRESS_CHART_OF_ACCOUNTS_PATH: z.string().default('./config/chart-of-accounts.json'),
});
```


---

### Task 2.8: Tests for Phase 2

**File**: `backend/tests/integration/flowaccount-oauth.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { FlowAccountOAuthService } from '@modules/flowaccount/FlowAccountOAuthService';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';

let oauthService: FlowAccountOAuthService;

beforeAll(async () => {
  await connectMongoDB();
  oauthService = new FlowAccountOAuthService();
});

afterAll(async () => {
  await disconnectMongoDB();
});

describe('FlowAccount OAuth', () => {
  test('generates authorization URL with correct parameters', () => {
    const url = oauthService.getAuthorizationURL('test-state-123');
    
    expect(url).toContain('https://openapi.flowaccount.com/oauth/authorize');
    expect(url).toContain('client_id=');
    expect(url).toContain('state=test-state-123');
    expect(url).toContain('response_type=code');
  });

  // TODO: Add mock tests for token exchange and refresh
});
```

**File**: `backend/tests/unit/express-csv-generator.test.ts`

```typescript
import { describe, test, expect } from 'bun:test';
import { ExpressCSVGenerator } from '@modules/export/ExpressCSVGenerator';

describe('Express CSV Generator', () => {
  test('generates CSV with UTF-8 BOM', () => {
    const generator = new ExpressCSVGenerator('./config/chart-of-accounts.json');
    
    const mockEntries = [
      {
        _id: '507f1f77bcf86cd799439011',
        date: new Date('2026-01-16'),
        accountCode: '5110',
        description: 'ค่าไฟฟ้า ม.ค. 2026',
        amount: 150000, // 1500 THB in satang
        type: 'debit',
        createdBy: 'system',
      },
    ];

    const csv = generator.generate(mockEntries as any);
    
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
    expect(csv).toContain('วันที่');
    expect(csv).toContain('2026-01-16');
    expect(csv).toContain('1500.00'); // Formatted amount
  });
});
```


---

### Task 2.9: Documentation

**File**: `docs/FLOWACCOUNT_INTEGRATION.md`

```markdown
# FlowAccount Integration Guide

## Overview
Auto-Acct-001 integrates with FlowAccount using OAuth 2.0 to automatically sync accounting documents.

## OAuth Setup

### Step 1: Register Application
1. Login to FlowAccount Developer Portal
2. Create new OAuth application
3. Set redirect URI: `http://localhost:4000/api/flowaccount/callback`
4. Copy Client ID and Client Secret

### Step 2: Configure Environment
Add to `.env`:
```bash
FLOWACCOUNT_CLIENT_ID=your_client_id
FLOWACCOUNT_CLIENT_SECRET=your_client_secret
FLOWACCOUNT_REDIRECT_URI=http://localhost:4000/api/flowaccount/callback
```


### Step 3: Connect Client

1. Navigate to: `http://localhost:4000/api/flowaccount/authorize?clientId=CLIENT_001`
2. User will be redirected to FlowAccount
3. After approval, redirected back to callback
4. Token stored securely (encrypted)

## Data Sync Flow

### Nightly Sync (Automated)

- Runs every night at 23:00 (configurable via cron)
- Syncs all active clients
- Processes documents from current day
- Sends Discord alerts on errors


### Manual Sync (API)

```bash
POST /api/flowaccount/sync
Content-Type: application/json

{
  "clientId": "CLIENT_001",
  "date": "2026-01-16"
}
```


## Validation Rules

### VAT Calculation

- Expected: 7% of base amount
- Tolerance: ±1 THB (100 satang)
- Warnings logged if mismatch > tolerance


### Attachment Requirement

- Required if amount > 1,000 THB
- Sync fails without attachment
- Can be overridden in Teable review


### Category Mapping

Current implementation: Rule-based

- Keyword detection (e.g., "ไฟฟ้า" → Utilities)
- Fallback to document type
- Future: ML-based classification (Phase 3)


## Troubleshooting

### Token Expired

- Tokens auto-refresh 5 minutes before expiration
- If refresh fails, `isActive` set to `false`
- User must re-authorize via `/authorize` endpoint


### Sync Errors

- Check Discord alerts for real-time notifications
- Review logs: `backend/logs/error.log`
- Common issues:
    - Missing attachments
    - VAT calculation mismatches
    - Category mapping failures


## Security

### Token Storage

- Access tokens encrypted with AES-256-GCM
- Encryption key in `.env` (never committed)
- Tokens stored in MongoDB (replica set)


### PII Protection

- Contact names and amounts sanitized in logs
- Discord alerts exclude sensitive data
- PDPA compliant


## Chart of Accounts

Mapping configured in `backend/config/chart-of-accounts.json`:

```json
{
  "5110": {
    "expressCode": "5110",
    "expressName": "ค่าไฟฟ้า"
  }
}
```

Edit this file to customize account mapping.

```

---

## Execution Instructions

**Mode**: Planning Mode → Agent Driven

**Autonomy**: Agent Driven (with checkpoints)

**GitHub**: Work on branch `feature/phase-2-flowaccount` (merge to `main` after approval)

---

## Checkpoints (Pause for Approval)

1. ✋ **After Task 2.1**: Review OAuth implementation (security critical)
2. ✋ **After Task 2.2**: Review sync service and validation logic
3. ✋ **After Task 2.5**: Review CSV export format
4. ✋ **Before git push**: Final code review

---

## Verification Steps

```bash
# 1. Pull latest code
cd Auto_Acct101
git pull origin main
git checkout -b feature/phase-2-flowaccount

# 2. Install dependencies (if new packages added)
cd backend
bun install

# 3. Run tests
bun test

# 4. Start backend
bun run dev

# 5. Test OAuth flow (manual)
# Open browser: http://localhost:4000/api/flowaccount/authorize?clientId=test-client-001
# Complete OAuth flow
# Verify token stored in MongoDB:
docker exec -it auto-acct-mongodb mongosh
> use auto_acct
> db.flowaccount_tokens.findOne({ clientId: "test-client-001" })

# 6. Test manual sync
curl -X POST http://localhost:4000/api/flowaccount/sync \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test-client-001","date":"2026-01-16"}'

# 7. Test CSV export
curl "http://localhost:4000/api/export/csv?clientId=test-client-001&startDate=2026-01-01&endDate=2026-01-31" \
  --output export.csv

# Open export.csv and verify UTF-8 BOM + Thai characters display correctly
```


---

## Success Criteria

### Functional Requirements

- ✅ OAuth flow completes successfully
- ✅ Tokens encrypted before storage
- ✅ Token auto-refresh works (test with expired token)
- ✅ Sync fetches documents from FlowAccount API
- ✅ VAT validation detects mismatches
- ✅ Attachment requirement enforced
- ✅ Category mapping works for common vendors
- ✅ Records pushed to Teable as "pending_review"
- ✅ CSV export generates valid Express format
- ✅ Nightly cron script runs without errors


### Non-Functional Requirements

- ✅ All money values use MoneyInt (no floats)
- ✅ All database writes use transactions
- ✅ All external API responses validated with Zod
- ✅ Error handling logs to winston + alerts Discord
- ✅ No PII in logs or Discord alerts
- ✅ All tests pass (`bun test`)
- ✅ TypeScript compiles without errors
- ✅ No `any` types in code

---

## Deliverables

### Code Artifacts

- ✅ OAuth models, services, controllers
- ✅ FlowAccount API client with Zod validation
- ✅ Sync service with validation engine
- ✅ Teable integration client
- ✅ Express CSV generator
- ✅ Cron script for nightly sync
- ✅ Chart of accounts configuration file


### Documentation

- ✅ FLOWACCOUNT_INTEGRATION.md (setup guide)
- ✅ Updated API.md (new endpoints)
- ✅ Updated .env.example (new variables)


### Tests

- ✅ OAuth flow tests (unit + integration)
- ✅ CSV generator tests (format validation)
- ✅ Validation engine tests (VAT, attachments)

---

## Notes for AI Agent

- **Context**: This is Phase 2 of a 3-phase project
- **Dependencies**: Requires FlowAccount Developer Account (Client ID/Secret)
- **Testing**: Use FlowAccount sandbox environment if available
- **Security**: OAuth tokens and encryption are CRITICAL - double-check implementation
- **Priority**: OAuth security > Sync reliability > Feature completeness
- **Language**: Code comments in English, user-facing docs can mix Thai/English
- **Timeline**: Should be completable in 1 week (BRIEF estimates Week 1-3 for Phase 1+2)

---

## Post-Implementation Tasks (Manual)

After agent completes Phase 2:

1. **FlowAccount Developer Portal**:
    - Register OAuth application
    - Configure redirect URI
    - Obtain Client ID/Secret
2. **Teable Setup**:
    - Create "Pending Review" table with required fields
    - Configure webhook to `/webhooks/teable`
    - Test webhook signature validation
3. **Production Deployment**:
    - Setup crontab for nightly sync
    - Configure systemd service (or PM2) for backend
    - Setup log rotation for `logs/` directory
    - Test disaster recovery (token refresh failure)
4. **User Training**:
    - Train accountants on Teable approval workflow
    - Document CSV import process into Express software
    - Create troubleshooting guide for common errors

---

**Start with Task 2.1 (OAuth implementation) and proceed sequentially. Pause at each checkpoint for security review before continuing.**

```

***

## 📋 สรุป Phase 2 Mission Prompt

### ความครอบคลุม
- **11 Tasks** ครอบคลุมทุก requirement ของ Phase 2 ตาม BRIEF[^1]
- **OAuth Security**: Encryption, CSRF protection, token refresh
- **Data Sync**: Validation engine (VAT, attachments, categories)
- **Teable Integration**: Push records for human review
- **CSV Export**: Express-compatible format with UTF-8 BOM

### จุดเด่น
1. **ความปลอดภัย**: Token encryption, PII sanitization, CSRF
2. **ความน่าเชื่อถือ**: Transaction-safe, auto-refresh, error handling
3. **ความยืดหยุ่น**: Configurable chart of accounts, rule-based categories
4. **ความพร้อม**: Production cron job, Discord alerts, comprehensive tests

### Estimated Timeline
- Agent implementation: **2-3 days** (ถ้ารันต่อเนื่อง)
- Human review + testing: **2-3 days**
- **Total: ~1 week** (ตรงตาม BRIEF)

พร้อมให้ copy ไปวางใน Antigravity ได้เลย! 🚀
<span style="display:none">[^2]</span>

<div align="center">⁂</div>

[^1]: PROJECT-BRIEF_-AUTO-ACCT-ACCOUNTING-AUTOMATION-S.pdf
[^2]: Prompt-sMaahrab-Setup-Auto_Acct101-cchaak-0-ain-Antigr.md```

