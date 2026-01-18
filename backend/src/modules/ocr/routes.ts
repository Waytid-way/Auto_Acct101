/**
 * OCR Routes
 * Express router for OCR endpoints
 * P0 Fix #4: Applied rate limiting middleware
 */

import { Router } from 'express';
import multer from 'multer';
import { processReceipt, processBatch, getMetrics, healthCheck } from './OCRController';
import { OCR_CONFIG } from './types';
import {
    ocrUploadLimiter,
    ocrMetricsLimiter,
    ocrBatchLimiter
} from '@middlewares/rateLimiter';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: OCR_CONFIG.MAX_FILE_SIZE
    },
    fileFilter: (_req, file, cb) => {
        if ((OCR_CONFIG.ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${OCR_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`));
        }
    }
});

/**
 * POST /api/ocr/process-receipt
 * Upload and process a receipt image
 * P0 Fix #4: Rate limited to 20 req/15min
 * 
 * @body {file} image - Receipt image (JPEG, PNG, or PDF)
 * @returns {OCRResult} Extracted receipt data with classification
 */
router.post(
    '/process-receipt',
    ocrUploadLimiter,  // P0 Fix #4: Rate limiter
    upload.single('image'),
    processReceipt
);

/**
 * POST /api/ocr/process-batch
 * Upload and process multiple receipt images (up to 10)
 * P0 Fix #5: Batch upload support
 * Rate limited to 5 req/hour (very strict)
 * 
 * @body {file[]} images - Array of receipt images
 * @returns {BatchResult} Array of OCR results
 */
router.post(
    '/process-batch',
    ocrBatchLimiter,  // P0 Fix #4: Strict rate limiter (5/hour)
    upload.array('images', 10),  // Max 10 files
    processBatch
);

/**
 * GET /api/ocr/metrics
 * Get OCR service metrics and Google Vision quota status
 * P0 Fix #4: Rate limited to 60 req/min
 */
router.get('/metrics', ocrMetricsLimiter, getMetrics);

/**
 * GET /api/ocr/health
 * Health check for OCR service (no rate limiting)
 */
router.get('/health', healthCheck);

export default router;
