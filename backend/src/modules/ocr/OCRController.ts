/**
 * OCR Controller
 * HTTP endpoints for receipt OCR processing
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '@loaders/logger';
import { ocrService, DuplicateReceiptError } from './OCRService';
import { groqService } from '@modules/ai/GroqClassificationService';
import { OCR_CONFIG, uploadRequestSchema } from './types';

/**
 * POST /api/ocr/process-receipt
 * Upload and process a receipt image
 */
export async function processReceipt(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const requestId = req.id || randomUUID();

    try {
        // Validate file upload
        if (!req.file) {
            res.status(400).json({
                error: 'NO_FILE_UPLOADED',
                message: 'Please upload a receipt image',
                requestId
            });
            return;
        }

        const { buffer, originalname, mimetype, size } = req.file;

        // Validate file metadata
        const validation = uploadRequestSchema.safeParse({
            filename: originalname,
            mimeType: mimetype,
            fileSize: size
        });

        if (!validation.success) {
            res.status(400).json({
                error: 'INVALID_FILE',
                message: validation.error.issues.map(e => e.message).join(', '),
                requestId
            });
            return;
        }

        // Check file size
        if (size > OCR_CONFIG.MAX_FILE_SIZE) {
            res.status(413).json({
                error: 'FILE_TOO_LARGE',
                message: `File size ${size} exceeds limit of ${OCR_CONFIG.MAX_FILE_SIZE} bytes`,
                requestId
            });
            return;
        }

        // Check MIME type
        if (!(OCR_CONFIG.ALLOWED_MIME_TYPES as readonly string[]).includes(mimetype)) {
            res.status(415).json({
                error: 'INVALID_FILE_TYPE',
                message: `File type ${mimetype} not allowed. Allowed: ${OCR_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`,
                requestId
            });
            return;
        }

        logger.info('Processing receipt upload', {
            requestId,
            filename: originalname,
            size,
            mimeType: mimetype
        });

        // Process with OCR
        const ocrResult = await ocrService.processReceipt(buffer, {
            filename: originalname,
            mimeType: mimetype
        });

        // If OCR successful and has amount, try Groq classification
        let classification = null;
        if (
            ocrResult.extractedFields.vendor &&
            ocrResult.extractedFields.amount &&
            !ocrResult.requiresManualReview
        ) {
            try {
                classification = await groqService.classifyEntry({
                    vendor: ocrResult.extractedFields.vendor,
                    amount: ocrResult.extractedFields.amount,
                    description: ocrResult.rawText.substring(0, 500), // First 500 chars
                    date: ocrResult.extractedFields.date
                        ? new Date(ocrResult.extractedFields.date)
                        : undefined
                });

                logger.info('Classification completed', {
                    requestId,
                    category: classification.category,
                    confidence: classification.confidence
                });
            } catch (classifyError) {
                logger.warn('Classification failed, continuing without', {
                    requestId,
                    error: classifyError instanceof Error ? classifyError.message : 'Unknown'
                });
            }
        }

        // Response
        res.status(200).json({
            success: true,
            requestId,
            receipt: {
                id: ocrResult.id,
                fileHash: ocrResult.fileHash,
                engine: ocrResult.engine,
                status: ocrResult.status,
                requiresManualReview: ocrResult.requiresManualReview
            },
            extracted: {
                vendor: ocrResult.extractedFields.vendor,
                amount: ocrResult.extractedFields.amount,
                amountFormatted: ocrResult.extractedFields.amount
                    ? `฿${(ocrResult.extractedFields.amount / 100).toFixed(2)}`
                    : null,
                date: ocrResult.extractedFields.date,
                taxId: ocrResult.extractedFields.taxId,
                vatAmount: ocrResult.extractedFields.vatAmount
            },
            confidence: ocrResult.confidence,
            validationErrors: ocrResult.validationErrors,
            classification: classification
                ? {
                    category: classification.category,
                    confidence: classification.confidence,
                    reasoning: classification.reasoning
                }
                : null,
            processingTimeMs: ocrResult.processingTimeMs
        });

    } catch (error) {
        if (error instanceof DuplicateReceiptError) {
            res.status(409).json({
                error: 'DUPLICATE_RECEIPT',
                message: error.message,
                existingId: error.existingId,
                requestId
            });
            return;
        }

        next(error);
    }
}

/**
 * GET /api/ocr/metrics
 * Get OCR service metrics and quota status
 */
export async function getMetrics(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const metrics = await ocrService.getMetrics();

        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/ocr/process-batch
 * Upload and process multiple receipt images
 * P0 Fix #5: Batch upload support
 */
export async function processBatch(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const requestId = req.id || randomUUID();
    const batchStartTime = Date.now();

    try {
        // Validate files upload
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).json({
                error: 'NO_FILES_UPLOADED',
                message: 'Please upload at least one receipt image',
                requestId
            });
            return;
        }

        const files = req.files as Express.Multer.File[];

        // Limit batch size
        const MAX_BATCH_SIZE = 10;
        if (files.length > MAX_BATCH_SIZE) {
            res.status(400).json({
                error: 'BATCH_TOO_LARGE',
                message: `Maximum ${MAX_BATCH_SIZE} files per batch. Received: ${files.length}`,
                requestId
            });
            return;
        }

        logger.info('Processing batch upload', {
            requestId,
            filesCount: files.length,
            totalSize: files.reduce((sum, f) => sum + f.size, 0)
        });

        // Process files with concurrency limit
        const CONCURRENCY_LIMIT = 5;
        const results: any[] = [];

        for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
            const batch = files.slice(i, i + CONCURRENCY_LIMIT);

            const batchResults = await Promise.allSettled(
                batch.map(async (file) => {
                    try {
                        // Process with OCR
                        const ocrResult = await ocrService.processReceipt(file.buffer, {
                            filename: file.originalname,
                            mimeType: file.mimetype
                        });

                        // Try classification if valid
                        let classification = null;
                        if (
                            ocrResult.extractedFields.vendor &&
                            ocrResult.extractedFields.amount &&
                            !ocrResult.requiresManualReview
                        ) {
                            try {
                                classification = await groqService.classifyEntry({
                                    vendor: ocrResult.extractedFields.vendor,
                                    amount: ocrResult.extractedFields.amount,
                                    description: ocrResult.rawText.substring(0, 500),
                                    date: ocrResult.extractedFields.date
                                        ? new Date(ocrResult.extractedFields.date)
                                        : undefined
                                });
                            } catch {
                                // Classification optional
                            }
                        }

                        return {
                            filename: file.originalname,
                            success: true,
                            receipt: {
                                id: ocrResult.id,
                                fileHash: ocrResult.fileHash,
                                engine: ocrResult.engine,
                                status: ocrResult.status,
                                requiresManualReview: ocrResult.requiresManualReview
                            },
                            extracted: {
                                vendor: ocrResult.extractedFields.vendor,
                                amount: ocrResult.extractedFields.amount,
                                amountFormatted: ocrResult.extractedFields.amount
                                    ? `฿${(ocrResult.extractedFields.amount / 100).toFixed(2)}`
                                    : null,
                                date: ocrResult.extractedFields.date,
                                taxId: ocrResult.extractedFields.taxId
                            },
                            confidence: ocrResult.confidence,
                            validationErrors: ocrResult.validationErrors,
                            classification,
                            processingTimeMs: ocrResult.processingTimeMs
                        };
                    } catch (error) {
                        if (error instanceof DuplicateReceiptError) {
                            return {
                                filename: file.originalname,
                                success: false,
                                error: 'DUPLICATE_RECEIPT',
                                message: error.message,
                                existingId: error.existingId
                            };
                        }
                        throw error;
                    }
                })
            );

            // Collect results
            batchResults.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({
                        filename: batch[idx].originalname,
                        success: false,
                        error: 'PROCESSING_FAILED',
                        message: result.reason instanceof Error ? result.reason.message : 'Unknown error'
                    });
                }
            });
        }

        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalProcessingTime = Date.now() - batchStartTime;

        logger.info('Batch processing completed', {
            requestId,
            total: files.length,
            successful,
            failed,
            totalProcessingTimeMs: totalProcessingTime
        });

        res.status(200).json({
            success: true,
            requestId,
            summary: {
                total: files.length,
                successful,
                failed,
                totalProcessingTimeMs: totalProcessingTime
            },
            results
        });

    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/ocr/health
 * Health check for OCR service
 */
export async function healthCheck(
    _req: Request,
    res: Response
): Promise<void> {
    // TODO: Actually ping PaddleOCR worker
    const healthy = true;

    res.status(healthy ? 200 : 503).json({
        service: 'ocr',
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        config: {
            paddleOcrUrl: process.env.OCR_WORKER_URL || 'http://localhost:5000',
            googleVisionEnabled: !!process.env.GOOGLE_VISION_API_KEY,
            dailyQuotaLimit: OCR_CONFIG.GOOGLE_VISION_DAILY_LIMIT
        }
    });
}
