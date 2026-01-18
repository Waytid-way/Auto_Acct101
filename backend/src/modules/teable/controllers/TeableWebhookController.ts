import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { TeableWebhookSchema } from '../schemas/TeableWebhookSchema';
import { ExpressExportService } from '../../export/ExpressExportService';
import { ExportQueueModel } from '../../export/models/ExportQueue';
import { ExportPath } from '../../export/types';
import { sendInfoLog, sendCriticalAlert } from '@loaders/logger';
import logger from '@loaders/logger';

/**
 * Teable Webhook Controller
 * Handles incoming webhooks from Teable when entries are approved
 * Implements idempotency, timeout handling, and comprehensive error logging
 */
export class TeableWebhookController {
    private exportService: ExpressExportService;

    constructor(exportService: ExpressExportService) {
        this.exportService = exportService;
    }

    /**
     * Process incoming Teable webhook
     * Validates payload, checks for duplicates, queues for export
     */
    async processWebhook(req: Request, res: Response): Promise<Response> {
        const startTime = Date.now();

        try {
            // 1. Validate payload with Zod
            const payload = TeableWebhookSchema.parse(req.body);
            const { recordId, fields } = payload.data;
            const { status, exportPath, entryId } = fields;

            // 2. Log incoming webhook
            logger.info('[Webhook] Received', {
                recordId,
                event: payload.event,
                exportPath,
                entryId
            });

            // 3. Only process approved entries
            if (status !== 'approved') {
                await sendInfoLog(`Webhook ignored: ${recordId} not approved (status: ${status})`);
                return res.status(200).json({
                    message: 'Record not approved - ignored',
                    recordId,
                    status
                });
            }

            // 4. IDEMPOTENCY CHECK: Prevent duplicate webhooks
            const existing = await ExportQueueModel.findOne({ entryId });
            if (existing) {
                await sendInfoLog(`Webhook duplicate: Entry ${entryId} already queued`);
                const duration = Date.now() - startTime;
                logger.info('[Webhook] Duplicate (idempotent)', {
                    duration: `${duration}ms`,
                    queueId: existing._id
                });

                return res.status(200).json({
                    success: true,
                    message: 'Entry already queued (idempotent)',
                    queueId: existing._id,
                    exportPath: existing.exportPath,
                    status: existing.status,
                });
            }

            // 5. Queue export with TIMEOUT (3 seconds)
            const queue = await Promise.race([
                this.exportService.queueForExport(
                    entryId,
                    exportPath as ExportPath,
                    'system'
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Queue timeout')), 3000)
                ),
            ]) as any;

            // 6. Fire-and-forget for immediate exports
            if (exportPath === 'immediate') {
                this.exportService.processImmediate(queue._id.toString()).catch((err) => {
                    sendCriticalAlert(`Immediate export failed: ${err.message}`, {
                        queueId: queue._id,
                        entryId
                    });
                });
            }

            // 7. Discord alert
            await sendInfoLog(
                `Teable webhook: Entry ${entryId} queued (path=${exportPath})`,
                { queueId: queue._id, recordId }
            );

            // 8. Log success
            const duration = Date.now() - startTime;
            logger.info('[Webhook] Success', {
                duration: `${duration}ms`,
                queueId: queue._id,
                exportPath
            });

            // 9. Return success response
            return res.status(200).json({
                success: true,
                queueId: queue._id,
                exportPath: queue.exportPath,
                status: queue.status,
                scheduledFor: queue.scheduledFor,
                message: `Queued for ${exportPath} export`,
            });

        } catch (error: any) {
            // Error handling with timing
            const duration = Date.now() - startTime;
            logger.error('[Webhook] Error', {
                duration: `${duration}ms`,
                error: error.message
            });

            // Zod validation error
            if (error instanceof ZodError) {
                await sendCriticalAlert(`Webhook validation failed: ${error.message}`);
                return res.status(400).json({
                    error: 'Invalid payload',
                    details: error.format(),
                });
            }

            // Timeout error
            if (error instanceof Error && error.message === 'Queue timeout') {
                await sendCriticalAlert('Webhook timeout: Queue operation too slow');
                return res.status(504).json({
                    error: 'Gateway timeout',
                    message: 'Queue operation timeout (>3s)',
                });
            }

            // Generic server error
            await sendCriticalAlert(`Webhook error: ${error.message}`);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
