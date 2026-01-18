import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { startSession } from 'mongoose';
import { GoogleDriveService } from '../modules/files/GoogleDriveService';
import { ExportQueueModel } from '../modules/export/models/ExportQueue';
import { ExportLogModel } from '../modules/export/models/ExportLog';
import { sendInfoLog, sendCriticalAlert } from '../loaders/logger';
import logger from '../loaders/logger';
import { configService } from '../modules/config/services/ConfigService';
import iconv from 'iconv-lite';

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
 * 5. Dynamic Scheduling via ConfigService
 */
export class DailyExportJob {
    private job: ScheduledTask | null = null;
    private retryCount = 0;
    private readonly MAX_RETRIES = 3;
    // [NEW] Track running state
    private isRunning = false;

    constructor(
        private googleDrive: GoogleDriveService
    ) {
        // [NEW] Listen for config changes (Hot-Reload)
        configService.on('config:changed', async (event) => {
            if (event.key === 'DAILY_EXPORT_TIME') {
                logger.info(`🔄 Daily Export Schedule updating to ${event.newValue}...`);
                await this.stop();
                await this.start();
            }
        });
    }

    /**
     * Start the daily export job
     * Schedule: Dynamic based on ConfigService (default 18:00)
     */
    async start(): Promise<void> {
        // [NEW] Get dynamic time from ConfigService
        let scheduleTime = '18:00';
        try {
            scheduleTime = await configService.get('DAILY_EXPORT_TIME');
        } catch (e) {
            logger.warn('Failed to get export time from config, using default 18:00');
        }

        const [hour, minute] = scheduleTime.split(':');

        // Cron format: "minute hour * * *"
        // Timezone-aware scheduling
        // Note: node-cron uses "minute hour day month day-of-week"
        const cronExpression = `${minute} ${hour} * * *`;

        this.job = cron.schedule(cronExpression, () => {
            this.executeDaily().catch(async err => {
                logger.error('[Cron] Daily export failed:', err);
                // Fix: Pass error as metadata to avoid Discord Title limit (256 chars)
                await sendCriticalAlert('Daily Export Failed', {
                    error: err instanceof Error ? err.message : 'Unknown error',
                    details: err.response?.data || 'No details'
                });
            });
        }, {
            timezone: 'Asia/Bangkok'
        });

        logger.info(`[Cron] Daily export job scheduled for ${scheduleTime} Bangkok time`);
    }

    /**
     * Stop the cron job (for graceful shutdown)
     */
    async stop(): Promise<void> {
        if (this.job) {
            this.job.stop();
            this.job = null;
            logger.info('[Cron] Daily export job stopped');
        }
    }

    /**
     * Main execution logic
     * Execute the daily export process
     * 1. Check for scheduled entries
     * 2. Generate detailed CSV
     * 3. Upload to Google Drive
     * 4. Log to database and Discord
     */
    /**
     * Main execution logic
     * Execute the daily export process
     * @param forceIfScheduled - If true, export all queued scheduled items regardless of time
     */
    public async executeDaily(forceIfScheduled: boolean = false): Promise<{ processed: number; fileId?: string }> {
        if (this.isRunning) {
            logger.warn('[Cron] Job already running, skipping overlapping execution.');
            return { processed: 0 };
        }

        this.isRunning = true;
        const startTime = Date.now();
        const session = await startSession();
        session.startTransaction();

        try {
            const today = dayjs().format('YYYY-MM-DD');
            logger.info(`[Cron] Daily export started at ${new Date().toISOString()} (Force: ${forceIfScheduled})`);

            // Query condition
            const query: any = {
                exportPath: 'scheduled',
                status: 'queued'
            };

            // Only check time if NOT forcing
            if (!forceIfScheduled) {
                query.scheduledFor = { $lte: new Date() };
            }

            // Fetch queued entries (consistent read within transaction)
            const queuedEntries = await ExportQueueModel.find(query)
                .populate('entryId')
                .session(session);

            if (queuedEntries.length === 0) {
                logger.info('[Cron] No scheduled entries to export');
                await session.commitTransaction();
                return { processed: 0 };
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
                    return { processed: 0 };
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

            // Send Discord notification
            const totalDuration = Date.now() - startTime;
            await sendInfoLog('Daily Export Complete', {
                title: 'Daily Batch Export Success',
                fields: [
                    { name: 'Batch Date', value: today },
                    { name: 'Entries', value: queuedEntries.length.toString() },
                    { name: 'File ID', value: uploadResult.fileId },
                    { name: 'Size', value: `${(csvBuffer.length / 1024).toFixed(2)} KB` },
                    { name: 'Duration', value: `${totalDuration}ms` }
                ]
            });

            logger.info('[Cron] Daily export completed', {
                entriesCount: queuedEntries.length,
                csvSize: `${(csvBuffer.length / 1024).toFixed(2)} KB`,
                uploadDuration,
                totalDuration
            });

            return { processed: queuedEntries.length, fileId: uploadResult.fileId };

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
                await sendCriticalAlert('Daily Batch Export Failed (Max Retries)', {
                    error: error.message,
                    status: 'Manual intervention required'
                });
                this.retryCount = 0; // Reset for next day
                throw error;
            }

            // Different error handling strategies
            if (error.message === 'CSV generation timeout') {
                // Exponential backoff: 5min, 15min, 45min
                const delayMs = Math.pow(3, this.retryCount) * 5 * 60 * 1000;
                this.retryCount++;

                await sendCriticalAlert('Batch CSV Generation Timeout', {
                    attempt: `${this.retryCount}/${this.MAX_RETRIES}`,
                    nextRetry: `${delayMs / 60000} minutes`
                });

                setTimeout(() => this.executeDaily(), delayMs);
            } else if (error.message.includes('Google Drive')) {
                const delayMs = Math.pow(3, this.retryCount) * 5 * 60 * 1000;
                this.retryCount++;

                await sendCriticalAlert('Google Drive Error', {
                    error: error.message,
                    attempt: `${this.retryCount}/${this.MAX_RETRIES}`,
                    nextRetry: `${delayMs / 60000} minutes`,
                    action: 'Check credentials'
                });

                setTimeout(() => this.executeDaily(), delayMs);
            } else {
                const delayMs = Math.pow(3, this.retryCount) * 5 * 60 * 1000;
                this.retryCount++;

                await sendCriticalAlert('Daily Batch Export Failed (Retry)', {
                    error: error.message,
                    attempt: `${this.retryCount}/${this.MAX_RETRIES}`,
                    nextRetry: `${delayMs / 60000} minutes`
                });

                setTimeout(() => this.executeDaily(), delayMs);
            }

            throw error;
        } finally {
            this.isRunning = false;
            session.endSession();
        }
    }

    /**
     * Generate CSV from queued entries (Express Compatible)
     * Format: ~VOUCHER, ~ACCVOU logic for import
     * Encoding: TIS-620 (Windows-874) for Thai support
     */
    private async generateBatchCSV(queuedEntries: Array<{ entryId: any }>): Promise<Buffer> {
        // Express Auto Import Format usually mimics the text file import structure
        // Simple Comma Delimited for Express (Double Entry)
        // Header: Date,Voucher No,Account,Debit,Credit,Description
        const rows: string[] = ['Date,Voucher No,Account,Debit,Credit,Description'];

        let totalDebit = 0;
        let totalCredit = 0;

        for (const queue of queuedEntries) {
            const entry = queue.entryId;
            if (!entry) continue;

            // Generate Voucher No (e.g., JV-YYMM- running)
            // Use clientId if available, or simulate one
            const voucherNo = entry.clientId || `JV-${dayjs(entry.date).format('YYMM')}-${entry._id.toString().substring(18)}`;
            const dateStr = dayjs(entry.date).format('DD/MM/YYYY');

            // Safe Strings used in helper
            const sanitize = (val: any): string => {
                const str = String(val || '');
                return str.replace(/"/g, '""').replace(/,/g, ' '); // Remove commas to prevent col shift
            };

            const desc = sanitize(entry.description);
            const amount = (entry.amount / 100).toFixed(2); // Convert Satang to Baht

            // Line 1: Debit Row
            const drRow = [
                dateStr,
                voucherNo,
                sanitize(entry.accountCode),   // Account
                amount,                        // Debit
                '0.00',                        // Credit
                desc                           // Description
            ].join(',');

            rows.push(drRow);
            totalDebit += entry.amount;

            // Line 2: Credit Row
            // Use metadata.crAccount if available, else fallback
            const crAccount = entry.metadata?.crAccount || '2001-01';

            const crRow = [
                dateStr,
                voucherNo,
                sanitize(crAccount),           // Account
                '0.00',                        // Debit
                amount,                        // Credit
                desc                           // Description
            ].join(',');

            rows.push(crRow);
            totalCredit += entry.amount;
        }

        // Encode to TIS-620 for Thai Language Support in Express
        const csvContent = rows.join('\r\n'); // Windows EOL
        return iconv.encode(csvContent, 'win874'); // win874 is superset of TIS-620
    }
}
