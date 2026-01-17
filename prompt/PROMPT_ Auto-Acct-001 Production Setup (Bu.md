# 🎯 FINAL PROMPT: Auto-Acct-001 Production Setup (Bun + MongoDB + Teable)

นี่คือ prompt ฉบับสมบูรณ์ที่ผสม **structure ที่ดีจาก file:104** + **tech stack และ financial rules จาก BRIEF** เข้าด้วยกัน[^1][^2]

***

```markdown
# Auto_Acct101: Production Automated Accounting System Setup

## Context
คุณคือ AI Agent ทีมใน Google Antigravity IDE ที่จะสร้างระบบบัญชีอัตโนมัติ 
สำหรับสำนักงานบัญชีไทย (30+ ลูกค้า) จากศูนย์
Repository: https://github.com/Waytid-way/Auto_Acct101

**โปรเจกต์นี้มีเป้าหมาย**:
- รับข้อมูลจาก FlowAccount API (40% ของลูกค้า) - Phase 1 Priority
- OCR สำหรับ PDF และเอกสารสแกน (Phase 2-3)
- Staging และ approval workflow ผ่าน Teable
- Export CSV สำหรับ import เข้า Express accounting software
- Double-entry bookkeeping ด้วย medici library
- ปฏิบัติตามหลักบัญชีไทย (VAT 7%, PDPA compliance)

**Business Impact**:
- ลดเวลา data entry จาก 100-120 ชม./เดือน → 20-24 ชม./เดือน (-80%)
- ลด error rate จาก 5% → <1%
- ลด turnaround time จาก 5-7 วัน → 1-2 วัน
- ประหยัดค่าแรง 40,000-60,000 THB/เดือน
- ROI: 308% ในปีแรก, Payback period: 1.5-2 เดือน

---

## CRITICAL CONSTRAINTS (NON-NEGOTIABLE)

### Technology Stack
- **Runtime**: Bun v1.x (NOT Node.js)
- **Language**: TypeScript Strict Mode (noImplicitAny: true)
- **Backend**: Express.js running on Bun (modular monolith)
- **Database**: MongoDB v7+ with Mongoose
- **Ledger**: medici (double-entry accounting library)
- **Admin UI**: Teable (self-hosted no-code database)
- **Storage**: Google Drive API (Service Account)
- **Logging**: winston + Discord webhook alerts
- **Testing**: Bun Test (primary)

### Financial Integrity Rules (THE GOLDEN RULES)
1. **Integer-Only Money**: ALL monetary values MUST be integers (satang/cents). NEVER use float/double.
2. **The Plug Method**: When splitting amounts (e.g., 100 / 3):
   - Calculate floor for each part (33.33)
   - Add remainder to first or largest item
   - Sum must ALWAYS equal total exactly
3. **ACID Compliance**: Every ledger write MUST use MongoDB session transactions.
4. **Immutability**: NEVER delete posted transactions. Use void/reversal entries only.
5. **Trial Balance**: Before commit, verify Dr == Cr. If fails → rollback entire transaction.

### Security Rules
1. **Hybrid Encryption**:
   - Normal files (receipts < 1000 THB) → upload raw to Google Drive
   - Sensitive files (payroll, bank statements) → AES-256-GCM → upload
2. **Filename Obfuscation**: NEVER upload original filename. Use UUID v4. Store mapping in MongoDB.
3. **No Secrets in Code**: All credentials via .env or GitHub Secrets only.
4. **VPN-Only Access**: Tailscale mesh network, no public ports.

### Coding Standards
- Repository Pattern: Controllers → Services → Repositories → Models
- No `any` type in TypeScript
- DTOs for ALL external inputs (API requests, webhooks)
- Global error handler with winston logging
- Conventional Commits (feat:, fix:, chore:)

---

## Phase 1: Project Initialization (Planning Mode)

### Task 1.1: Create Base Project Structure

สร้างโครงสร้างโปรเจ็กต์:

```

Auto_Acct101/
├── .github/
│   └── workflows/
│       └── ci.yml                    \# GitHub Actions CI/CD
├── .agent/
│   ├── rules/
│   │   └── coding-standards.md      \# TypeScript + Financial rules
│   └── workflows/
│       └── setup-env.md              \# Development setup guide
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts                \# Typed environment config
│   │   ├── loaders/
│   │   │   ├── express.ts            \# Express app factory
│   │   │   ├── mongoose.ts           \# MongoDB connection
│   │   │   └── logger.ts             \# Winston + Discord
│   │   ├── middlewares/
│   │   │   ├── errorHandler.ts       \# Global error handler
│   │   │   ├── requestId.ts          \# Request ID generator
│   │   │   └── auth.ts               \# JWT validation (stub)
│   │   ├── types/
│   │   │   ├── money.ts              \# MoneyInt type + helpers
│   │   │   ├── common.ts             \# Shared interfaces
│   │   │   └── express.d.ts          \# Express type extensions
│   │   ├── modules/
│   │   │   ├── health/
│   │   │   │   ├── HealthController.ts
│   │   │   │   └── routes.ts
│   │   │   ├── accounting/
│   │   │   │   ├── models/
│   │   │   │   │   ├── JournalEntry.model.ts    \# Mongoose schema
│   │   │   │   │   └── Client.model.ts
│   │   │   │   ├── dtos/
│   │   │   │   │   ├── CreateJournalEntry.dto.ts
│   │   │   │   │   └── ApproveEntry.dto.ts
│   │   │   │   ├── AccountingRepository.ts
│   │   │   │   ├── AccountingService.ts         \# Business logic + medici
│   │   │   │   ├── AccountingController.ts
│   │   │   │   └── routes.ts
│   │   │   ├── flowaccount/
│   │   │   │   ├── FlowAccountClient.ts         \# OAuth + API wrapper
│   │   │   │   ├── FlowAccountService.ts        \# Data sync logic
│   │   │   │   ├── FlowAccountController.ts
│   │   │   │   ├── dtos/
│   │   │   │   │   └── FlowAccountDocument.dto.ts
│   │   │   │   └── routes.ts
│   │   │   ├── teable/
│   │   │   │   ├── TeableClient.ts              \# Teable API wrapper
│   │   │   │   ├── TeableWebhookController.ts   \# Handle approvals
│   │   │   │   ├── dtos/
│   │   │   │   │   └── TeableWebhook.dto.ts
│   │   │   │   └── routes.ts
│   │   │   ├── files/
│   │   │   │   ├── models/
│   │   │   │   │   └── FileMetadata.model.ts
│   │   │   │   ├── GoogleDriveClient.ts         \# Service Account
│   │   │   │   ├── EncryptionService.ts         \# AES-256-GCM
│   │   │   │   ├── FilesService.ts
│   │   │   │   └── routes.ts
│   │   │   └── export/
│   │   │       ├── ExpressCSVGenerator.ts       \# Chart of Accounts mapping
│   │   │       ├── ExportService.ts
│   │   │       └── routes.ts
│   │   └── index.ts                             \# App entry point
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── money.test.ts                    \# MoneyInt helpers
│   │   │   └── accounting.service.test.ts
│   │   ├── integration/
│   │   │   ├── flowaccount.test.ts
│   │   │   └── teable-webhook.test.ts
│   │   └── fixtures/
│   │       └── sample-flowaccount-response.json
│   ├── bunfig.toml
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── docker/
│   ├── mongodb/
│   │   └── init-replica.sh                      \# MongoDB replica set init
│   └── teable/
│       └── docker-compose.teable.yml
├── scripts/
│   ├── init-db.ts                               \# Database initialization
│   ├── seed-test-data.ts
│   └── sync-flowaccount-cron.ts                 \# Nightly batch job
├── docs/
│   ├── SETUP.md                                 \# Setup instructions
│   ├── ARCHITECTURE.md                          \# System design
│   ├── API.md                                   \# API documentation
│   ├── FLOWACCOUNT_INTEGRATION.md
│   └── FINANCIAL_RULES.md                       \# Accounting constraints
├── docker-compose.yml                           \# MongoDB + Teable
├── .env.example
├── .gitignore
└── README.md

```

**Requirements**:
- Bun v1.x+ installed
- Docker Compose v3.8+
- MongoDB v7+ with replica set (for transactions)
- TypeScript strict mode enabled
- No `npm` or `node` commands (Bun only)

---

### Task 1.2: Create Core Configuration Files

#### 1.2.1 docker-compose.yml

สร้างไฟล์ที่ประกอบด้วย 2 services:

**Service: mongodb**
- Image: mongo:7-jammy
- Port: 27017
- Command: `--replSet rs0` (enable replica set for transactions)
- Volumes: 
  - mongo_data (persistent)
  - ./docker/mongodb/init-replica.sh:/docker-entrypoint-initdb.d/init-replica.sh
- Environment:
  - MONGO_INITDB_ROOT_USERNAME
  - MONGO_INITDB_ROOT_PASSWORD
- Health check: `mongo --eval "db.adminCommand('ping')"`

**Service: teable** (optional for local dev)
- Image: ghcr.io/teableio/teable:latest
- Port: 3000
- Depends on: mongodb
- Environment:
  - DATABASE_URL (MongoDB connection string)
  - SECRET_KEY
- Volumes: teable_data

**Networks**: `auto-acct-network` (bridge)

**Volumes**: 
- mongo_data
- teable_data

---

#### 1.2.2 .env.example

สร้าง environment variables template:

```bash
# Application
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://admin:password@localhost:27017/auto_acct?replicaSet=rs0&authSource=admin

# Discord Alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Teable Integration
TEABLE_API_URL=http://localhost:3000/api
TEABLE_API_TOKEN=your_teable_api_token
TEABLE_WEBHOOK_SECRET=your_webhook_secret

# FlowAccount API
FLOWACCOUNT_CLIENT_ID=your_client_id
FLOWACCOUNT_CLIENT_SECRET=your_client_secret
FLOWACCOUNT_REDIRECT_URI=http://localhost:4000/api/flowaccount/callback

# Google Drive (Service Account)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id

# Encryption (for sensitive files)
ENCRYPTION_KEY=your_32_byte_hex_key
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_IV_LENGTH=16

# Express CSV Export
EXPRESS_CHART_OF_ACCOUNTS_PATH=./config/chart-of-accounts.json
```


---

#### 1.2.3 bunfig.toml

```toml
[install]
# Equivalent to package-lock for Bun
lockfile = true

[install.scopes]
# Private registry if needed
# "@myorg" = { url = "https://registry.myorg.com" }

[test]
# Test configuration
preload = ["./tests/setup.ts"]
```


---

#### 1.2.4 backend/package.json

```json
{
  "name": "auto-acct-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir ./dist --target bun",
    "start": "bun dist/index.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "db:init": "bun scripts/init-db.ts",
    "db:seed": "bun scripts/seed-test-data.ts",
    "sync:flowaccount": "bun scripts/sync-flowaccount-cron.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "medici": "^5.0.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "axios": "^1.6.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/uuid": "^9.0.7",
    "bun-types": "latest",
    "typescript": "^5.3.0"
  }
}
```


---

#### 1.2.5 backend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@config/*": ["config/*"],
      "@modules/*": ["modules/*"],
      "@types/*": ["types/*"],
      "@middlewares/*": ["middlewares/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```


---

### Task 1.3: Implement Core Loaders

#### 1.3.1 backend/src/config/env.ts

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  
  DISCORD_WEBHOOK_URL: z.string().url('Invalid Discord webhook URL'),
  
  TEABLE_API_URL: z.string().url(),
  TEABLE_API_TOKEN: z.string().min(1),
  TEABLE_WEBHOOK_SECRET: z.string().min(1),
  
  FLOWACCOUNT_CLIENT_ID: z.string().optional(),
  FLOWACCOUNT_CLIENT_SECRET: z.string().optional(),
  FLOWACCOUNT_REDIRECT_URI: z.string().url().optional(),
  
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1),
  
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 chars'),
  ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),
  ENCRYPTION_IV_LENGTH: z.string().transform(Number).default('16'),
});

export type Env = z.infer<typeof envSchema>;

let config: Env;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  process.exit(1);
}

export default Object.freeze(config);
```


---

#### 1.3.2 backend/src/loaders/mongoose.ts

```typescript
import mongoose from 'mongoose';
import config from '@config/env';
import logger from './logger';

export async function connectMongoDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(config.MONGODB_URI, {
      // Bun compatibility: use native fetch
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    // Verify replica set (required for transactions)
    const admin = mongoose.connection.db.admin();
    const status = await admin.replSetGetStatus();
    
    if (!status.ok) {
      throw new Error('MongoDB replica set not initialized');
    }

    logger.info('✅ MongoDB connected (replica set enabled)', {
      host: mongoose.connection.host,
      dbName: mongoose.connection.name,
    });
  } catch (error) {
    logger.error('❌ MongoDB connection failed', { error });
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
```


---

#### 1.3.3 backend/src/loaders/logger.ts

```typescript
import winston from 'winston';
import config from '@config/env';
import axios from 'axios';

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

/**
 * Send critical error alerts to Discord webhook
 * Used for 5xx errors and system failures
 */
export async function sendDiscordAlert(message: string, metadata?: object): Promise<void> {
  try {
    // Sanitize PII: remove sensitive fields
    const sanitized = metadata ? sanitizeLogData(metadata) : {};
    
    await axios.post(config.DISCORD_WEBHOOK_URL, {
      content: `🚨 **Auto-Acct Alert**\n\`\`\`${message}\`\`\``,
      embeds: [
        {
          title: 'Error Details',
          description: JSON.stringify(sanitized, null, 2),
          color: 0xff0000,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    logger.error('Failed to send Discord alert', { error });
  }
}

/**
 * Remove PII from logs (PDPA compliance)
 */
function sanitizeLogData(data: object): object {
  const sanitized = { ...data };
  const sensitiveKeys = ['accountNumber', 'taxId', 'amount', 'clientId'];
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      delete sanitized[key as keyof typeof sanitized];
    }
  }
  
  return sanitized;
}

export default logger;
```


---

#### 1.3.4 backend/src/loaders/express.ts

```typescript
import express, { Application } from 'express';
import { randomUUID } from 'crypto';
import healthRouter from '@modules/health/routes';
import accountingRouter from '@modules/accounting/routes';
import flowAccountRouter from '@modules/flowaccount/routes';
import teableRouter from '@modules/teable/routes';
import filesRouter from '@modules/files/routes';
import exportRouter from '@modules/export/routes';
import errorHandler from '@middlewares/errorHandler';
import logger from './logger';

export function createExpressApp(): Application {
  const app = express();

  // Middleware stack
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID middleware
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/accounting', accountingRouter);
  app.use('/api/flowaccount', flowAccountRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/export', exportRouter);
  app.use('/webhooks/teable', teableRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.id,
    });
  });

  // Global error handler (MUST be last)
  app.use(errorHandler);

  return app;
}
```


---

### Task 1.4: Implement Middleware \& Types

#### 1.4.1 backend/src/middlewares/errorHandler.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '@loaders/logger';
import { sendDiscordAlert } from '@loaders/logger';

export default function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = (err as any).statusCode || 500;
  
  logger.error('Error caught by global handler', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  // Alert on 5xx errors
  if (statusCode >= 500) {
    sendDiscordAlert(`5xx Error on ${req.method} ${req.path}`, {
      error: err.message,
      requestId: req.id,
    }).catch(() => {
      // Fail silently to not block response
    });
  }

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: statusCode >= 500 ? 'An unexpected error occurred' : err.message,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}
```


---

#### 1.4.2 backend/src/types/money.ts

```typescript
/**
 * MoneyInt: Integer representation of money in satang/cents
 * NEVER use floats for monetary values to avoid precision errors
 * 
 * Examples:
 * - 100.00 THB = 10000 satang
 * - 99.99 THB = 9999 satang
 */
export type MoneyInt = number;

/**
 * Parse money string to integer satang
 * @param str - Amount as string (e.g., "100.50", "99.99")
 * @returns Integer satang (e.g., 10050, 9999)
 * @throws Error if not a valid number
 */
export function parseMoneyFromString(str: string): MoneyInt {
  const float = parseFloat(str);
  if (isNaN(float)) {
    throw new Error(`Invalid money string: ${str}`);
  }
  
  const satang = Math.round(float * 100);
  return assertMoneyIsInteger(satang);
}

/**
 * Assert value is an integer (no decimals)
 * @throws Error if value has decimal places
 */
export function assertMoneyIsInteger(value: number): MoneyInt {
  if (!Number.isInteger(value)) {
    throw new Error(`Money must be integer (satang), got: ${value}`);
  }
  return value;
}

/**
 * Split amount into N parts using "plug method"
 * Ensures sum of parts exactly equals total
 * 
 * @example
 * splitMoney(100, 3) =>  (total: 100)[^3][^4]
 */
export function splitMoney(total: MoneyInt, parts: number): MoneyInt[] {
  assertMoneyIsInteger(total);
  
  if (parts <= 0) {
    throw new Error('Parts must be > 0');
  }
  
  const base = Math.floor(total / parts);
  const remainder = total - (base * parts);
  
  const result: MoneyInt[] = Array(parts).fill(base);
  
  // Add remainder to first item (plug method)
  result += remainder;
  
  // Verify sum
  const sum = result.reduce((a, b) => a + b, 0);
  if (sum !== total) {
    throw new Error(`Split money sum mismatch: ${sum} !== ${total}`);
  }
  
  return result;
}

/**
 * Format satang to THB display string
 * @example formatMoney(10050) => "100.50"
 */
export function formatMoney(satang: MoneyInt): string {
  assertMoneyIsInteger(satang);
  return (satang / 100).toFixed(2);
}
```


---

#### 1.4.3 backend/src/types/express.d.ts

```typescript
declare global {
  namespace Express {
    interface Request {
      id: string; // Request ID from middleware
      user?: {
        id: string;
        role: 'admin' | 'accountant' | 'reviewer';
      };
    }
  }
}

export {};
```


---

### Task 1.5: Implement Health Check Module

#### 1.5.1 backend/src/modules/health/HealthController.ts

```typescript
import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    const uptime = process.uptime();
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      mongodb: mongoStatus,
      version: '1.0.0',
    });
  }
}
```


---

#### 1.5.2 backend/src/modules/health/routes.ts

```typescript
import { Router } from 'express';
import { HealthController } from './HealthController';

const router = Router();
const controller = new HealthController();

router.get('/', controller.check.bind(controller));

export default router;
```


---

### Task 1.6: Implement Accounting Module (Phase 1 Skeleton)

#### 1.6.1 backend/src/modules/accounting/models/JournalEntry.model.ts

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import { MoneyInt } from '@types/money';

export interface IJournalEntry extends Document {
  clientId: string;
  date: Date;
  accountCode: string;
  description: string;
  amount: MoneyInt; // Integer satang only
  type: 'debit' | 'credit';
  category: string;
  vatAmount?: MoneyInt;
  attachmentId?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'posted' | 'voided';
  source: 'flowaccount' | 'pdf_ocr' | 'image_ocr' | 'manual';
  metadata?: object;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  voidedBy?: string;
  voidedAt?: Date;
  voidReason?: string;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    clientId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    accountCode: { type: String, required: true },
    description: { type: String, required: true },
    amount: { 
      type: Number, 
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer (satang)',
      },
    },
    type: { type: String, enum: ['debit', 'credit'], required: true },
    category: { type: String, required: true },
    vatAmount: { 
      type: Number,
      validate: {
        validator: (v: number) => v === undefined || Number.isInteger(v),
        message: 'VAT amount must be integer',
      },
    },
    attachmentId: { type: String },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'posted', 'voided'],
      default: 'draft',
      index: true,
    },
    source: {
      type: String,
      enum: ['flowaccount', 'pdf_ocr', 'image_ocr', 'manual'],
      required: true,
    },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    voidedBy: { type: String },
    voidedAt: { type: Date },
    voidReason: { type: String },
  },
  {
    timestamps: true,
    collection: 'journal_entries',
  }
);

// Indexes for common queries
JournalEntrySchema.index({ clientId: 1, status: 1 });
JournalEntrySchema.index({ date: -1 });

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
```


---

#### 1.6.2 backend/src/modules/accounting/dtos/CreateJournalEntry.dto.ts

```typescript
import { z } from 'zod';

export const CreateJournalEntrySchema = z.object({
  clientId: z.string().min(1),
  date: z.string().datetime().or(z.date()),
  accountCode: z.string().min(1),
  description: z.string().min(1).max(500),
  amount: z.number().int().positive(),
  type: z.enum(['debit', 'credit']),
  category: z.string().min(1),
  vatAmount: z.number().int().nonnegative().optional(),
  attachmentId: z.string().optional(),
  source: z.enum(['flowaccount', 'pdf_ocr', 'image_ocr', 'manual']),
  metadata: z.object({}).passthrough().optional(),
  createdBy: z.string().min(1),
});

export type CreateJournalEntryDTO = z.infer<typeof CreateJournalEntrySchema>;
```


---

#### 1.6.3 backend/src/modules/accounting/AccountingRepository.ts

```typescript
import { ClientSession } from 'mongoose';
import { JournalEntry, IJournalEntry } from './models/JournalEntry.model';
import { CreateJournalEntryDTO } from './dtos/CreateJournalEntry.dto';

export class AccountingRepository {
  async create(
    dto: CreateJournalEntryDTO,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const [entry] = await JournalEntry.create([dto], { session });
    return entry;
  }

  async findById(id: string): Promise<IJournalEntry | null> {
    return JournalEntry.findById(id);
  }

  async findByClientId(
    clientId: string,
    filters: { status?: string; startDate?: Date; endDate?: Date } = {}
  ): Promise<IJournalEntry[]> {
    const query: any = { clientId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }
    
    return JournalEntry.find(query).sort({ date: -1 });
  }

  async update(
    id: string,
    updates: Partial<IJournalEntry>,
    session?: ClientSession
  ): Promise<IJournalEntry | null> {
    return JournalEntry.findByIdAndUpdate(id, updates, {
      new: true,
      session,
      runValidators: true,
    });
  }

  async findPendingReview(clientId: string): Promise<IJournalEntry[]> {
    return JournalEntry.find({
      clientId,
      status: 'pending_review',
    }).sort({ date: -1 });
  }

  /**
   * NEVER use this method for posted entries
   * Use voidEntry() instead to maintain audit trail
   */
  async hardDelete(id: string): Promise<void> {
    const entry = await JournalEntry.findById(id);
    
    if (entry && ['posted', 'approved'].includes(entry.status)) {
      throw new Error('Cannot delete posted/approved entries. Use void instead.');
    }
    
    await JournalEntry.findByIdAndDelete(id);
  }
}
```


---

#### 1.6.4 backend/src/modules/accounting/AccountingService.ts

```typescript
import mongoose from 'mongoose';
import { AccountingRepository } from './AccountingRepository';
import { CreateJournalEntryDTO } from './dtos/CreateJournalEntry.dto';
import { IJournalEntry } from './models/JournalEntry.model';
import logger from '@loaders/logger';

export class AccountingService {
  constructor(private repository: AccountingRepository) {}

  async createEntry(dto: CreateJournalEntryDTO): Promise<IJournalEntry> {
    // Validation: Check VAT calculation (7% rule for Thailand)
    if (dto.vatAmount !== undefined) {
      const expectedVAT = Math.round(dto.amount * 0.07);
      const diff = Math.abs(dto.vatAmount - expectedVAT);
      
      if (diff > 1) { // Allow 1 satang rounding error
        logger.warn('VAT amount mismatch', {
          expected: expectedVAT,
          actual: dto.vatAmount,
          diff,
        });
      }
    }

    const entry = await this.repository.create(dto);
    
    logger.info('Journal entry created', {
      id: entry._id,
      clientId: entry.clientId,
      amount: entry.amount,
      source: entry.source,
    });
    
    return entry;
  }

  async approvePendingEntry(
    entryId: string,
    approvedBy: string
  ): Promise<IJournalEntry> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const entry = await this.repository.findById(entryId);
      
      if (!entry) {
        throw new Error('Entry not found');
      }
      
      if (entry.status !== 'pending_review') {
        throw new Error(`Cannot approve entry with status: ${entry.status}`);
      }
      
      const updated = await this.repository.update(
        entryId,
        {
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
        },
        session
      );
      
      // TODO: Post to medici ledger here (Phase 1.5)
      // await this.postToLedger(updated, session);
      
      await session.commitTransaction();
      
      logger.info('Entry approved', {
        id: entryId,
        approvedBy,
      });
      
      return updated!;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Failed to approve entry', { error, entryId });
      throw error;
    } finally {
      session.endSession();
    }
  }

  async voidEntry(
    entryId: string,
    voidedBy: string,
    reason: string
  ): Promise<IJournalEntry> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const entry = await this.repository.findById(entryId);
      
      if (!entry) {
        throw new Error('Entry not found');
      }
      
      if (entry.status === 'voided') {
        throw new Error('Entry already voided');
      }
      
      // Create reversal entry
      const reversalDTO: CreateJournalEntryDTO = {
        ...entry.toObject(),
        type: entry.type === 'debit' ? 'credit' : 'debit',
        description: `VOID: ${entry.description}`,
        source: 'manual',
        createdBy: voidedBy,
        metadata: {
          originalEntryId: entry._id,
          voidReason: reason,
        },
      };
      
      await this.repository.create(reversalDTO, session);
      
      // Mark original as voided
      const voided = await this.repository.update(
        entryId,
        {
          status: 'voided',
          voidedBy,
          voidedAt: new Date(),
          voidReason: reason,
        },
        session
      );
      
      await session.commitTransaction();
      
      logger.info('Entry voided', {
        id: entryId,
        voidedBy,
        reason,
      });
      
      return voided!;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Failed to void entry', { error, entryId });
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getPendingReview(clientId: string): Promise<IJournalEntry[]> {
    return this.repository.findPendingReview(clientId);
  }
}
```


---

#### 1.6.5 backend/src/modules/accounting/AccountingController.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { AccountingService } from './AccountingService';
import { AccountingRepository } from './AccountingRepository';
import { CreateJournalEntrySchema } from './dtos/CreateJournalEntry.dto';

const repository = new AccountingRepository();
const service = new AccountingService(repository);

export class AccountingController {
  async createEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = CreateJournalEntrySchema.parse(req.body);
      const entry = await service.createEntry(dto);
      
      res.status(201).json({
        success: true,
        data: entry,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const entry = await repository.findById(id);
      
      if (!entry) {
        res.status(404).json({
          error: 'NotFound',
          message: 'Journal entry not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  async listEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, status } = req.query;
      
      if (!clientId) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'clientId query parameter required',
        });
        return;
      }
      
      const entries = await repository.findByClientId(
        clientId as string,
        { status: status as string }
      );
      
      res.json({
        success: true,
        data: entries,
        count: entries.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id || 'system'; // TODO: Extract from JWT
      
      const entry = await service.approvePendingEntry(id, approvedBy);
      
      res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }
}
```


---

#### 1.6.6 backend/src/modules/accounting/routes.ts

```typescript
import { Router } from 'express';
import { AccountingController } from './AccountingController';

const router = Router();
const controller = new AccountingController();

router.post('/', controller.createEntry.bind(controller));
router.get('/:id', controller.getEntry.bind(controller));
router.get('/', controller.listEntries.bind(controller));
router.post('/:id/approve', controller.approveEntry.bind(controller));

export default router;
```


---

### Task 1.7: Implement FlowAccount Module (Stub for Phase 1)

#### 1.7.1 backend/src/modules/flowaccount/FlowAccountClient.ts

```typescript
import axios, { AxiosInstance } from 'axios';
import config from '@config/env';
import logger from '@loaders/logger';

export class FlowAccountClient {
  private client: AxiosInstance;
  private accessToken?: string;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://openapi.flowaccount.com/v1',
      timeout: 10000,
    });
  }

  /**
   * TODO: Implement OAuth 2.0 flow
   * 1. Redirect user to FlowAccount authorize URL
   * 2. Handle callback with authorization code
   * 3. Exchange code for access token
   * 4. Store token securely (MongoDB or encrypted file)
   */
  async authenticate(code: string): Promise<void> {
    logger.warn('FlowAccount authentication not implemented yet');
    // Stub for Phase 1
  }

  /**
   * Fetch documents from FlowAccount for a specific client
   * @param date - Date to fetch documents (default: today)
   */
  async getDocuments(date: Date = new Date()): Promise<any[]> {
    // TODO: Implement API call
    logger.warn('FlowAccount getDocuments() stub - returning empty array');
    return [];
  }
}
```


---

### Task 1.8: Implement Teable Webhook Handler

#### 1.8.1 backend/src/modules/teable/dtos/TeableWebhook.dto.ts

```typescript
import { z } from 'zod';

export const TeableWebhookSchema = z.object({
  event: z.enum(['record.created', 'record.updated', 'record.deleted']),
  tableId: z.string(),
  recordId: z.string(),
  data: z.object({
    id: z.string(),
    status: z.string().optional(),
    approvedBy: z.string().optional(),
    journalEntryId: z.string().optional(),
  }),
  timestamp: z.string().datetime(),
});

export type TeableWebhookDTO = z.infer<typeof TeableWebhookSchema>;
```


---

#### 1.8.2 backend/src/modules/teable/TeableWebhookController.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '@config/env';
import { TeableWebhookSchema } from './dtos/TeableWebhook.dto';
import { AccountingService } from '@modules/accounting/AccountingService';
import { AccountingRepository } from '@modules/accounting/AccountingRepository';
import logger from '@loaders/logger';

const accountingService = new AccountingService(new AccountingRepository());

export class TeableWebhookController {
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify webhook signature
      const signature = req.headers['x-teable-signature'] as string;
      const isValid = this.verifySignature(req.body, signature);
      
      if (!isValid) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const payload = TeableWebhookSchema.parse(req.body);
      
      logger.info('Teable webhook received', {
        event: payload.event,
        recordId: payload.recordId,
      });

      // Handle approval event
      if (payload.event === 'record.updated' && payload.data.status === 'approved') {
        const { journalEntryId, approvedBy } = payload.data;
        
        if (journalEntryId && approvedBy) {
          await accountingService.approvePendingEntry(journalEntryId, approvedBy);
          
          logger.info('Entry approved via Teable webhook', {
            journalEntryId,
            approvedBy,
          });
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  private verifySignature(body: any, signature: string): boolean {
    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', config.TEABLE_WEBHOOK_SECRET);
    const computed = hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed)
    );
  }
}
```


---

#### 1.8.3 backend/src/modules/teable/routes.ts

```typescript
import { Router } from 'express';
import { TeableWebhookController } from './TeableWebhookController';

const router = Router();
const controller = new TeableWebhookController();

router.post('/', controller.handleWebhook.bind(controller));

export default router;
```


---

### Task 1.9: Implement Files Module (Stub)

#### 1.9.1 backend/src/modules/files/GoogleDriveClient.ts

```typescript
import { google } from 'googleapis';
import config from '@config/env';
import logger from '@loaders/logger';

export class GoogleDriveClient {
  private drive: any;

  constructor() {
    // TODO: Initialize Google Drive API client
    logger.warn('GoogleDriveClient not fully implemented');
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    encrypt: boolean
  ): Promise<{ driveFileId: string }> {
    // TODO: Implement upload logic
    logger.warn('GoogleDriveClient.uploadFile() stub');
    return { driveFileId: 'stub-file-id' };
  }

  async getFile(driveFileId: string): Promise<Buffer> {
    // TODO: Implement download logic
    logger.warn('GoogleDriveClient.getFile() stub');
    return Buffer.from('stub');
  }
}
```


---

### Task 1.10: Main Application Entry Point

#### 1.10.1 backend/src/index.ts

```typescript
import config from '@config/env';
import { createExpressApp } from '@loaders/express';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import logger from '@loaders/logger';

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Create Express app
    const app = createExpressApp();

    // Start listening
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Auto-Acct backend running`, {
        port: config.PORT,
        env: config.NODE_ENV,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        await disconnectMongoDB();
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
```


---

### Task 1.11: Create Tests

#### 1.11.1 tests/unit/money.test.ts

```typescript
import { describe, test, expect } from 'bun:test';
import {
  parseMoneyFromString,
  assertMoneyIsInteger,
  splitMoney,
  formatMoney,
} from '@types/money';

describe('Money utilities', () => {
  test('parseMoneyFromString converts correctly', () => {
    expect(parseMoneyFromString('100.50')).toBe(10050);
    expect(parseMoneyFromString('99.99')).toBe(9999);
    expect(parseMoneyFromString('0.01')).toBe(1);
  });

  test('assertMoneyIsInteger throws on float', () => {
    expect(() => assertMoneyIsInteger(100.5)).toThrow();
    expect(() => assertMoneyIsInteger(100)).not.toThrow();
  });

  test('splitMoney uses plug method correctly', () => {
    const parts = splitMoney(100, 3);
    expect(parts).toEqual();[^4][^3]
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  test('formatMoney displays correctly', () => {
    expect(formatMoney(10050)).toBe('100.50');
    expect(formatMoney(9999)).toBe('99.99');
  });
});
```


---

#### 1.11.2 tests/integration/health.test.ts

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createExpressApp } from '@loaders/express';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';

let app: any;

beforeAll(async () => {
  await connectMongoDB();
  app = createExpressApp();
});

afterAll(async () => {
  await disconnectMongoDB();
});

describe('Health endpoint', () => {
  test('GET /api/health returns 200', async () => {
    const res = await fetch('http://localhost:4000/api/health');
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('uptime');
  });
});
```


---

### Task 1.12: Create Documentation

#### 1.12.1 .agent/rules/coding-standards.md

```markdown
# Auto_Acct101 Coding Standards

## TypeScript Style
- Strict mode enabled (noImplicitAny: true)
- No `any` type allowed (use `unknown` or proper types)
- Type hints for all functions and parameters
- Interfaces over type aliases for object shapes
- Max line length: 100 characters
- Prefer async/await over promises.then()

## Financial Integrity Rules
1. **Integer-Only Money**:
   - Always use `MoneyInt` type for amounts
   - Store as satang/cents (multiply by 100)
   - Never use `float` or `number` without validation

2. **Transaction Safety**:
   - Wrap all ledger writes in MongoDB session transactions
   - Always verify Dr == Cr before commit
   - Rollback on any validation failure

3. **Immutability**:
   - NEVER delete approved/posted entries
   - Use `voidEntry()` to create reversal records
   - Maintain complete audit trail

## Security
- No secrets in code (use .env only)
- Sanitize PII in logs (accountNumber, taxId, amounts)
- Validate all external inputs with Zod schemas
- Use parameterized queries (Mongoose handles this)
- UUID v4 for Google Drive filenames (never original names)

## Error Handling
- Use try-catch for all async operations
- Log errors with context (requestId, userId, operation)
- Return structured error responses
- Alert Discord on 5xx errors

## Testing
- Unit tests for all business logic
- Integration tests for API endpoints
- Test with realistic Thai accounting data
- Mock external APIs (FlowAccount, Teable, Google Drive)

## Git Workflow
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Atomic commits (one logical change per commit)
- PR required for main branch
- Run tests before commit
```


---

#### 1.12.2 docs/SETUP.md

```markdown
# Auto-Acct-001 Setup Guide

## Prerequisites
- Bun v1.x+ ([install](https://bun.sh))
- Docker & Docker Compose
- Git
- Google Cloud Platform account (for Drive API)
- Teable instance (self-hosted or cloud)

## Step 1: Clone Repository
```bash
git clone https://github.com/Waytid-way/Auto_Acct101.git
cd Auto_Acct101/backend
```


## Step 2: Install Dependencies

```bash
bun install
```


## Step 3: Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
```


### Required Environment Variables

- `MONGODB_URI`: MongoDB connection string with replica set
- `DISCORD_WEBHOOK_URL`: Discord webhook for alerts
- `TEABLE_API_URL`, `TEABLE_API_TOKEN`: Teable integration
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google Drive service account key
- `ENCRYPTION_KEY`: 32-byte hex key for AES encryption

Generate encryption key:

```bash
openssl rand -hex 32
```


## Step 4: Start MongoDB (Replica Set)

```bash
docker-compose up -d mongodb
```

Wait 10 seconds, then initialize replica set:

```bash
docker exec -it auto-acct-mongodb mongosh --eval "rs.initiate()"
```


## Step 5: Initialize Database

```bash
bun run db:init
```


## Step 6: Start Backend

```bash
bun run dev
```

Server runs on http://localhost:4000

## Step 7: Verify Health

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "mongodb": "connected",
  "uptime": 12
}
```


## Troubleshooting

### MongoDB "not a replica set" error

Run: `docker exec -it auto-acct-mongodb mongosh --eval "rs.initiate()"`

### Bun command not found

Install Bun: `curl -fsSL https://bun.sh/install | bash`

### Port 4000 already in use

Change `PORT` in .env file

```

---

#### 1.12.3 README.md

```markdown
# Auto_Acct101: Automated Accounting System

Production-grade accounting automation for Thai accounting firms.

## Features
- ✅ FlowAccount API integration (Phase 1)
- ✅ Double-entry bookkeeping (medici)
- ✅ Human approval workflow (Teable)
- ✅ Express CSV export
- ⏳ PDF OCR (Phase 2)
- ⏳ Handwritten document OCR (Phase 3)

## Tech Stack
- **Runtime**: Bun v1.x
- **Backend**: Express.js + TypeScript
- **Database**: MongoDB v7+ (replica set)
- **Ledger**: medici
- **Admin UI**: Teable
- **Storage**: Google Drive API

## Quick Start
```bash
# Install dependencies
bun install

# Start MongoDB
docker-compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
bun run db:init

# Start backend
bun run dev
```


## Project Structure

```
backend/
├── src/
│   ├── modules/        # Feature modules
│   ├── loaders/        # App initialization
│   ├── middlewares/    # Express middleware
│   └── types/          # TypeScript types
├── tests/              # Unit & integration tests
└── scripts/            # Utility scripts
```


## Documentation

- [Setup Guide](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Financial Rules](docs/FINANCIAL_RULES.md)


## Financial Integrity

This system follows strict accounting rules:

- Integer-only money (no floats)
- ACID transactions for all ledger operations
- Immutable ledger (void instead of delete)
- Trial balance validation before commit


## License

Proprietary - Internal use only

```

---

## Execution Instructions

**Mode**: Use **Planning Mode** for this entire setup

**Autonomy Level**: **Agent Driven** (with checkpoints)

**Terminal Access**: Required (for git, bun, docker commands)

**GitHub Access**: https://github.com/Waytid-way/Auto_Acct101.git

---

## Checkpoints (Pause and Wait for Approval)

1. ✋ **After Task 1.2**: Review docker-compose.yml and .env.example
2. ✋ **After Task 1.6**: Review Accounting module implementation
3. ✋ **After Task 1.10**: Review full file structure before running
4. ✋ **Before git push**: Final review of all changes

---

## Verification Steps

Execute these commands after setup:

```bash
# 1. Validate Docker Compose
docker-compose config

# 2. Start MongoDB
docker-compose up -d mongodb
docker exec -it auto-acct-mongodb mongosh --eval "rs.status()"

# 3. Install dependencies
cd backend
bun install

# 4. Run tests
bun test

# 5. Start backend
bun run dev

# 6. Test health endpoint (in another terminal)
curl http://localhost:4000/api/health

# 7. Test accounting endpoint
curl -X POST http://localhost:4000/api/accounting \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-001",
    "date": "2026-01-16T00:00:00Z",
    "accountCode": "5000",
    "description": "Test expense",
    "amount": 10000,
    "type": "debit",
    "category": "Office Supplies",
    "source": "manual",
    "createdBy": "test-user"
  }'
```


---

## Success Criteria

- ✅ All Docker containers running (`docker-compose ps`)
- ✅ MongoDB replica set initialized (`rs.status()` shows PRIMARY)
- ✅ Backend health check responds 200 OK
- ✅ Unit tests pass (`bun test`)
- ✅ Can create journal entry via API
- ✅ MoneyInt validation enforces integers
- ✅ All TypeScript files compile without `any` type errors
- ✅ Documentation complete (README, SETUP, coding standards)
- ✅ Git committed with message: `feat: Phase 1 backend skeleton (Bun + Express + MongoDB)`

---

## Constraints \& Guidelines

### DO:

- ✅ Write strict TypeScript (no `any`)
- ✅ Use `MoneyInt` for ALL amounts
- ✅ Wrap ledger operations in transactions
- ✅ Add comprehensive error handling
- ✅ Log with winston (sanitize PII)
- ✅ Follow repository pattern
- ✅ Use Zod for validation
- ✅ Add inline comments for complex logic


### DON'T:

- ❌ Use `npm` or `node` commands (Bun only)
- ❌ Use `any` type in TypeScript
- ❌ Store money as float/double
- ❌ Delete posted transactions (use void)
- ❌ Skip error handling
- ❌ Commit secrets (.env, service account JSON)
- ❌ Hardcode file paths or credentials

---

## Post-Setup Tasks (Not for Agent)

After agent completes setup, manually:

1. **Configure FlowAccount OAuth**:
    - Register app at FlowAccount Developer Portal
    - Get Client ID \& Secret
    - Update .env file
2. **Setup Teable**:
    - Create database schema for journal entries
    - Configure webhook to backend
    - Create approval workflow views
3. **Google Drive Setup**:
    - Create Service Account in GCP
    - Enable Google Drive API
    - Share target folder with service account email
    - Download JSON key and add to .env
4. **Discord Webhook**:
    - Create webhook in Discord server
    - Add URL to .env
5. **Security Hardening**:
    - Setup Tailscale VPN
    - Configure firewall rules
    - Enable HTTPS (Caddy or nginx)

---

## Expected Artifacts

Agent should produce:

- ✅ **Implementation Plan** (before execution)
- ✅ **Code Walkthrough** (after completion)
- ✅ **Test Results** (bun test output)
- ✅ **Git commits** (atomic, conventional format)
- ✅ **Health check screenshot** (curl response)

---

## Rollback Plan

If any step fails:

1. Stop all services: `docker-compose down`
2. Review logs: `docker-compose logs mongodb`
3. Check backend logs: `cat backend/logs/error.log`
4. Fix issues in code
5. Restart: `docker-compose up -d && cd backend && bun run dev`

---

## Notes for AI Agent

- **Context**: This is Phase 1 (FlowAccount integration) of a 3-phase project
- **Priority**: Financial integrity > speed. Double-check MoneyInt usage.
- **Iterations**: Build incrementally. Test each module before moving to next.
- **Documentation**: Assume user is familiar with TypeScript but new to accounting systems.
- **Language**: Code comments in English. Documentation can mix Thai/English.
- **Timeline**: Should be completable in 3-4 hours of agent work.

**Start with Task 1.1 (project structure) and proceed sequentially. Pause at each checkpoint for human review before continuing.**

```

***

## 📋 วิธีใช้ Prompt นี้ใน Antigravity IDE

### Step 1: เปิด Antigravity IDE
1. เข้า https://antigravity.google/
2. Open existing workspace หรือสร้าง New Workspace

### Step 2: Configure Settings
```

Settings → Agent Behavior:

- Mode: Planning Mode
- Autonomy: Agent Driven
- Terminal: Auto
- Browser: Enable
- GitHub: Connected (https://github.com/Waytid-way/Auto_Acct101.git)

```

### Step 3: Paste Prompt
1. Copy prompt ทั้งหมดข้างบน (จาก `# Auto_Acct101...` ถึง `...for human review before continuing.`)
2. Paste ลงใน Antigravity chat
3. Agent จะสร้าง **Implementation Plan** artifact

### Step 4: Review & Approve
1. อ่าน Implementation Plan ที่ agent สร้าง
2. ตรวจสอบว่าครอบคลุมทุก tasks และตรงตาม BRIEF
3. คลิก **Approve** เพื่อให้ agent เริ่มทำงาน

### Step 5: Monitor Progress
- Agent จะทำงานทีละ checkpoint
- ตรวจสอบ Artifacts (code diffs, test results)
- อนุมัติการเปลี่ยนแปลงที่สำคัญก่อน push to GitHub

### Step 6: Verify System
เมื่อ agent เสร็จแล้ว:
```bash
# ตรวจสอบว่า services ทำงาน
docker-compose ps
cd backend
bun test

# Test health endpoint
curl http://localhost:4000/api/health
```


***

พร้อมใช้งานได้เลย! Prompt นี้ผสม **best practices จาก file:104** (checkpoints, agent guidelines, verification steps) กับ **tech stack และ financial rules จาก BRIEF** อย่างสมบูรณ์แบบ[^2][^1]

<div align="center">⁂</div>

[^1]: PROJECT-BRIEF_-AUTO-ACCT-ACCOUNTING-AUTOMATION-S.pdf

[^2]: Prompt-sMaahrab-Setup-Auto_Acct101-cchaak-0-ain-Antigr.md

[^3]: https://www.facebook.com/kengbuncheepasibuntao/posts/-ทราบหรือไม่-ocr-ภาษาไทยช่วยให้กระบวนการทำงานของธุรกิจคุณง่ายและรวดเร็วยิ่งขึ้น-/1040484244769952/

[^4]: https://www.scb.co.th/en/about-us/news/jun-2025/scb-techx-ocr

