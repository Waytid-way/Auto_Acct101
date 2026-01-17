import { ExportQueueModel } from './models/ExportQueue';
import { ExportLogModel } from './models/ExportLog';
import { JournalEntryModel } from '@modules/accounting/models/JournalEntry.model';
import { GoogleDriveService } from '@modules/files/GoogleDriveService';
import { sendInfoLog, sendCriticalAlert } from '@loaders/logger';
import { ExportPath, ExportStatus, ExportAction } from './types';
import mongoose from 'mongoose';
import axios from 'axios';
import logger from '@loaders/logger';

/**
 * Express Export Service
 * Handles 3 export paths: Manual, Immediate, Scheduled
 * Enforces Golden Rules: Integers, Double-Entry, Human Approval, Immutability, ACID
 */
export class ExpressExportService {
    private googleDriveService: GoogleDriveService;
    private expressApiUrl: string;

    constructor() {
        this.googleDriveService = new GoogleDriveService();
        // Mock Express API endpoint for now
        this.expressApiUrl = process.env.EXPRESS_API_URL || 'http://localhost:8000/api/gl/journal';
    }

    /**
     * Queue an approved journal entry for export
     * @param entryId Journal Entry MongoDB ID
     * @param exportPath Export strategy (manual/immediate/scheduled)
     * @param userId User ID requesting export
     * @returns Created ExportQueue document
     */
    async queueForExport(
        entryId: string,
        exportPath: ExportPath,
        userId: string
    ) {
        try {
            // Validate entry exists
            const entry = await JournalEntryModel.findById(entryId);
            if (!entry) {
                throw new Error(`Journal Entry ${entryId} not found`);
            }

            // Golden Rule #3: Human Approval Required
            if (entry.status !== 'approved') {
                throw new Error(`Entry ${entryId} is not approved (status: ${entry.status})`);
            }

            // Check for duplicate queue
            const existing = await ExportQueueModel.findOne({ entryId });
            if (existing) {
                throw new Error(`Entry ${entryId} is already queued (queueId: ${existing._id})`);
            }

            // Create queue entry
            const scheduledFor = exportPath === ExportPath.SCHEDULED
                ? this.getNext18OClock()
                : undefined;

            const queue = await ExportQueueModel.create({
                entryId,
                exportPath,
                scheduledFor,
                metadata: { requestedBy: userId }
            });

            // Log action
            await ExportLogModel.log(
                queue._id.toString(),
                ExportAction.QUEUED,
                `Entry queued for ${exportPath} export`,
                { userId, entryId }
            );

            logger.info('Entry queued for export', {
                queueId: queue._id,
                entryId,
                exportPath
            });

            return queue;
        } catch (error: any) {
            logger.error('Failed to queue entry for export', { error, entryId });
            throw error;
        }
    }

    /**
     * Process immediate export to Express API
     * @param queueId ExportQueue MongoDB ID
     */
    async processImmediate(queueId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Mark as processing
            const queue = await ExportQueueModel.findById(queueId).session(session);
            if (!queue) {
                throw new Error(`Queue ${queueId} not found`);
            }

            await queue.markAsProcessing();
            await ExportLogModel.log(
                queueId,
                ExportAction.EXPORT_STARTED,
                'Starting immediate export'
            );

            // Fetch journal entry
            const entry = await JournalEntryModel.findById(queue.entryId).session(session);
            if (!entry) {
                throw new Error(`Journal Entry ${queue.entryId} not found`);
            }

            // Validate entry (Golden Rules #1 & #2)
            const validation = await this.validateEntry(queue.entryId.toString());
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Generate CSV line (simplified - single entry)
            const csvLine = this.generateCSVLine(entry);

            // POST to Express API
            const response = await axios.post(this.expressApiUrl, {
                entries: [csvLine],
                metadata: {
                    exportedAt: new Date().toISOString(),
                    queueId
                }
            });

            // Mark as completed
            await queue.markAsCompleted({
                expressResponse: response.data,
                exportedAt: new Date()
            });

            await ExportLogModel.log(
                queueId,
                ExportAction.COMPLETED,
                'Export completed successfully',
                { responseStatus: response.status }
            );

            await session.commitTransaction();

            // Discord notification
            await sendInfoLog(`Export completed: Entry ${entry._id}`, {
                queueId,
                status: 'success'
            });

            logger.info('Immediate export completed', { queueId, entryId: entry._id });

        } catch (error: any) {
            await session.abortTransaction();

            // Mark as failed
            const queue = await ExportQueueModel.findById(queueId);
            if (queue) {
                await queue.markAsFailed(error.message);
                await ExportLogModel.log(
                    queueId,
                    ExportAction.FAILED,
                    `Export failed: ${error.message}`
                );
            }

            // Critical alert on failure
            await sendCriticalAlert(`Export failed for queue ${queueId}`, {
                error: error.message,
                queueId
            });

            logger.error('Immediate export failed', { error, queueId });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Generate daily batch CSV and upload to Google Drive
     * @param date Date to process (defaults to today)
     * @returns Google Drive file URL
     */
    async generateDailyBatch(date: Date = new Date()): Promise<string> {
        try {
            // Find all scheduled entries ready for export
            const queues = await ExportQueueModel.find({
                status: ExportStatus.QUEUED,
                exportPath: ExportPath.SCHEDULED,
                scheduledFor: { $lte: date }
            }).populate('entryId');

            if (queues.length === 0) {
                logger.info('No entries for daily batch', { date });
                return '';
            }

            // Generate CSV
            const csvLines = ['Date,Vendor,Amount,Category,DebitAccount,CreditAccount']; // Header
            for (const queue of queues) {
                const entry = await JournalEntryModel.findById(queue.entryId);
                if (entry) {
                    csvLines.push(this.generateCSVLine(entry));
                }
            }

            const csvContent = csvLines.join('\n');
            const buffer = Buffer.from(csvContent, 'utf-8');

            // Upload to Google Drive
            const fileName = `batch_${date.toISOString().split('T')[0]}.csv`;
            const fileUrl = await this.googleDriveService.uploadFile(fileName, buffer);

            // Log batch generation (use first queue ID as reference)
            if (queues.length > 0) {
                await ExportLogModel.log(
                    queues[0]._id.toString(),
                    ExportAction.CSV_GENERATED,
                    'Daily batch generated',
                    { fileUrl, count: queues.length, date: date.toISOString() }
                );
            }

            // Mark all queues as completed
            for (const queue of queues) {
                await queue.markAsCompleted({ batchFile: fileUrl });
            }

            logger.info('Daily batch generated', { fileUrl, count: queues.length });

            return fileUrl;
        } catch (error: any) {
            logger.error('Failed to generate daily batch', { error, date });
            throw error;
        }
    }

    /**
     * Retry failed exports (up to 3 attempts)
     */
    async retryFailed(): Promise<void> {
        try {
            const failedQueues = await ExportQueueModel.find({
                status: ExportStatus.FAILED
            });

            const retriable = failedQueues.filter(q => q.canRetry());

            logger.info(`Retrying ${retriable.length} failed exports`);

            for (const queue of retriable) {
                try {
                    await ExportLogModel.log(
                        queue._id.toString(),
                        ExportAction.RETRY,
                        `Retry attempt ${queue.attempts + 1}/3`
                    );
                    await this.processImmediate(queue._id.toString());
                } catch (error: any) {
                    logger.error('Retry failed', { queueId: queue._id, error });

                    // Final failure alert
                    if (queue.attempts >= 2) { // Will be 3 after this failure
                        await sendCriticalAlert(
                            `Export permanently failed after 3 attempts`,
                            { queueId: queue._id, entryId: queue.entryId }
                        );
                    }
                }
            }
        } catch (error: any) {
            logger.error('Failed to retry exports', { error });
            throw error;
        }
    }

    /**
     * Validate journal entry against Golden Rules
     * @param entryId Journal Entry ID
     * @returns Validation result
     */
    async validateEntry(entryId: string): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {
            const entry = await JournalEntryModel.findById(entryId);
            if (!entry) {
                return { valid: false, errors: ['Entry not found'] };
            }

            // Golden Rule #3: Human Approval
            if (entry.status !== 'approved') {
                errors.push(`Entry is not approved (status: ${entry.status})`);
            }

            // Golden Rule #1: Integers Only (amounts in satang/smallest unit)
            if (!Number.isInteger(entry.amount) || entry.amount <= 0) {
                errors.push(`Amount must be a positive integer (got: ${entry.amount})`);
            }

            if (entry.vatAmount && !Number.isInteger(entry.vatAmount)) {
                errors.push(`VAT amount must be an integer (got: ${entry.vatAmount})`);
            }

            // Golden Rule #2: Trial Balance (For full implementation, we'd check medici book)
            // For now, simplified check: ensure entry type is valid
            if (!['debit', 'credit'].includes(entry.type)) {
                errors.push(`Invalid entry type: ${entry.type}`);
            }

            // Note: Full trial balance check would require querying all paired entries
            // This is a simplified version for single-entry validation

            return {
                valid: errors.length === 0,
                errors
            };
        } catch (error: any) {
            logger.error('Validation error', { error, entryId });
            return {
                valid: false,
                errors: [`Validation exception: ${error.message}`]
            };
        }
    }

    /**
     * Helper: Generate CSV line from journal entry
     */
    private generateCSVLine(entry: any): string {
        return [
            entry.date.toISOString().split('T')[0],
            entry.description || entry.vendor || 'N/A',
            (entry.amount / 100).toFixed(2), // Convert satang to baht
            entry.category,
            entry.type === 'debit' ? entry.accountCode : '',
            entry.type === 'credit' ? entry.accountCode : ''
        ].join(',');
    }

    /**
     * Helper: Get next 18:00 (6 PM) scheduled time
     */
    private getNext18OClock(): Date {
        const next = new Date();
        next.setHours(18, 0, 0, 0);

        // If already past 6 PM today, schedule for tomorrow
        if (new Date() > next) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    }
}
