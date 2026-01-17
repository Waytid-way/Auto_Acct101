/**
 * Rate Limiter Middleware
 * P0 Fix #4: Expert Review - DDoS and resource exhaustion protection
 * 
 * Protects OCR endpoints from:
 * - Brute-force attacks
 * - Resource exhaustion
 * - Abuse of paid API quota (Google Vision)
 */

import rateLimit from 'express-rate-limit';
import logger from '@loaders/logger';

/**
 * OCR Upload Rate Limiter
 * - 20 requests per 15 minutes per IP
 * - Reasonable for daily workers (80 requests/hour)
 * - Prevents quota exhaustion attacks
 */
export const ocrUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per windowMs
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many OCR requests. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers

    // Custom key generator (by IP)
    keyGenerator: (req) => {
        return req.ip || req.socket.remoteAddress || 'unknown';
    },

    // Log rate limit violations
    handler: (req, res) => {
        logger.warn('OCR_RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            path: req.path,
            headers: req.headers['user-agent']
        });

        res.status(429).json({
            error: 'TOO_MANY_REQUESTS',
            message: 'Too many OCR requests from this IP. Please try again in 15 minutes.',
            retryAfter: Math.ceil(req.rateLimit.resetTime - Date.now()) / 1000
        });
    }
});

/**
 * OCR Metrics Rate Limiter
 * - 60 requests per minute per IP
 * - Less strict for read-only metrics endpoint
 */
export const ocrMetricsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many metrics requests. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        logger.warn('OCR_METRICS_RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            path: req.path
        });

        res.status(429).json({
            error: 'TOO_MANY_REQUESTS',
            message: 'Too many metrics requests. Please wait.'
        });
    }
});

/**
 * Strict Rate Limiter for Batch Operations
 * - 5 requests per hour per IP
 * - Very strict to prevent abuse
 */
export const ocrBatchLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 batch uploads per hour
    message: {
        error: 'TOO_MANY_BATCH_REQUESTS',
        message: 'Batch upload limit exceeded. Please wait 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        logger.warn('OCR_BATCH_RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            filesCount: req.files?.length || 0
        });

        res.status(429).json({
            error: 'TOO_MANY_BATCH_REQUESTS',
            message: 'Batch upload limit exceeded (5 per hour). Please try again later.',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});
