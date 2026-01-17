/**
 * OCR Module Types
 * Phase 3B: Receipt OCR Processing with Financial Integrity Validation
 */

import { z } from 'zod';

/**
 * OCR Processing Status
 */
export type OCRStatus = 'pending' | 'processed' | 'manual_review_required' | 'approved' | 'rejected';

/**
 * OCR Engine used for processing
 */
export type OCREngine = 'paddleocr' | 'google_vision' | 'manual';

/**
 * Extracted receipt fields with validation
 */
export interface ExtractedReceiptFields {
    /** Vendor/Store name */
    vendor?: string;
    /** Amount in satang (integer only - Golden Rule) */
    amount?: number;
    /** Receipt date */
    date?: string;
    /** Tax ID (if present) */
    taxId?: string;
    /** VAT amount in satang */
    vatAmount?: number;
    /** Total before VAT in satang */
    subtotal?: number;
}

/**
 * OCR Confidence breakdown by field
 */
export interface FieldConfidence {
    vendor: number;
    amount: number;
    date: number;
    overall: number;
}

/**
 * Validation error from Financial Integrity checks (Critical #1)
 */
export interface ValidationError {
    field: string;
    code: string;
    message: string;
    severity: 'critical' | 'warning';
}

/**
 * OCR Processing Result
 */
export interface OCRResult {
    /** Unique processing ID */
    id: string;
    /** Raw extracted text */
    rawText: string;
    /** Parsed receipt fields */
    extractedFields: ExtractedReceiptFields;
    /** OCR engine used */
    engine: OCREngine;
    /** Confidence scores per field */
    confidence: FieldConfidence;
    /** Financial integrity validation errors (Critical #1) */
    validationErrors: ValidationError[];
    /** Processing status */
    status: OCRStatus;
    /** Requires manual review (if confidence < threshold or validation errors) */
    requiresManualReview: boolean;
    /** Processing time in milliseconds */
    processingTimeMs: number;
    /** File hash for deduplication (Critical #2) */
    fileHash: string;
    /** Timestamp */
    createdAt: Date;
}

/**
 * Receipt document stored in MongoDB (Critical #2: Deduplication)
 */
export interface ReceiptDocument {
    _id: string;
    /** SHA-256 hash of original file */
    fileHash: string;
    /** Original filename */
    filename: string;
    /** MIME type */
    mimeType: string;
    /** File size in bytes */
    fileSize: number;
    /** OCR result */
    ocrResult: OCRResult;
    /** Groq classification result (if processed) */
    classification?: {
        category: string;
        confidence: number;
        reasoning: string;
    };
    /** Current status */
    status: OCRStatus;
    /** Teable record ID (if synced) */
    teableRecordId?: string;
    /** Google Drive file ID (if uploaded) */
    driveFileId?: string;
    /** User who uploaded */
    uploadedBy?: string;
    /** Timestamps */
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Google Vision API Quota tracking (Critical #4)
 */
export interface QuotaUsage {
    service: 'google_vision';
    date: string; // YYYY-MM-DD
    count: number;
    limit: number;
    lastUpdated: Date;
}

/**
 * OCR Configuration
 */
export const OCR_CONFIG = {
    /** Confidence thresholds (Tactical Improvement #3) */
    CONFIDENCE_THRESHOLDS: {
        PADDLE_OCR: {
            ACCEPT: 0.85,    // Use result directly
            FALLBACK: 0.70,  // Try Google Vision
            MANUAL: 0.70     // Force manual review
        },
        GOOGLE_VISION: {
            ACCEPT: 0.90,
            MANUAL: 0.80
        }
    },
    /** Maximum file size (10MB) */
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    /** Allowed MIME types */
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    /** Google Vision daily quota (stay under 1K/month) */
    GOOGLE_VISION_DAILY_LIMIT: 30,
    /** Financial validation limits (Critical #1) */
    AMOUNT_VALIDATION: {
        MIN_SATANG: 1,           // 0.01 THB
        MAX_SATANG: 100000000    // 1M THB
    },
    /** Processing timeout */
    TIMEOUT_MS: 30000
} as const;

/**
 * Zod schema for upload request validation
 */
export const uploadRequestSchema = z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']),
    fileSize: z.number().max(OCR_CONFIG.MAX_FILE_SIZE)
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
