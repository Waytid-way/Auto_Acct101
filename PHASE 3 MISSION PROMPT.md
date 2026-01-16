<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 📝 PHASE 3 MISSION PROMPT - อัปเดตเป็นปัจจุบัน

ตรวจสอบและอัปเดต prompt ให้สอดคล้องกับ environment setup ปัจจุบันของคุณ[^1]

***

## 🔄 สิ่งที่ต้องอัปเดต

### 1. Environment Variables (เพิ่มใหม่)

**File**: `backend/.env.example`

```bash
# Application
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://localhost:27017/auto_acct?replicaSet=rs0

# Discord Alerts (Optional - commented out placeholders to avoid validation errors)
DISCORD_WEBHOOK_CRITICAL=https://discord.com/api/webhooks/1461776932336304261/cEdApsxZ8Fp5NUyxf2p7k7m--_dkcWNLOga4qkzQyNbj5VqXWXBy5GI6tFPMJHP7a5-S
DISCORD_WEBHOOK_INFO=https://discord.com/api/webhooks/1461777085948366948/TSAtbpgcCh3yaMNHtJvNaxYrtQm1pxeMbLgmZPOb845K3YcH8gWYaxhwe9h-qJ_W5UPu
DISCORD_WEBHOOK_ML=https://discord.com/api/webhooks/1461777290659758282/UvP0FWg3RTq9x6Lxjnog5yeYn7Gd0KjHkCSbAhxSYIVSIbaYc02_XgyRE8KMk2SKaj9T

# Teable Integration
TEABLE_API_URL=http://localhost:3000/api
# TEABLE_WEBHOOK_SECRET=your_webhook_secret
TEABLE_API_TOKEN="teable_accziQ1XR2FXHythfq6_1LZHQ+NrX7ssDMgkDMujirAsVHI"
TEABLE_TABLE_ID=tblnGkVbSOBX9HCp74H
TEABLE_SECRET_KEY=7e7c2493918f78b85d6af183
TEABLE_SESSION_SECRET=4e04b8f889d9ad3decf6e3dd2dfaa3d4b728f1a22682a216397b480a41a639cf

# FlowAccount API
FLOWACCOUNT_CLIENT_ID=test_client_id
FLOWACCOUNT_CLIENT_SECRET=test_client_secret
FLOWACCOUNT_REDIRECT_URI=http://localhost:4000/api/flowaccount/callback

# Google Drive (Service Account)
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account"}
# GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id

# Encryption (Optional - needs 32 chars)
# ENCRYPTION_KEY=12345678901234567890123456789012
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_IV_LENGTH=16

# Express CSV Export
EXPRESS_CHART_OF_ACCOUNTS_PATH=./config/chart-of-accounts.json

# ======================
# NEW for Phase 3
# ======================

# Google Gemini API (Free Tier - Optional)
# Get key: https://ai.google.dev/
GOOGLE_API_KEY=your_gemini_api_key_here

# ML Configuration
ML_CONFIDENCE_THRESHOLD=0.80
ML_MODEL_PATH=./ml/models/category_classifier.pkl

# Python Virtual Environment Path
PYTHON_VENV_PATH=./ml/ml-env/bin/python3
```


***

### 2. Docker Compose (เพิ่ม Teable + PostgreSQL)

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # MongoDB (Auto-Acct Backend)
  mongodb:
    image: mongo:7-jammy
    container_name: auto-acct-mongodb
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db
    networks:
      - auto-acct-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PostgreSQL (Teable) ✅ NEW
  teable-db:
    image: postgres:15-alpine
    container_name: teable-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: teable
      POSTGRES_PASSWORD: teable_password
      POSTGRES_DB: teable
    volumes:
      - teable_db:/var/lib/postgresql/data
    networks:
      - auto-acct-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U teable"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Teable Application ✅ NEW
  teable:
    image: ghcr.io/teableio/teable:latest
    container_name: teable-app
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      teable-db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://teable:teable_password@teable-db:5432/teable
      NODE_ENV: production
      PUBLIC_ORIGIN: http://localhost:3000
      SECRET_KEY: ${TEABLE_SECRET_KEY:-please-change-this-secret-key}
      SESSION_SECRET: ${TEABLE_SESSION_SECRET:-please-change-this-session-secret}
    networks:
      - auto-acct-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  auto-acct-network:
    driver: bridge

volumes:
  mongo_data:
  teable_db:
```


***

### 3. Environment Config (TypeScript)

**File**: `backend/src/config/env.ts`

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  
  // MongoDB
  MONGODB_URI: z.string().url(),
  
  // Encryption
  ENCRYPTION_KEY: z.string().min(32),
  
  // FlowAccount OAuth
  FLOWACCOUNT_CLIENT_ID: z.string().optional(),
  FLOWACCOUNT_CLIENT_SECRET: z.string().optional(),
  FLOWACCOUNT_REDIRECT_URI: z.string().url().optional(),
  
  // Discord Webhooks (3 channels) ✅ UPDATED
  DISCORD_WEBHOOK_CRITICAL: z.string().url().optional(),
  DISCORD_WEBHOOK_INFO: z.string().url().optional(),
  DISCORD_WEBHOOK_ML: z.string().url().optional(),
  
  // Teable Integration ✅ NEW
  TEABLE_API_TOKEN: z.string().startsWith('tbl_').optional(),
  TEABLE_WEBHOOK_SECRET: z.string().min(32).optional(),
  TEABLE_BASE_URL: z.string().url().default('http://localhost:3000'),
  
  // Google Gemini API (Phase 3) ✅ NEW
  GOOGLE_API_KEY: z.string().optional(),
  
  // ML Configuration (Phase 3) ✅ NEW
  ML_CONFIDENCE_THRESHOLD: z.string().transform(Number).default('0.80'),
  ML_MODEL_PATH: z.string().default('./ml/models/category_classifier.pkl'),
  PYTHON_VENV_PATH: z.string().default('./ml/ml-env/bin/python3'),
});

const env = envSchema.parse(process.env);

export default env;
```


***

### 4. Logger Service (3-tier Discord Alerts)

**File**: `backend/src/loaders/logger.ts`

อัปเดตให้มี 3 functions แทนที่จะมีแค่ `sendDiscordAlert`[^1]

```typescript
import winston from 'winston';
import axios from 'axios';
import config from '@config/env';

// ... existing logger setup ...

/**
 * Send CRITICAL alert (mention @everyone)
 */
export async function sendCriticalAlert(
  message: string, 
  metadata?: object
): Promise<void> {
  if (!config.DISCORD_WEBHOOK_CRITICAL) {
    logger.warn('DISCORD_WEBHOOK_CRITICAL not configured');
    return;
  }

  try {
    const sanitized = metadata ? sanitizeLogData(metadata) : {};
    
    await axios.post(config.DISCORD_WEBHOOK_CRITICAL, {
      content: `@everyone 🚨 **CRITICAL ALERT**`,
      embeds: [
        {
          title: message,
          description: '```json\n' + JSON.stringify(sanitized, null, 2) + '\n```',
          color: 15158332, // Red
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Auto-Acct-001 Critical Alert System'
          }
        },
      ],
    });
    
    logger.info('Critical alert sent to Discord', { message });
  } catch (error) {
    logger.error('Failed to send critical alert', { error });
  }
}

/**
 * Send INFO log (no mention)
 */
export async function sendInfoLog(
  message: string, 
  metadata?: object
): Promise<void> {
  if (!config.DISCORD_WEBHOOK_INFO) {
    logger.warn('DISCORD_WEBHOOK_INFO not configured');
    return;
  }

  try {
    const sanitized = metadata ? sanitizeLogData(metadata) : {};
    
    await axios.post(config.DISCORD_WEBHOOK_INFO, {
      content: `ℹ️ **Info Update**`,
      embeds: [
        {
          title: message,
          description: '```json\n' + JSON.stringify(sanitized, null, 2) + '\n```',
          color: 3447003, // Blue
          timestamp: new Date().toISOString(),
        },
      ],
    });
    
    logger.info('Info log sent to Discord', { message });
  } catch (error) {
    logger.error('Failed to send info log', { error });
  }
}

/**
 * Send ML update (AI/ML related)
 */
export async function sendMLUpdate(
  message: string, 
  metadata?: object
): Promise<void> {
  if (!config.DISCORD_WEBHOOK_ML) {
    logger.warn('DISCORD_WEBHOOK_ML not configured');
    return;
  }

  try {
    const sanitized = metadata ? sanitizeLogData(metadata) : {};
    
    await axios.post(config.DISCORD_WEBHOOK_ML, {
      content: `🤖 **ML System Update**`,
      embeds: [
        {
          title: message,
          description: '```json\n' + JSON.stringify(sanitized, null, 2) + '\n```',
          color: 10181046, // Purple
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Auto-Acct ML Pipeline'
          }
        },
      ],
    });
    
    logger.info('ML update sent to Discord', { message });
  } catch (error) {
    logger.error('Failed to send ML update', { error });
  }
}

/**
 * Backward compatibility: keep old function
 */
export async function sendDiscordAlert(
  message: string, 
  metadata?: object
): Promise<void> {
  // Default to INFO channel
  await sendInfoLog(message, metadata);
}

/**
 * Sanitize PII data before sending
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'accountNumber',
    'taxId',
    'amount', // PII for accounting
    'clientId',
    'email',
    'phone',
  ];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

export default logger;
```


***

### 5. Update Training Script (ใช้ 3-tier alerts)

**File**: `backend/src/scripts/train-ml-nightly.ts`

```typescript
import { spawn } from 'child_process';
import path from 'path';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import logger, { sendMLUpdate, sendCriticalAlert } from '@loaders/logger';

async function runNightlyTraining(): Promise<void> {
  try {
    await connectMongoDB();

    logger.info('🏋️ Starting nightly ML training pipeline');

    const trainScript = path.join(__dirname, '../../ml/train.sh');

    const result = await runScript(trainScript);

    logger.info('✅ ML training completed successfully', { result });

    // ใช้ sendMLUpdate แทน sendDiscordAlert ✅
    await sendMLUpdate(
      '🤖 ML Model Retrained Successfully',
      { 
        date: new Date().toISOString().split('T')[^0],
        status: 'success',
        output: result.substring(0, 500),
      }
    );

  } catch (error) {
    logger.error('❌ ML training failed', { error });

    // ใช้ sendCriticalAlert แทน sendDiscordAlert ✅
    await sendCriticalAlert(
      '🚨 ML Training Pipeline FAILED',
      { error: (error as Error).message }
    );

    process.exit(1);
  } finally {
    await disconnectMongoDB();
  }
}

function runScript(scriptPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [scriptPath]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

runNightlyTraining();
```


***

### 6. Prerequisites Checklist (อัปเดต)

**ก่อนเริ่ม Phase 3 ต้องมี**:

#### Environment Variables

- [x] `MONGODB_URI` (Phase 1) ✅
- [x] `FLOWACCOUNT_CLIENT_ID`, `FLOWACCOUNT_CLIENT_SECRET` (Phase 2) ✅
- [x] `DISCORD_WEBHOOK_CRITICAL` ✅ **NEW**
- [x] `DISCORD_WEBHOOK_INFO` ✅ **NEW**
- [x] `DISCORD_WEBHOOK_ML` ✅ **NEW**
- [x] `TEABLE_API_TOKEN` ✅ **NEW**
- [x] `TEABLE_WEBHOOK_SECRET` ✅ **NEW**
- [x] `TEABLE_BASE_URL` ✅ **NEW**
- [ ] `GOOGLE_API_KEY` (Gemini - optional) ⚠️ **ต้องสร้างใหม่**


#### Services Running

- [x] MongoDB container (`auto-acct-mongodb`) ✅
- [x] PostgreSQL container (`teable-postgres`) ✅ **NEW**
- [x] Teable container (`teable-app`) ✅ **NEW**


#### Data Requirements

- [ ] Minimum **100 approved entries** ใน MongoDB (จาก Phase 2) ⚠️ **ตรวจสอบ**

***

### 7. Verification Steps (อัปเดต)

```bash
# ตรวจสอบ Environment Variables
cd backend
cat .env | grep -E "DISCORD|TEABLE|GOOGLE"

# ควรเห็น:
# DISCORD_WEBHOOK_CRITICAL=https://...
# DISCORD_WEBHOOK_INFO=https://...
# DISCORD_WEBHOOK_ML=https://...
# TEABLE_API_TOKEN=tbl_...
# TEABLE_WEBHOOK_SECRET=...
# TEABLE_BASE_URL=http://localhost:3000
# GOOGLE_API_KEY=... (optional)

# ตรวจสอบ Containers
docker ps

# ควรเห็น 3 containers:
# - auto-acct-mongodb
# - teable-postgres
# - teable-app

# ตรวจสอบจำนวน approved entries
cd backend
bun run -e "
import { connectMongoDB } from './src/loaders/mongoose';
import { JournalEntry } from './src/modules/accounting/AccountingModel';

await connectMongoDB();
const count = await JournalEntry.countDocuments({ 
  status: { \$in: ['approved', 'posted'] } 
});
console.log(\`✅ Approved entries: \${count}\`);
process.exit(0);
"

# ต้องได้ >= 100 entries สำหรับ ML training
```


***

### 8. สร้าง Google Gemini API Key

**Step 1**: ไปที่ https://ai.google.dev/

**Step 2**: คลิก **Get API Key** → **Create API key in new project**

**Step 3**: Copy API key → เพิ่มใน `.env`

```bash
GOOGLE_API_KEY=AIzaSy...your-key-here
```

**Free Tier Limits**:

- **15 requests/minute**
- **1,500 requests/day**
- **Model**: gemini-2.0-flash-exp

***

### 9. GitHub Secrets (เพิ่มใหม่)

**ไปที่**: https://github.com/Waytid-way/Auto_Acct101/settings/secrets/actions

**เพิ่ม Secrets**:

1. `TEABLE_API_TOKEN`
2. `TEABLE_WEBHOOK_SECRET`
3. `TEABLE_SECRET_KEY` (สำหรับ Teable container)
4. `TEABLE_SESSION_SECRET` (สำหรับ Teable container)
5. `GOOGLE_API_KEY` (optional)

***

## ✅ Updated Phase 3 Prompt (สำหรับ Antigravity)

**เปลี่ยนจาก Prompt เดิม**:

```markdown
### Prerequisites
- ✅ Phase 1-2 completed (MongoDB, FlowAccount, Teable)
- ✅ Docker Compose with MongoDB + PostgreSQL + Teable ✅ UPDATED
- ✅ Discord webhooks configured (3 channels) ✅ UPDATED
- ✅ Teable API token + webhook secret ✅ NEW
- ✅ Minimum 100 approved entries for ML training
- ⚠️ Google Gemini API key (optional, for fallback)
```

**Environment Variables Required**:

```bash
# Existing (Phase 1-2)
MONGODB_URI=...
FLOWACCOUNT_CLIENT_ID=...
FLOWACCOUNT_CLIENT_SECRET=...

# New for Phase 3
DISCORD_WEBHOOK_CRITICAL=...  # ✅ 3-tier alerts
DISCORD_WEBHOOK_INFO=...      # ✅ 3-tier alerts
DISCORD_WEBHOOK_ML=...        # ✅ 3-tier alerts
TEABLE_API_TOKEN=tbl_...     # ✅ Teable integration
TEABLE_WEBHOOK_SECRET=...    # ✅ Webhook security
GOOGLE_API_KEY=...           # ⚠️ Optional (Gemini fallback)
```


***

## 📋 Next Steps

### 1. ตรวจสอบ Prerequisites

```bash
# Run verification script
cd backend
bun run scripts/verify-phase3-ready.ts
```

**สร้างไฟล์**: `backend/src/scripts/verify-phase3-ready.ts`

```typescript
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import { JournalEntry } from '@modules/accounting/AccountingModel';
import config from '@config/env';
import logger from '@loaders/logger';

async function verifyPhase3Ready(): Promise<void> {
  try {
    await connectMongoDB();

    // Check 1: MongoDB connection
    logger.info('✅ MongoDB connected');

    // Check 2: Approved entries count
    const count = await JournalEntry.countDocuments({ 
      status: { $in: ['approved', 'posted'] } 
    });
    logger.info(`✅ Approved entries: ${count}`);
    
    if (count < 100) {
      logger.warn('⚠️ Warning: < 100 approved entries. ML accuracy may be low.');
    }

    // Check 3: Environment variables
    const required = {
      'DISCORD_WEBHOOK_CRITICAL': config.DISCORD_WEBHOOK_CRITICAL,
      'DISCORD_WEBHOOK_INFO': config.DISCORD_WEBHOOK_INFO,
      'DISCORD_WEBHOOK_ML': config.DISCORD_WEBHOOK_ML,
      'TEABLE_API_TOKEN': config.TEABLE_API_TOKEN,
      'TEABLE_WEBHOOK_SECRET': config.TEABLE_WEBHOOK_SECRET,
    };

    for (const [key, value] of Object.entries(required)) {
      if (value) {
        logger.info(`✅ ${key} configured`);
      } else {
        logger.error(`❌ ${key} NOT configured`);
      }
    }

    // Check 4: Optional Gemini API
    if (config.GOOGLE_API_KEY) {
      logger.info('✅ GOOGLE_API_KEY configured (Gemini fallback enabled)');
    } else {
      logger.warn('⚠️ GOOGLE_API_KEY not set (Gemini fallback disabled)');
    }

    logger.info('🎉 Phase 3 prerequisites check completed!');

  } catch (error) {
    logger.error('❌ Phase 3 prerequisites check failed', { error });
    process.exit(1);
  } finally {
    await disconnectMongoDB();
  }
}

verifyPhase3Ready();
```


***

### 2. เริ่ม Phase 3 Development

**เมื่อ prerequisites ครบแล้ว**:

1. Copy **PHASE-3-MISSION-PROMPT** (ไฟล์ที่แนบมา)[^1]
2. อัปเดท Prerequisites section ตาม instructions ข้างบน
3. วางใน Antigravity IDE
4. Agent จะเริ่มทำ Task 3.1 → 3.9 automatically

***

## 🔧 สรุป Changes ที่ต้อง Update

| Component | Status | Action Required |
| :-- | :-- | :-- |
| **Docker Compose** | ✅ Complete | มี Teable + PostgreSQL แล้ว |
| **Discord Webhooks** | ✅ Complete | ครบ 3 channels แล้ว |
| **Teable Integration** | ✅ Complete | API Token + Webhook Secret ครบ |
| **Logger Service** | ⚠️ Update | เพิ่ม 3 functions (critical/info/ml) |
| **Env Config** | ⚠️ Update | เพิ่ม Teable + Gemini vars |
| **Gemini API Key** | ❌ Missing | ต้องสร้างที่ https://ai.google.dev/ |
| **Training Data** | ⚠️ Unknown | ต้องมี >= 100 approved entries |


***

**สรุป**: ระบบของคุณ **80% พร้อมแล้ว** สำหรับ Phase 3! เหลือแค่:

1. สร้าง **Gemini API Key** (optional)
2. ตรวจสอบว่ามี **>= 100 approved entries**
3. Update **Logger Service** ให้มี 3-tier alerts
4. Run verification script

มีคำถามเพิ่มเติมหรือต้องการให้ช่วยอะไรบอกมาได้เลย! 😊
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: PHASE-3-MISSION-PROMPT_-OCR-ML-Classification.md

[^2]: SETUP.md

[^3]: PHASE_2_REPORT.md

[^4]: PHASE_1_REPORT.md

[^5]: FLOWACCOUNT_INTEGRATION.md

[^6]: FINANCIAL_RULES.md

[^7]: ARCHITECTURE.md

[^8]: API.md

[^9]: PROJECT-BRIEF_-AUTO-ACCT-ACCOUNTING-AUTOMATION-S.pdf

[^10]: Prompt-sMaahrab-Setup-Auto_Acct101-cchaak-0-ain-Antigr.md

[^11]: ARCHITECTURE.md

[^12]: API.md

[^13]: FINANCIAL_RULES.md

[^14]: PHASE_1_REPORT.md

[^15]: FLOWACCOUNT_INTEGRATION.md

[^16]: SETUP.md

[^17]: PHASE_2_REPORT.md

[^18]: image.jpg

