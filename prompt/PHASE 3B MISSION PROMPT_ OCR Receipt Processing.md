<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 🎯 PHASE 3B MISSION PROMPT: OCR Receipt Processing

**Date**: 2026-01-17
**Branch**: `feature/phase-3b-ocr`
**Status**: Ready to start
**Prerequisites**: Phase 3A Complete ✅ (Groq AI Classification working)

***

## 📋 Executive Summary

Phase 3B จะเพิ่มความสามารถในการ**อ่านใบเสร็จอัตโนมัติ** (OCR) เข้ากับระบบ Auto-Acct-001 โดยใช้ **Google Cloud Vision API** (Free tier: 1,000 units/month) เพื่อ:

1. **Upload รูปใบเสร็จ/PDF** → ดึงข้อความออกมา (extract text)
2. **Parse ข้อมูลสำคัญ** → จำนวนเงิน, วันที่, ร้านค้า, รายการ
3. **ส่งให้ Groq AI จัดหมวดหมู่** → ได้ account code พร้อม confidence
4. **สร้าง draft journal entry** → ส่งไป Teable ให้คนตรวจสอบ
5. **Approve workflow** → หลังตรวจสอบแล้วส่งเข้า MongoDB + Export CSV

[^1][^2]

***

## 🎯 Objectives

| Goal | Target | How to Measure |
| :-- | :-- | :-- |
| **OCR Accuracy** | ≥85% for clean receipts | Compare extracted amount vs actual |
| **Processing Time** | ≤5 seconds/receipt | From upload to Teable |
| **Cost** | \$0/month | Stay within free tier (1,000/month) |
| **Confidence Threshold** | ≥80% for auto-approve | Low confidence → human review |
| **Integration** | Seamless with Groq AI | OCR → Groq → Teable workflow |


***

## 🔐 Prerequisites \& Context

### Phase 1-2-3A Accomplishments (DO NOT RECREATE)

✅ **Phase 1**: MongoDB + Medici ledger + Financial rules
✅ **Phase 2**: FlowAccount OAuth + CSV Export
✅ **Phase 3A**: Groq AI Classification (97.7% confidence)

**Current Branch**: `main`
**Working Directory**: `Auto_Acct101/`

***

### What Already Exists

**Services**:

- `GroqClassificationService.ts` → AI classification (working)
- `sendMLUpdate()` → Discord alerts for ML events
- `AccountingService.ts` → Create journal entries
- `TeableService.ts` → Push to Teable for review

**Database Models**:

- `JournalEntry` schema → MoneyInt types
- `OcrDocument` schema → ต้องสร้างใหม่ ✅

***

## 🏗️ Technical Architecture (Phase 3B)

### Tech Stack

| Component | Technology | Why |
| :-- | :-- | :-- |
| **OCR Engine** | Google Cloud Vision API | Best Thai support, Free tier 1000/mo |
| **File Upload** | Multer | Standard Express middleware |
| **Image Processing** | Sharp | Resize/optimize before OCR |
| **PDF Handling** | pdf-parse | Extract text if already digital PDF |
| **Storage** | Google Drive API | Encrypted upload (from Phase 1) |
| **Queue** | MongoDB + Cron | Simple queue for batch processing |


***

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 3B: OCR Receipt Processing Pipeline                   │
└─────────────────────────────────────────────────────────────┘

📸 User uploads receipt (POST /api/ocr/upload)
     ↓
🔍 Google Vision API → Extract text
     ↓
🧠 Parse data (amount, date, vendor, items)
     ↓
❓ Is OCR confidence ≥ 80%?
     ↓ YES
🤖 Groq AI → Classify category (from Phase 3A)
     ↓
❓ Is AI confidence ≥ 80%?
     ↓ YES
📝 Create draft journal entry in MongoDB
     ↓
📤 Push to Teable (status: "ready_to_review")
     ↓
👤 Accountant reviews in Teable
     ↓
✅ Approve via Teable webhook
     ↓
💾 Post to Medici ledger
     ↓
📊 Export CSV for Express

     ↓ NO (Low confidence)
⚠️ Route to manual review queue in Teable
```


***

## 🔧 Implementation Tasks

### Task 3B.1: Setup Google Cloud Vision API

#### 3B.1.1 Create Google Cloud Project

**Steps**:

1. ไปที่ https://console.cloud.google.com
2. สร้าง project ใหม่: `auto-acct-ocr`
3. Enable **Cloud Vision API**
4. สร้าง **Service Account**:
    - Name: `auto-acct-ocr-service`
    - Role: `Cloud Vision API User`
5. สร้าง JSON key → Download
6. เก็บไว้ที่ `backend/.secrets/google-vision-key.json`

***

#### 3B.1.2 Add to .env

**File**: `backend/.env`

```bash
# Google Cloud Vision OCR
GOOGLE_VISION_KEYFILE=.secrets/google-vision-key.json
GOOGLE_VISION_PROJECT_ID=auto-acct-ocr

# OCR Configuration
OCR_CONFIDENCE_THRESHOLD=0.80
OCR_MAX_FILE_SIZE=10485760  # 10MB
OCR_ALLOWED_FORMATS=jpg,jpeg,png,pdf
```


***

#### 3B.1.3 Update Environment Schema

**File**: `backend/src/config/env.ts`

```typescript
const envSchema = z.object({
  // ... existing ...
  
  // Google Cloud Vision (Phase 3B)
  GOOGLE_VISION_KEYFILE: z.string().optional(),
  GOOGLE_VISION_PROJECT_ID: z.string().optional(),
  
  // OCR Config
  OCR_CONFIDENCE_THRESHOLD: z.string().transform(Number).default('0.80'),
  OCR_MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  OCR_ALLOWED_FORMATS: z.string().default('jpg,jpeg,png,pdf'),
});
```


***

### Task 3B.2: Install Dependencies

```bash
cd backend

# OCR & Image Processing
bun add @google-cloud/vision sharp pdf-parse

# File Upload
bun add multer
bun add -D @types/multer

# Date Parsing (Thai dates)
bun add dayjs
```


***

### Task 3B.3: Create OCR Service

**File**: `backend/src/modules/ocr/GoogleVisionService.ts`

```typescript
import vision from '@google-cloud/vision';
import config from '@config/env';
import logger from '@loaders/logger';
import { parseMoneyFromString } from '@types/money';

export interface OCRResult {
  rawText: string;
  confidence: number;  // 0-1
  amount: number | null;  // MoneyInt (satang)
  date: Date | null;
  vendor: string | null;
  items: string[];  // Line items
  extractedFields: {
    totalLabel: string | null;
    dateLabel: string | null;
    vendorLabel: string | null;
  };
}

export class GoogleVisionService {
  private client: vision.ImageAnnotatorClient;

  constructor() {
    if (!config.GOOGLE_VISION_KEYFILE) {
      logger.warn('Google Vision not configured. OCR disabled.');
      return;
    }

    this.client = new vision.ImageAnnotatorClient({
      keyFilename: config.GOOGLE_VISION_KEYFILE,
    });
  }

  /**
   * Extract text from image using Google Cloud Vision
   */
  async extractFromImage(imagePath: string): Promise<OCRResult> {
    try {
      logger.info('Starting OCR extraction', { imagePath });

      // Call Vision API
      const [result] = await this.client.textDetection(imagePath);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        throw new Error('No text detected in image');
      }

      // First annotation = full text
      const rawText = detections[^0].description || '';
      
      // Calculate confidence (average from all words)
      const fullText = result.fullTextAnnotation;
      const confidence = this.calculateConfidence(fullText);

      logger.info('OCR extraction completed', {
        textLength: rawText.length,
        confidence: confidence.toFixed(2),
      });

      // Parse structured data
      const parsed = this.parseReceiptText(rawText);

      return {
        rawText,
        confidence,
        amount: parsed.amount,
        date: parsed.date,
        vendor: parsed.vendor,
        items: parsed.items,
        extractedFields: parsed.extractedFields,
      };

    } catch (error) {
      logger.error('OCR extraction failed', { error, imagePath });
      
      return {
        rawText: '',
        confidence: 0,
        amount: null,
        date: null,
        vendor: null,
        items: [],
        extractedFields: {
          totalLabel: null,
          dateLabel: null,
          vendorLabel: null,
        },
      };
    }
  }

  /**
   * Calculate overall confidence from Vision API response
   */
  private calculateConfidence(fullText: any): number {
    if (!fullText || !fullText.pages) return 0;

    let totalConfidence = 0;
    let wordCount = 0;

    for (const page of fullText.pages) {
      for (const block of page.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            if (word.confidence) {
              totalConfidence += word.confidence;
              wordCount++;
            }
          }
        }
      }
    }

    return wordCount > 0 ? totalConfidence / wordCount : 0;
  }

  /**
   * Parse receipt text to extract structured data
   * Thai receipt patterns
   */
  private parseReceiptText(text: string): {
    amount: number | null;
    date: Date | null;
    vendor: string | null;
    items: string[];
    extractedFields: {
      totalLabel: string | null;
      dateLabel: string | null;
      vendorLabel: string | null;
    };
  } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Amount patterns (Thai receipts)
    const amountPatterns = [
      /(?:รวม|ยอดรวม|Total|TOTAL|จำนวนเงิน)[:\s]*([0-9,]+\.?\d*)/i,
      /(?:ยอดชำระ|จ่าย|PAID)[:\s]*([0-9,]+\.?\d*)/i,
      /(?:NET|net)[:\s]*([0-9,]+\.?\d*)/i,
    ];

    let amount: number | null = null;
    let totalLabel: string | null = null;

    for (const pattern of amountPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          const amountStr = match[^1].replace(/,/g, '');
          const amountFloat = parseFloat(amountStr);
          
          if (!isNaN(amountFloat) && amountFloat > 0) {
            amount = Math.round(amountFloat * 100);  // Convert to satang
            totalLabel = line;
            break;
          }
        }
      }
      if (amount) break;
    }

    // Date patterns
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // 17/01/2026 or 17-01-26
      /(\d{1,2}\s+(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+\d{4})/i,  // 17 ม.ค. 2569
    ];

    let date: Date | null = null;
    let dateLabel: string | null = null;

    for (const pattern of datePatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          const dateStr = match[^1];
          const parsed = this.parseThaiDate(dateStr);
          if (parsed) {
            date = parsed;
            dateLabel = line;
            break;
          }
        }
      }
      if (date) break;
    }

    // Vendor (usually first 1-2 lines)
    const vendor = lines.slice(0, 2).join(' ').substring(0, 100);

    // Items (middle lines, exclude headers/footers)
    const items = lines
      .filter(line => {
        // Exclude common footer lines
        const exclude = ['ขอบคุณ', 'THANK YOU', 'TAX INVOICE', 'เลขที่', 'ใบกำกับ'];
        return !exclude.some(keyword => line.includes(keyword));
      })
      .filter(line => line.length > 3 && line.length < 100)
      .slice(2, 10);  // Max 8 items

    return {
      amount,
      date,
      vendor,
      items,
      extractedFields: {
        totalLabel,
        dateLabel,
        vendorLabel: lines[^0] || null,
      },
    };
  }

  /**
   * Parse Thai date format to Date object
   */
  private parseThaiDate(dateStr: string): Date | null {
    try {
      // Handle DD/MM/YYYY or DD-MM-YYYY
      const match1 = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (match1) {
        let [, day, month, year] = match1;
        
        // Convert 2-digit year
        if (year.length === 2) {
          year = '20' + year;
        }
        
        // Buddhist year to Christian year (2569 -> 2026)
        let yearNum = parseInt(year);
        if (yearNum > 2500) {
          yearNum -= 543;
        }

        return new Date(yearNum, parseInt(month) - 1, parseInt(day));
      }

      // Handle Thai month abbreviations
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      
      for (let i = 0; i < thaiMonths.length; i++) {
        if (dateStr.includes(thaiMonths[i])) {
          const match2 = dateStr.match(/(\d{1,2})\s+.+?\s+(\d{4})/);
          if (match2) {
            let [, day, year] = match2;
            let yearNum = parseInt(year);
            
            // Buddhist to Christian
            if (yearNum > 2500) {
              yearNum -= 543;
            }

            return new Date(yearNum, i, parseInt(day));
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Date parsing failed', { dateStr, error });
      return null;
    }
  }
}
```


***

### Task 3B.4: Create OCR Controller

**File**: `backend/src/modules/ocr/OCRController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { GoogleVisionService } from './GoogleVisionService';
import { groqService } from '@modules/ai/GroqClassificationService';
import { AccountingService } from '@modules/accounting/AccountingService';
import { sendMLUpdate } from '@loaders/logger';
import config from '@config/env';
import logger from '@loaders/logger';

// Configure Multer for file uploads
const upload = multer({
  dest: '/tmp/ocr-uploads/',
  limits: {
    fileSize: config.OCR_MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = config.OCR_ALLOWED_FORMATS.split(',');
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedFormats.join(', ')}`));
    }
  },
});

const visionService = new GoogleVisionService();
const accountingService = new AccountingService();

export class OCRController {
  /**
   * Upload and process receipt
   * POST /api/ocr/upload
   */
  async processReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    let processedImagePath: string | null = null;

    try {
      if (!req.file) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'No file uploaded',
        });
        return;
      }

      const { clientId } = req.body;
      
      if (!clientId) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'clientId required',
        });
        return;
      }

      const originalPath = req.file.path;
      const originalName = req.file.originalname;
      const ext = path.extname(originalName).toLowerCase();

      logger.info('Processing receipt upload', {
        clientId,
        filename: originalName,
        size: req.file.size,
        ext,
      });

      // Step 1: Optimize image (resize if too large)
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        processedImagePath = `${originalPath}_processed.jpg`;
        
        await sharp(originalPath)
          .resize(2048, 2048, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90 })
          .toFile(processedImagePath);
          
        logger.info('Image optimized', { processedImagePath });
      } else {
        processedImagePath = originalPath;
      }

      // Step 2: OCR Extraction
      const ocrResult = await visionService.extractFromImage(processedImagePath);

      if (ocrResult.confidence < config.OCR_CONFIDENCE_THRESHOLD) {
        logger.warn('Low OCR confidence', {
          confidence: ocrResult.confidence,
          threshold: config.OCR_CONFIDENCE_THRESHOLD,
        });

        // Send to manual review
        res.status(200).json({
          success: true,
          requiresManualEntry: true,
          message: 'OCR confidence too low - manual entry required',
          ocrResult: {
            confidence: ocrResult.confidence,
            rawText: ocrResult.rawText.substring(0, 500),
          },
        });
        return;
      }

      // Step 3: Validate extracted data
      if (!ocrResult.amount || ocrResult.amount <= 0) {
        res.status(200).json({
          success: true,
          requiresManualEntry: true,
          message: 'Could not extract amount - manual entry required',
          ocrResult,
        });
        return;
      }

      // Step 4: AI Category Classification (Groq from Phase 3A)
      const classification = await groqService.classifyEntry({
        vendor: ocrResult.vendor || 'Unknown',
        amount: ocrResult.amount,
        description: ocrResult.items.join(', ') || ocrResult.rawText.substring(0, 200),
      });

      logger.info('Classification completed', {
        category: classification.category,
        confidence: classification.confidence,
      });

      // Step 5: Create draft journal entry
      const entryData = {
        clientId,
        date: ocrResult.date || new Date(),
        accountCode: classification.category.split(' - ')[^0],  // Extract code (e.g., "5100")
        description: `${ocrResult.vendor || 'Receipt'} - ${ocrResult.items.slice(0, 3).join(', ') || 'Purchase'}`,
        amount: ocrResult.amount,
        type: 'debit' as const,
        category: classification.category,
        source: 'ocr' as const,
        status: classification.confidence >= 0.85 ? 'ready_for_review' : 'needs_review',
        metadata: {
          ocrConfidence: ocrResult.confidence,
          aiConfidence: classification.confidence,
          aiReasoning: classification.reasoning,
          rawText: ocrResult.rawText,
          extractedFields: ocrResult.extractedFields,
          originalFilename: originalName,
        },
        createdBy: 'system:ocr',
      };

      const entry = await accountingService.createDraftEntry(entryData);

      // Step 6: Send Discord notification
      await sendMLUpdate(
        `📸 Receipt Processed via OCR`,
        {
          client: clientId,
          vendor: ocrResult.vendor,
          amount: `${(ocrResult.amount / 100).toFixed(2)} THB`,
          category: classification.category,
          ocrConfidence: `${(ocrResult.confidence * 100).toFixed(1)}%`,
          aiConfidence: `${(classification.confidence * 100).toFixed(1)}%`,
          status: entryData.status,
        }
      );

      // Step 7: Response
      res.status(200).json({
        success: true,
        data: {
          entryId: entry._id,
          ocrResult: {
            confidence: ocrResult.confidence,
            amount: ocrResult.amount,
            vendor: ocrResult.vendor,
            date: ocrResult.date,
            items: ocrResult.items,
          },
          classification: {
            category: classification.category,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
          },
          status: entryData.status,
          requiresReview: entryData.status === 'needs_review',
        },
      });

    } catch (error) {
      logger.error('Receipt processing failed', { error });
      next(error);
    } finally {
      // Cleanup temp files
      try {
        if (req.file?.path) {
          await fs.unlink(req.file.path);
        }
        if (processedImagePath) {
          await fs.unlink(processedImagePath);
        }
      } catch (cleanupError) {
        logger.warn('Temp file cleanup failed', { cleanupError });
      }
    }
  }
}

export const uploadMiddleware = upload.single('receipt');
```


***

### Task 3B.5: Create Routes

**File**: `backend/src/modules/ocr/routes.ts`

```typescript
import { Router } from 'express';
import { OCRController, uploadMiddleware } from './OCRController';

const router = Router();
const controller = new OCRController();

/**
 * POST /api/ocr/upload
 * Upload receipt and process with OCR + AI
 */
router.post(
  '/upload',
  uploadMiddleware,
  controller.processReceipt.bind(controller)
);

export default router;
```


***

### Task 3B.6: Register Routes

**File**: `backend/src/loaders/express.ts`

```typescript
import ocrRoutes from '@modules/ocr/routes';

// ... existing routes ...

app.use('/api/ocr', ocrRoutes);
```


***

### Task 3B.7: Create Test Script

**File**: `backend/src/scripts/test-ocr-upload.ts`

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testOCRUpload() {
  const testImagePath = path.join(__dirname, '../../test-receipts/sample-receipt.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    console.log('📝 Please add a sample receipt to backend/test-receipts/sample-receipt.jpg');
    process.exit(1);
  }

  const form = new FormData();
  form.append('receipt', fs.createReadStream(testImagePath));
  form.append('clientId', 'TEST_CLIENT_001');

  try {
    console.log('📤 Uploading test receipt...');
    
    const response = await axios.post(
      'http://localhost:4000/api/ocr/upload',
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log('\n✅ OCR Test Result:\n');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      const { ocrResult, classification } = response.data.data;
      
      console.log('\n📊 Summary:');
      console.log(`   Vendor: ${ocrResult.vendor}`);
      console.log(`   Amount: ${(ocrResult.amount / 100).toFixed(2)} THB`);
      console.log(`   OCR Confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);
      console.log(`   Category: ${classification.category}`);
      console.log(`   AI Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${classification.reasoning}`);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

testOCRUpload();
```


***

## 🧪 Testing Plan

### Test 1: Simple Receipt (7-Eleven)

**Test Image**: `backend/test-receipts/7-eleven.jpg`

**Expected Result**:

- Vendor: "7-Eleven" or "เซเว่น"
- Amount: ~125 THB
- Category: `5100 - ค่าอาหารและเครื่องดื่ม`
- OCR Confidence: ≥85%
- AI Confidence: ≥95%

***

### Test 2: Restaurant Receipt (Thai)

**Test Image**: `backend/test-receipts/restaurant.jpg`

**Expected Result**:

- Vendor: Restaurant name in Thai
- Amount: ~350 THB
- Category: `5100 - ค่าอาหารและเครื่องดื่ม`
- OCR Confidence: ≥80%

***

### Test 3: Utility Bill (TOT/True)

**Test Image**: `backend/test-receipts/internet-bill.pdf`

**Expected Result**:

- Vendor: "TOT" or "True"
- Amount: ~599 THB
- Category: `5300 - ค่าสาธารณูปโภค`
- OCR Confidence: ≥90% (digital PDF)

***

## 📊 Success Criteria

| Metric | Target | How to Verify |
| :-- | :-- | :-- |
| **OCR Accuracy** | ≥85% | Compare with manual entry |
| **Processing Time** | ≤5s | Check logs |
| **Cost** | \$0/month | Monitor Vision API usage |
| **Discord Alerts** | 100% | Check \#ml-updates |
| **Teable Integration** | Working | Check entries in Teable |


***

## 🔒 Security \& Privacy

### PII Protection

**What to sanitize**:

- Amount values (don't log in Discord)
- Full raw text (only first 500 chars)
- Account numbers (if detected)

**File**: `backend/src/loaders/logger.ts` (already done in Phase 3A)

```typescript
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveKeys = [
    'amount',
    'rawText',  // Only show summary
    'accountNumber',
    'taxId',
  ];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      if (key === 'rawText') {
        sanitized[key] = data[key].substring(0, 100) + '...';
      } else {
        delete sanitized[key];
      }
    }
  }

  return sanitized;
}
```


***

## 🎯 Git Workflow

### Create Feature Branch

```bash
cd Auto_Acct101

# Make sure main is up-to-date
git checkout main
git pull origin main

# Create Phase 3B branch
git checkout -b feature/phase-3b-ocr

# Verify clean state
git status
```


***

### Commit Strategy

```bash
# After each major task
git add .
git commit -m "feat(ocr): implement Google Vision service"
git commit -m "feat(ocr): add upload endpoint with Multer"
git commit -m "feat(ocr): integrate with Groq AI classification"
git commit -m "test(ocr): add receipt upload test script"
git commit -m "docs(ocr): update API documentation"
```


***

### Merge Back to Main

```bash
# After all tests pass
git checkout main
git merge feature/phase-3b-ocr
git push origin main

# Create Phase 3B report
git add PHASE_3B_REPORT.md
git commit -m "docs: Phase 3B complete - OCR integration"
git push origin main
```


***

## 📚 Deliverables Checklist

- [ ] Google Vision API setup (service account + key)
- [ ] `GoogleVisionService.ts` (OCR extraction)
- [ ] `OCRController.ts` (upload endpoint)
- [ ] Multer file upload middleware
- [ ] Sharp image optimization
- [ ] Thai date parsing
- [ ] Integration with Groq AI (from Phase 3A)
- [ ] Discord ML updates (\#ml-updates channel)
- [ ] Test script (`test-ocr-upload.ts`)
- [ ] 3 test receipts (7-Eleven, Restaurant, Utility)
- [ ] API documentation update
- [ ] Phase 3B Report (like Phase 3A)
- [ ] Branch merged to `main`

***

## 🐛 Known Issues \& Mitigations

| Issue | Impact | Mitigation |
| :-- | :-- | :-- |
| **Low-quality images** | OCR confidence <70% | Route to manual entry |
| **Handwritten receipts** | Very low accuracy | Out of scope for Phase 3B |
| **Non-Thai receipts** | English/Chinese text | Vision API handles it |
| **Free tier limits** | 1,000 requests/month | Monitor usage, add alert at 800 |


***

## 🚀 Phase 3B Success Definition

✅ **Complete when**:

1. Upload receipt → Get OCR result (≥85% confidence)
2. OCR → Groq AI → Get category (≥95% confidence)
3. Create draft journal entry in MongoDB
4. Send Discord notification to \#ml-updates
5. Entry visible in Teable for review
6. 3 test receipts processed successfully
7. Code merged to `main` branch
8. Phase 3B Report published

***

## 📖 References

- [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Phase 3A Report](file:134)[^2]
- [Auto-Acct Architecture](file:117)[^3]
- [Financial Rules](file:116)[^4]

***

## 💡 Next Phase (Phase 3C - Optional)

After Phase 3B complete:

1. **Batch OCR Processing** → Upload multiple receipts at once
2. **Receipt Templates** → Learn common receipt formats
3. **Local ML Model** → Train Scikit-learn classifier (offline fallback)
4. **Mobile App** → Take photo → Auto-upload

***

# 🎯 READY TO START PHASE 3B!

**Prompt for Antigravity IDE**:

```
Create feature branch `feature/phase-3b-ocr` and implement OCR receipt processing 
for Auto-Acct-001 according to the Phase 3B specification above.

Prerequisites:
- Phase 3A complete (Groq AI classification working)
- Google Cloud Vision API key ready
- Test receipts available

Tasks:
1. Setup Google Vision service
2. Create OCR upload endpoint
3. Integrate with Groq AI
4. Add Discord notifications
5. Test with 3 sample receipts
6. Create Phase 3B report

Follow the Anti-Drift Laws and Financial Integrity rules from Phase 1.
```


***

**Date**: 2026-01-17
**Status**: Ready to implement
**Estimated Time**: 4-6 hours
**Next Review**: After test receipts pass

มีคำถามหรือพร้อมเริ่ม Phase 3B แล้วบอกมาได้เลย! 🚀😊
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: REQUEST_FOR_ACCOUNTING_TEAM.md

[^2]: PHASE_3A_REPORT.md

[^3]: ARCHITECTURE.md

[^4]: FINANCIAL_RULES.md

[^5]: PHASE_3A_REPORT.md

[^6]: หา Best practices Prompt for Antigravity IDE (1).md

[^7]: SETUP.md

[^8]: PHASE_2_REPORT.md

[^9]: PHASE_1_REPORT.md

[^10]: FLOWACCOUNT_INTEGRATION.md

[^11]: API.md

[^12]: PROJECT-BRIEF_-AUTO-ACCT-ACCOUNTING-AUTOMATION-S.pdf

[^13]: Prompt-sMaahrab-Setup-Auto_Acct101-cchaak-0-ain-Antigr.md

[^14]: ARCHITECTURE.md

[^15]: API.md

[^16]: FINANCIAL_RULES.md

[^17]: PHASE_1_REPORT.md

[^18]: FLOWACCOUNT_INTEGRATION.md

[^19]: SETUP.md

[^20]: PHASE_2_REPORT.md

[^21]: image.jpg

[^22]: PHASE-3-MISSION-PROMPT_-OCR-ML-Classification.md

