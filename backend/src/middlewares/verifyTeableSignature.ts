import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '@loaders/logger';

/**
 * Verify Teable Webhook Signature
 * Uses HMAC SHA-256 to validate webhook authenticity
 * Prevents unauthorized webhook calls
 */
export function verifyTeableSignature(
    req: Request,
    res: Response,
    next: NextFunction
): void | Response {
    // Get signature from header
    const signature = req.headers['x-teable-signature'] as string;

    // Get webhook secret from env
    const webhookSecret = process.env.TEABLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        // Log warning but allow (webhook secret not configured - test mode)
        if (!signature) {
            logger.warn('TEABLE_WEBHOOK_SECRET not set and no signature provided - allowing (test mode)');
        }
        return next();
    }

    if (!signature) {
        logger.warn('Webhook signature missing but secret is configured');
        return res.status(401).json({ error: 'Missing signature' });
    }

    try {
        // Create HMAC with body + secret
        const payload = JSON.stringify(req.body);
        const hash = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        // Compare signatures using timing-safe comparison
        const isValid = crypto.timingSafeEqual(
            Buffer.from(hash),
            Buffer.from(signature)
        );

        if (!isValid) {
            logger.error('Invalid webhook signature', {
                expected: hash.substring(0, 10) + '...',
                received: signature.substring(0, 10) + '...'
            });
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Signature valid - proceed
        next();
    } catch (error: any) {
        logger.error('Signature verification error', { error: error.message });
        return res.status(500).json({
            error: 'Signature verification failed',
            message: error.message
        });
    }
}
