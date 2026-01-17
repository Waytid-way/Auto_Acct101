import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Teable Webhooks
 * Prevents DoS attacks on webhook endpoint
 * Limit: 100 requests per minute
 */
export const webhookRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Max 100 webhooks per minute
    message: 'Too many webhook requests',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'Webhook rate limit exceeded',
            retryAfter: 60, // Seconds
        });
    },
});
