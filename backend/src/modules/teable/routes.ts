import { Router } from 'express';
import { TeableWebhookController } from './controllers/TeableWebhookController';
import { ExpressExportService } from '../export/ExpressExportService';
import { webhookRateLimiter } from '@middlewares/webhookRateLimiter';
import { verifyTeableSignature } from '@middlewares/verifyTeableSignature';

const router = Router();

// Inject dependencies
const exportService = new ExpressExportService();
const webhookController = new TeableWebhookController(exportService);

/**
 * POST /webhooks/teable (mounted in express.ts)
 * Receives webhooks from Teable when entries are approved
 * Middleware stack: Rate limiting → Signature verification → Controller
 */
router.post(
    '/',
    webhookRateLimiter,
    verifyTeableSignature,
    webhookController.processWebhook.bind(webhookController)
);

export default router;
