import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { startSession } from 'mongoose';
import { ExpressExportService } from '../modules/export/ExpressExportService';
import { GoogleDriveService } from '../modules/files/GoogleDriveService';
import { ExportQueueModel } from '../modules/export/models/ExportQueue';
import { ExportLogModel } from '../modules/export/models/ExportLog';
import { sendInfoLog, sendCriticalAlert } from '../loaders/logger';
import logger from '../loaders/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Daily Export Job
 * Automated batch export of scheduled entries at 18:00 Bangkok time
 * 
 * CRITICAL FIXES IMPLEMENTED:
 * 1. Memory-safe CSV generation (Array.join, not string concat)
 * 2. Atomic idempotency with MongoDB unique _id (race-safe)
 * 3. Retry limit with exponential backoff (max 3 attempts)
 * 4. MongoDB transactions for ACID guarantees
 */
export class DailyExportJob {
    private job: cron.ScheduledTask | null = null;
    private retryCount = 0;
    private readonly MAX_RETRIES = 3;

    constructor(
        private exportService: ExpressExportService,
        private googleDrive: GoogleDriveService
    ) { }

    /**
     * Start the daily export job
     * Schedule: 18:00 Bangkok time (UTC+7) daily
     */
    start(): void {
        // Cron expression: "0 18 * * *" means 18:00 every day
        // Timezone-aware scheduling
        this.job = cron.schedule('0 18 * * *', () => {
            this.executeDaily().catch(err => {
                logger.error('[Cron] Daily export failed:', err);
                sendCriticalAlert(`Daily batch failed: ${err.message}`);
            });
        }, {
            timezone: 'Asia/Bangkok'
        });

        logger.info('[Cron] Daily export job scheduled for 18:00 Bangkok time');
    }

    /**
     * Stop the cron job (for graceful shutdown)
     */
    stop(): void {
        if (this.job) {
            this.job.stop();
            this.job = null;
            logger.info('[Cron] Daily export job stopped');
        }
    }

    /**
     * Main execution logic
     * CRITICAL FIX #2: Atomic idempotency with unique _id
     * CRITICAL FIX #3: Retry limit with exponential backoff
     * CRITICAL FIX #4: MongoDB transactions
     */
    private async executeDaily(): Promise<void> {
        const startTime = Date.now();
        const today = dayjs().tz('Asia/Bangkok').format('YYYY-MM-DD');
        const session = await startSession();

        try {
            session.startTransaction();

            logger.info(`[Cron] Daily export started at ${new Date().toISOString()}`);

            // Fetch queued entries (consistent read within transaction)
            const queuedEntries = await ExportQueueModel.find({
                exportPath: 'scheduled',
                status: 'queued',
                scheduledFor: { $lte: new Date() }
            })
                .populate('entryId')
                .session(session);

            if (queuedEntries.length === 0) {
                logger.info('[Cron] No scheduled entries to export');
                await session.commitTransaction();
                return;
            }

            logger.info(`[Cron] Found ${queuedEntries.length} entries to batch`);

            // Generate CSV with timeout
            const csvBuffer = await Promise.race([
                this.generateBatchCSV(queuedEntries),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('CSV generation timeout')), 30000)
                )
            ]);

            // Upload to Google Drive
            const uploadStartTime = Date.now();
            const filename = `batch_${today}.csv`;
            const uploadResult = await this.googleDrive.uploadFile(filename, csvBuffer);
            const uploadDuration = Date.now() - uploadStartTime;

            logger.info('[Cron] CSV uploaded to Google Drive', {
                filename,
                fileId: uploadResult.fileId,
                uploadDuration
            });

            // CRITICAL FIX #2: Atomic lock with unique index on metadata.batchDate
            // (prevents race condition - uses unique index instead of custom _id)
            // Create ExportLog AFTER upload with complete metadata
            try {
                await ExportLogModel.create(
                    [{
                        queueId: null,
                        action: 'csv_generated',
                        message: `Daily batch CSV generated: ${queuedEntries.length} entries`,
                        performedBy: 'system',
                        metadata: {
                            batchDate: today,
                            filename,
                            fileId: uploadResult.fileId,
                            webViewLink: uploadResult.webViewLink,
                            entryCount: queuedEntries.length,
                            csvSize: csvBuffer.length
                        }
                    }],
                    { session }
                );
            } catch (error: any) {
                if (error.code === 11000) {
                    // Duplicate key error - batch already generated today
                    logger.info('[Cron] Batch already generated today (race condition prevented by unique index)');
                    await session.abortTransaction();
                    return;
                }
                throw error;
            }

            // Mark queue entries as completed
            await ExportQueueModel.updateMany(
                { _id: { $in: queuedEntries.map(e => e._id) } },
                {
                    $set: {
                        status: 'completed',
                        completedAt: new Date(),
                        metadata: {
                            googleDriveFileId: uploadResult.fileId,
                            googleDriveUrl: uploadResult.webViewLink
                        }
                    }
                },
                { session }
            );

            // Commit transaction
            await session.commitTransaction();

            // Reset retry count on success
            this.retryCount = 0;

            // Discord notification
            await sendInfoLog({
                title: '✅ Daily Batch Export Ready',
                description: `${queuedEntries.length} entries exported to CSV`,
                fields: [
                    { name: 'Date', value: today },
                    { name: 'Entries', value: `${queuedEntries.length}` },
                    { name: 'File Size', value: `${(csvBuffer.length / 1024).toFixed(2)} KB` },
                    { name: 'Download Link', value: uploadResult.webViewLink || 'N/A' }
                ]
            });

            // Metrics
            const totalDuration = Date.now() - startTime;
            logger.info('[Cron] Daily export completed', {
                entriesCount: queuedEntries.length,
                csvSize: `${(csvBuffer.length / 1024).toFixed(2)} KB`,
                uploadDuration,
                totalDuration
            });

        } catch (error: any) {
            // Rollback transaction on any failure
            await session.abortTransaction();

            const duration = Date.now() - startTime;
            logger.error('[Cron] Daily export failed', {
                error: error.message,
                duration
            });

            // CRITICAL FIX #3: Retry limit with exponential backoff
            if (this.retryCount >= this.MAX_RETRIES) {
                await sendCriticalAlert(
                    `🚨 Daily batch export FAILED after ${this.MAX_RETRIES} attempts\n` +
                    `Error: ${error.message}\n` +
                    `Manual intervention required!`
                );
                this.retryCount = 0; // Reset for next day
                throw error;
            }

            // Different error handling strategies
            if (error.message === 'CSV generation timeout') {
                // Exponential backoff: 5min, 15min, 45min
                const delayMs = Math.pow(3, this.retryCount) * 5 * 60 * 1000;
                this.retryCount++;

                await sendCriticalAlert(
                    `⏱️ Batch CSV generation timeout (>30s)\n` +
                    `Retry attempt ${this.retryCount}/${this.MAX_RETRIES}\n` +
                    `Retrying in ${delayMs / 60000} minutes`
                );

                setTimeout(() => this.executeDaily(), delayMs);
            } else if (error.message.includes('Google Drive')) {
                const delayMs = Math.pow(3, this.retryCount) * 5 * 60 * 1000;
                this.retryCount++;

                await sendCriticalAlert(
                    `📁 Google Drive error: ${error.message}\n` +
                    `Retry attempt ${this.retryCount}/${this.MAX_RETRIES}\n` +
                    `Please check credentials\n` +
                    `Retrying in ${delayMs / 60000} minutes`
                );

                setTimeout(() => this.executeDaily(), delayMs);
            } else {
                const delayMs = Math.pow(3, this.retryCount) * 5 * 60 * 1000;
                this.retryCount++;

                await sendCriticalAlert(
                    `❌ Daily batch export failed: ${error.message}\n` +
                    `Retry attempt ${this.retryCount}/${this.MAX_RETRIES}\n` +
                    `Retrying in ${delayMs / 60000} minutes`
                );

                setTimeout(() => this.executeDaily(), delayMs);
            }

            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Generate CSV from queued entries
     * CRITICAL FIX #1: Memory-safe CSV generation using Array.join()
     * Prevents O(n²) memory allocation from string concatenation
     */
    private async generateBatchCSV(queuedEntries: Array<{ entryId: any }>): Promise<Buffer> {
        // Use array instead of string concatenation (prevents memory leak)
        const rows: string[] = ['Entry ID,Date,Account,Debit,Credit,Description'];

        let totalDebit = 0;
        let totalCredit = 0;

        // Generate CSV rows
        for (const queue of queuedEntries) {
            const entry = queue.entryId;
            if (!entry) continue;

            const debit = entry.amounts?.debit || 0;
            const credit = entry.amounts?.credit || 0;

            totalDebit += debit;
            totalCredit += credit;

            // Sanitize values to prevent CSV injection
            const sanitize = (val: any): string => {
                const str = String(val || '');
                // Escape dangerous characters that could be interpreted as formulas
                if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
                    return `'${str}`;
                }
                // Escape quotes
                return str.replace(/"/g, '""');
            };

            rows.push(
                `${sanitize(entry._id)},` +
                `${sanitize(entry.date)},` +
                `${sanitize(entry.account)},` +
                `${sanitize(debit)},` +
                `${sanitize(credit)},` +
                `${sanitize(entry.description)}`
            );
        }

        // CSV Footer (totals)
        rows.push(`\nTOTALS,,,${totalDebit},${totalCredit}`);

        // CRITICAL: Single join operation at the end (memory-efficient)
        return Buffer.from(rows.join('\n'), 'utf-8');
    }
}
