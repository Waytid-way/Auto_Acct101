import { Router, Request, Response } from 'express';
import { ExpressExportService } from './ExpressExportService';
import { ExportQueueModel } from './models/ExportQueue';
import { ExportLogModel } from './models/ExportLog';
import { ExportPath } from './types';
import { z } from 'zod';
import logger from '@loaders/logger';

const router = Router();
const exportService = new ExpressExportService();

/**
 * Zod Validation Schemas
 */
const QueueRequestSchema = z.object({
    entryId: z.string().min(1, 'Entry ID is required'),
    exportPath: z.enum(['manual', 'immediate', 'scheduled'], {
        errorMap: () => ({ message: 'Export path must be manual, immediate, or scheduled' })
    })
});

/**
 * POST /api/export/queue
 * Queue a journal entry for export
 */
router.post('/queue', async (req: Request, res: Response) => {
    try {
        // Validate request body
        const validation = QueueRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validation.error.errors
            });
        }

        const { entryId, exportPath } = validation.data;

        // Get user ID (would come from auth middleware in production)
        const userId = (req as any).user?.id || 'system';

        // Queue the entry
        const queue = await exportService.queueForExport(
            entryId,
            exportPath as ExportPath,
            userId
        );

        // If immediate, trigger async processing
        if (exportPath === 'immediate') {
            // Fire and forget (don't await)
            exportService.processImmediate(queue._id.toString())
                .catch((error) => {
                    logger.error('Async processImmediate failed', { error, queueId: queue._id });
                });
        }

        return res.status(201).json({
            queueId: queue._id,
            status: queue.status,
            scheduledFor: queue.scheduledFor,
            message: `Entry queued for ${exportPath} export`
        });

    } catch (error: any) {
        logger.error('POST /queue failed', { error });

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('not approved') || error.message.includes('already queued')) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: 'Failed to queue export' });
    }
});

/**
 * GET /api/export/status/:entryId
 * Get export status for a journal entry
 */
router.get('/status/:entryId', async (req: Request, res: Response) => {
    try {
        const { entryId } = req.params;

        // Find queue by entryId
        const queue = await ExportQueueModel.findOne({ entryId });

        if (!queue) {
            return res.status(404).json({
                error: `No export queue found for entry ${entryId}`
            });
        }

        // Find all logs for this queue
        const logs = await ExportLogModel.find({ queueId: queue._id })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            queue: {
                id: queue._id,
                entryId: queue.entryId,
                exportPath: queue.exportPath,
                status: queue.status,
                attempts: queue.attempts,
                scheduledFor: queue.scheduledFor,
                completedAt: queue.completedAt,
                lastError: queue.lastError,
                metadata: queue.metadata,
                createdAt: queue.createdAt,
                updatedAt: queue.updatedAt
            },
            logs: logs.map(log => ({
                action: log.action,
                message: log.message,
                performedBy: log.performedBy,
                metadata: log.metadata,
                createdAt: log.createdAt
            }))
        });

    } catch (error: any) {
        logger.error('GET /status/:entryId failed', { error });
        return res.status(500).json({ error: 'Failed to get export status' });
    }
});

/**
 * POST /api/export/retry/:queueId
 * Manually retry a failed export
 */
router.post('/retry/:queueId', async (req: Request, res: Response) => {
    try {
        const { queueId } = req.params;

        // Find queue
        const queue = await ExportQueueModel.findById(queueId);

        if (!queue) {
            return res.status(404).json({
                error: `Queue ${queueId} not found`
            });
        }

        // Check if retry is allowed
        if (!queue.canRetry()) {
            return res.status(400).json({
                error: 'Cannot retry: maximum attempts (3) reached or queue is not in failed state',
                attempts: queue.attempts,
                status: queue.status
            });
        }

        // Retry the export
        await exportService.processImmediate(queueId);

        return res.status(200).json({
            success: true,
            message: 'Export retry initiated',
            queueId: queue._id,
            attempts: queue.attempts + 1
        });

    } catch (error: any) {
        logger.error('POST /retry/:queueId failed', { error });

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({
            error: 'Failed to retry export',
            message: error.message
        });
    }
});

/**
 * GET /api/export/metrics
 * Get export queue metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
    try {
        // Query metrics
        const [queued, processing, completed, failed] = await Promise.all([
            ExportQueueModel.countDocuments({ status: 'queued' }),
            ExportQueueModel.countDocuments({ status: 'processing' }),
            ExportQueueModel.countDocuments({ status: 'completed' }),
            ExportQueueModel.countDocuments({ status: 'failed' })
        ]);

        const total = queued + processing + completed + failed;
        const successRate = total > 0 ? (completed / (completed + failed || 1)) * 100 : 0;

        return res.status(200).json({
            metrics: {
                total,
                queued,
                processing,
                completed,
                failed,
                successRate: Math.round(successRate * 100) / 100, // 2 decimal places
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        logger.error('GET /metrics failed', { error });
        return res.status(500).json({ error: 'Failed to get metrics' });
    }
});

export default router;
