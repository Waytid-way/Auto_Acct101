/**
 * OCR Service - Core Orchestration
 * Hybrid approach: PaddleOCR (primary) + Google Vision API (fallback)
 * 
 * Critical Modifications Implemented:
 * - #1: Financial Validation Layer (via OCRValidationService)
 * - #2: SHA-256 Deduplication
 * - #4: Google Vision Quota Tracking
 */

import { createHash, randomUUID } from 'crypto';
import axios from 'axios';
import logger from '@loaders/logger';
import config from '@config/env';
import { ocrValidationService } from './OCRValidationService';
import {
    OCRResult,
    OCREngine,
    ExtractedReceiptFields,
    FieldConfidence,
    OCR_CONFIG
} from './types';

// P0 Fix #1: MongoDB models for persistence
import { ReceiptModel } from '@models/Receipt';
import { QuotaModel } from '@models/Quota';

export class OCRService {
    private paddleOcrUrl: string;

    constructor() {
        this.paddleOcrUrl = process.env.OCR_WORKER_URL || 'http://localhost:5000';

        logger.info('OCR Service initialized', {
            paddleOcrUrl: this.paddleOcrUrl
        });
    }

    /**
     * Process a receipt image
     * Implements hybrid approach with confidence-based fallback
     */
    async processReceipt(
        imageBuffer: Buffer,
        metadata: { filename: string; mimeType: string }
    ): Promise<OCRResult> {
        const startTime = Date.now();
        const requestId = randomUUID();

        logger.info('OCR_PROCESSING_START', {
            requestId,
            filename: metadata.filename,
            imageSize: imageBuffer.length
        });

        try {
            // Critical #2: Check for duplicate
            const fileHash = this.generateFileHash(imageBuffer);
            const existingReceipt = await this.findByHash(fileHash);

            if (existingReceipt) {
                logger.warn('DUPLICATE_RECEIPT_DETECTED', {
                    requestId,
                    existingId: existingReceipt._id,
                    fileHash
                });
                throw new DuplicateReceiptError(
                    `Receipt already processed (ID: ${existingReceipt._id})`,
                    existingReceipt._id
                );
            }

            // Try PaddleOCR first
            let result = await this.tryPaddleOCR(imageBuffer, requestId);
            let engine: OCREngine = 'paddleocr';

            // Check if fallback needed
            const { ACCEPT, FALLBACK } = OCR_CONFIG.CONFIDENCE_THRESHOLDS.PADDLE_OCR;

            if (result.confidence.overall < ACCEPT && result.confidence.overall >= FALLBACK) {
                logger.info('OCR_FALLBACK_TRIGGERED', {
                    requestId,
                    paddleConfidence: result.confidence.overall,
                    threshold: ACCEPT
                });

                // Try Google Vision (with quota check)
                const googleResult = await this.tryGoogleVision(imageBuffer, requestId);
                if (googleResult && googleResult.confidence.overall > result.confidence.overall) {
                    result = googleResult;
                    engine = 'google_vision';
                }
            }

            // Critical #1: Validate extracted fields
            const validationErrors = ocrValidationService.validateExtractedFields(
                result.extractedFields
            );

            // Determine status
            const requiresManualReview =
                result.confidence.overall < OCR_CONFIG.CONFIDENCE_THRESHOLDS.PADDLE_OCR.MANUAL ||
                ocrValidationService.requiresManualReview(validationErrors);

            const finalResult: OCRResult = {
                id: requestId,
                rawText: result.rawText,
                extractedFields: result.extractedFields,
                engine,
                confidence: result.confidence,
                validationErrors,
                status: requiresManualReview ? 'manual_review_required' : 'processed',
                requiresManualReview,
                processingTimeMs: Date.now() - startTime,
                fileHash,
                createdAt: new Date()
            };

            // Store receipt
            await this.storeReceipt(finalResult, metadata);

            logger.info('OCR_PROCESSING_SUCCESS', {
                requestId,
                engine,
                confidence: result.confidence.overall,
                validationErrors: validationErrors.length,
                requiresManualReview,
                processingTimeMs: finalResult.processingTimeMs
            });

            return finalResult;

        } catch (error) {
            if (error instanceof DuplicateReceiptError) {
                throw error;
            }

            logger.error('OCR_PROCESSING_FAILED', {
                requestId,
                error: error instanceof Error ? error.message : 'Unknown error',
                processingTimeMs: Date.now() - startTime
            });

            // Return manual review result on failure
            const fileHash = this.generateFileHash(imageBuffer);
            const failedResult: OCRResult = {
                id: requestId,
                rawText: 'OCR_FAILED', // Set non-empty string for required field
                extractedFields: {},
                engine: 'manual',
                confidence: { vendor: 0, amount: 0, date: 0, overall: 0 },
                validationErrors: [{
                    field: 'system',
                    code: 'OCR_FAILED',
                    message: error instanceof Error ? error.message : 'OCR processing failed',
                    severity: 'critical'
                }],
                status: 'manual_review_required',
                requiresManualReview: true,
                processingTimeMs: Date.now() - startTime,
                fileHash,
                createdAt: new Date()
            };

            // Store failed receipt (Critical #2: for deduplication)
            try {
                await this.storeReceipt(failedResult, metadata);
            } catch (storeError) {
                logger.error('Failed to store failed receipt', {
                    requestId,
                    error: storeError instanceof Error ? storeError.message : 'Unknown'
                });
            }

            return failedResult;
        }
    }

    /**
     * Critical #2: Generate SHA-256 hash for deduplication
     */
    private generateFileHash(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Critical #2: Check if receipt already exists
     */
    private async findByHash(fileHash: string): Promise<any | null> {
        // P0 Fix #1: Use MongoDB instead of in-memory Map
        const receipt = await ReceiptModel.findOne({ fileHash });
        return receipt;
    }

    /**
     * Store processed receipt
     */
    private async storeReceipt(
        result: OCRResult,
        metadata: { filename: string; mimeType: string; fileSize?: number }
    ): Promise<void> {
        // P0 Fix #1: Store in MongoDB
        await ReceiptModel.create({
            fileHash: result.fileHash,
            filename: metadata.filename,
            mimeType: metadata.mimeType,
            fileSize: metadata.fileSize || 0,
            ocrText: result.rawText,
            confidence: result.confidence.overall,
            engine: result.engine,
            extractedFields: result.extractedFields,
            validationErrors: result.validationErrors,
            status: result.status,
            requiresManualReview: result.requiresManualReview,
            processingTimeMs: result.processingTimeMs
        });
    }

    /**
     * Try PaddleOCR (primary engine)
     */
    private async tryPaddleOCR(
        imageBuffer: Buffer,
        requestId: string
    ): Promise<{ rawText: string; extractedFields: ExtractedReceiptFields; confidence: FieldConfidence }> {
        try {
            const response = await axios.post(
                `${this.paddleOcrUrl}/ocr/extract`,
                {
                    image: imageBuffer.toString('base64'),
                    lang: 'thai'
                },
                {
                    timeout: OCR_CONFIG.TIMEOUT_MS,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const data = response.data;
            return {
                rawText: data.text || '',
                extractedFields: this.parseReceiptFields(data.text || ''),
                confidence: {
                    vendor: data.confidence?.vendor || 0.5,
                    amount: data.confidence?.amount || 0.5,
                    date: data.confidence?.date || 0.5,
                    overall: data.confidence?.overall || 0.5
                }
            };
        } catch (error) {
            logger.warn('PaddleOCR failed, will try fallback', {
                requestId,
                error: error instanceof Error ? error.message : 'Unknown'
            });

            // Return low confidence to trigger fallback
            return {
                rawText: '',
                extractedFields: {},
                confidence: { vendor: 0, amount: 0, date: 0, overall: 0 }
            };
        }
    }

    /**
     * Try Google Vision (fallback engine)
     * P0 Fix #3: Now uses Service Account via GoogleVisionService
     */
    private async tryGoogleVision(
        imageBuffer: Buffer,
        requestId: string
    ): Promise<{ rawText: string; extractedFields: ExtractedReceiptFields; confidence: FieldConfidence } | null> {
        const { googleVisionService } = await import('./GoogleVisionService');

        if (!googleVisionService.isAvailable()) {
            logger.info('Google Vision Service not available', { requestId });
            return null;
        }

        try {
            logger.info('Attempting Google Vision fallback', { requestId });

            const result = await googleVisionService.extractText(imageBuffer);

            if (!result) {
                logger.warn('Google Vision returned no result (quota exhausted?)', { requestId });
                return null;
            }

            logger.info('Google Vision extraction successful', {
                requestId,
                textLength: result.rawText.length,
                confidence: result.confidence.overall
            });

            return result;

        } catch (error) {
            logger.error('Google Vision extraction failed', {
                requestId,
                error: error instanceof Error ? error.message : 'Unknown'
            });
            return null;
        }
    }

    /**
     * Critical #4: Check Google Vision quota
     */
    private async checkGoogleVisionQuota(): Promise<boolean> {
        // P0 Fix #1: Use MongoDB for quota tracking
        const available = await QuotaModel.checkAvailability('google_vision');

        if (!available) {
            const quota = await QuotaModel.getOrCreateToday('google_vision');
            await this.sendQuotaAlert(quota.count);
        }

        return available;
    }

    /**
     * Critical #4: Increment quota counter
     */
    private async incrementGoogleVisionQuota(): Promise<void> {
        // P0 Fix #1: Use MongoDB for quota tracking
        await QuotaModel.incrementUsage('google_vision');
    }

    /**
     * Critical #4: Send Discord alert when quota low/exhausted
     */
    private async sendQuotaAlert(currentCount: number): Promise<void> {
        const webhookUrl = config.DISCORD_WEBHOOK_CRITICAL;
        if (!webhookUrl) return;

        try {
            await axios.post(webhookUrl, {
                embeds: [{
                    title: '⚠️ Google Vision Quota Alert',
                    description: `Daily quota exhausted: ${currentCount}/${OCR_CONFIG.GOOGLE_VISION_DAILY_LIMIT}`,
                    color: 0xFF0000,
                    timestamp: new Date().toISOString()
                }]
            });
        } catch {
            logger.error('Failed to send quota alert to Discord');
        }
    }

    /**
     * Parse raw OCR text into structured receipt fields
     */
    private parseReceiptFields(text: string): ExtractedReceiptFields {
        const fields: ExtractedReceiptFields = {};

        // Extract vendor (first line usually)
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            fields.vendor = lines[0].trim();
        }

        // Extract amount (Thai Baht patterns)
        const amountPatterns = [
            /รวม\s*[:\s]*฿?\s*([\d,]+\.?\d*)/i,
            /ยอดรวม\s*[:\s]*฿?\s*([\d,]+\.?\d*)/i,
            /total\s*[:\s]*฿?\s*([\d,]+\.?\d*)/i,
            /฿\s*([\d,]+\.?\d*)/,
            /([\d,]+\.?\d*)\s*(?:บาท|THB)/i
        ];

        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match) {
                const satang = ocrValidationService.parseThaiBahtToSatang(match[1]);
                if (satang !== null) {
                    fields.amount = satang;
                    break;
                }
            }
        }

        // Extract date
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                // Try to parse and normalize to YYYY-MM-DD
                try {
                    let year = match[3] || match[1];
                    let month = match[2];
                    let day = match[1] || match[3];

                    // Handle 2-digit year
                    if (year.length === 2) {
                        year = `20${year}`;
                    }

                    // Handle Buddhist Era (BE) - subtract 543
                    const yearNum = parseInt(year);
                    if (yearNum > 2500) {
                        year = String(yearNum - 543);
                    }

                    fields.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    break;
                } catch {
                    // Continue to next pattern
                }
            }
        }

        // Extract Tax ID (13 digits)
        const taxIdMatch = text.match(/(?:เลขประจำตัวผู้เสียภาษี|Tax\s*ID)[:\s]*(\d[\d\-\s]{12,16}\d)/i);
        if (taxIdMatch) {
            fields.taxId = taxIdMatch[1].replace(/[\-\s]/g, '');
        }

        // Extract VAT
        const vatMatch = text.match(/(?:VAT|ภาษีมูลค่าเพิ่ม|vat\s*7%?)[:\s]*฿?\s*([\d,]+\.?\d*)/i);
        if (vatMatch) {
            const vatSatang = ocrValidationService.parseThaiBahtToSatang(vatMatch[1]);
            if (vatSatang !== null) {
                fields.vatAmount = vatSatang;
            }
        }

        return fields;
    }

    /**
     * Get OCR processing metrics
     */
    async getMetrics(): Promise<{
        paddleOcr: { totalProcessed: number; avgConfidence: number };
        googleVision: { totalProcessed: number; quotaUsed: number; quotaLimit: number };
        manualReview: { pending: number };
    }> {
        // P0 Fix #1: Use MongoDB aggregations
        const [paddleStats] = await ReceiptModel.aggregate([
            { $match: { engine: 'paddleocr' } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    avgConf: { $avg: '$confidence' }
                }
            }
        ]);

        const googleCount = await ReceiptModel.countDocuments({ engine: 'google_vision' });
        const manualCount = await ReceiptModel.countDocuments({
            requiresManualReview: true,
            status: 'manual_review_required'
        });

        const quota = await QuotaModel.getOrCreateToday('google_vision');

        return {
            paddleOcr: {
                totalProcessed: paddleStats?.count || 0,
                avgConfidence: paddleStats?.avgConf || 0
            },
            googleVision: {
                totalProcessed: googleCount,
                quotaUsed: quota.count,
                quotaLimit: quota.limit
            },
            manualReview: {
                pending: manualCount
            }
        };
    }
}

/**
 * Custom error for duplicate receipt detection (Critical #2)
 */
export class DuplicateReceiptError extends Error {
    public readonly existingId: string;

    constructor(message: string, existingId: string) {
        super(message);
        this.name = 'DuplicateReceiptError';
        this.existingId = existingId;
    }
}

// Singleton export
export const ocrService = new OCRService();
