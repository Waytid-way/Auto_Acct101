import cron, { ScheduledTask } from 'node-cron';
import { TeableClient } from '@modules/teable/TeableClient';
import { JournalEntryModel } from '@modules/accounting/models/JournalEntry.model';
import { ExportQueueModel } from '@modules/export/models/ExportQueue';
import config from '@config/env';
import logger, { sendInfoLog } from '@loaders/logger';

export class TeablePollingJob {
    private job: ScheduledTask | null = null;
    private teableClient: TeableClient;
    private isRunning: boolean = false;

    constructor() {
        this.teableClient = new TeableClient();
    }

    start() {
        if (!config.TEABLE_TABLE_ID) {
            logger.warn('Teable Polling Job skipped: No TEABLE_TABLE_ID');
            return;
        }

        // Run every minute
        this.job = cron.schedule('*/1 * * * *', () => this.execute());
        logger.info('🔄 Teable Polling Job started (every 60s)');

        // Initial run
        this.execute();
    }

    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('Teable Polling Job stopped');
        }
    }

    async execute() {
        if (this.isRunning) {
            logger.warn('Teable Polling Job overlap prevented');
            return;
        }

        this.isRunning = true;

        try {
            const records = await this.teableClient.getApprovedRecords(config.TEABLE_TABLE_ID!);

            if (records.length === 0) {
                // Silent return if nothing (reduce noise)
                return;
            }

            logger.info(`[Polling] Found ${records.length} approved records`);

            let synced = 0;

            for (const record of records) {
                try {
                    // 1. Get Mongo ID from Teable (May be null/undefined if new)
                    const entryId = record.fields['Journal Entry ID'];
                    const exportPathRaw = record.fields['Export Path'];

                    let entry: any = null;

                    if (entryId) {
                        entry = await JournalEntryModel.findById(entryId);
                    }

                    // 2. Create if not exists (Ingestion Fix)
                    if (!entry) {
                        logger.info(`[Polling] Ingesting new entry from Teable: ${record.id}`);

                        // Map fields (Handle Satang conversion)
                        // Assume Teable 'Amount' is numeric
                        // 'Amount' field might vary by setup, let's try standard names or fallback
                        const amountVal = record.fields['Amount'] || 0;
                        const satangAmount = Math.round(Number(amountVal) * 100);

                        // Validation: Golden Rule #1 (Integers)
                        if (satangAmount <= 0) {
                            logger.warn(`[Polling] Skipping invalid amount: ${amountVal} (Record: ${record.id})`);
                            continue;
                        }

                        // Map fields with robust fallbacks
                        const description = record.fields['Description'] || record.fields['Vendor'] || 'Imported from Teable';
                        const drAccount = record.fields['DR Account'] || record.fields['Account Code'] || 'Unknown';
                        const crAccount = record.fields['CR Account'] || '2001-01'; // Default AP

                        entry = await JournalEntryModel.create({
                            clientId: `TEABLE-${record.id}`,
                            date: record.fields['Date'] ? new Date(record.fields['Date'] as string) : new Date(),
                            accountCode: drAccount,
                            description: description,
                            amount: satangAmount,
                            type: (record.fields['Type'] as string)?.toLowerCase() || 'debit',
                            category: record.fields['Category'] || 'General',
                            source: 'teable_polling',
                            status: 'draft',
                            metadata: {
                                teableRecordId: record.id,
                                crAccount: crAccount
                            },
                            createdBy: 'teable_sync'
                        });

                        // 3. Write Back ID to Teable (Sync)
                        // Use Batch Endpoint for robustness (Fixed in previous step)
                        await this.teableClient.updateRecord(config.TEABLE_TABLE_ID!, record.id, {
                            'Journal Entry ID': entry._id.toString()
                        });

                        logger.info(`[Polling] Created Entry ${entry._id} from Teable Record ${record.id}`);
                    }

                    // 4. Update Status & Sync
                    // Check if status changed to 'approved' from something else
                    // OR if it's already 'approved' but not yet Queued (Retry logic)
                    const statusChanged = (record.fields['Status'] === 'Approved' && entry.status !== 'approved');
                    const notQueued = !(await ExportQueueModel.exists({ entryId: entry._id }));

                    if (statusChanged || (record.fields['Status'] === 'Approved' && notQueued)) {

                        await JournalEntryModel.updateOne(
                            { _id: entry._id },
                            {
                                status: 'approved',
                                approvedBy: 'teable_polling',
                                updatedAt: new Date()
                            }
                        );

                        // 5. Queue for Export
                        // Default to 'immediate' if not specified or unrecognized
                        const exportPath = (exportPathRaw && ['scheduled', 'immediate'].includes(exportPathRaw.toLowerCase()))
                            ? exportPathRaw.toLowerCase()
                            : 'immediate';

                        await ExportQueueModel.create({
                            entryId: entry._id,
                            status: 'queued',
                            exportPath: exportPath,
                            scheduledFor: exportPath === 'scheduled' ? this.getNext18OClock() : undefined,
                            createdAt: new Date(),
                            metadata: { source: 'teable_polling', teableRecordId: record.id }
                        });

                        synced++;
                        logger.info(`[Polling] Synced Entry ${entry._id} -> ${exportPath}`);

                        // Discord Alert - FORCE NOTIFICATION
                        await sendInfoLog(`✅ Teable Polling: Approved & Queued Entry ${entry._id}`, {
                            exportPath,
                            vendor: entry.vendor || 'Unknown',
                            amount: (entry.amount / 100).toFixed(2),
                            teableRecordId: record.id
                        });
                    }

                } catch (err: any) {
                    logger.error(`[Polling] Error processing record ${record.id}`, { error: err.message });
                }
            }

            if (synced > 0) {
                logger.info(`[Polling] Sync Complete. Synced: ${synced}`);
            }

        } catch (error: any) {
            logger.error('[Polling] Execution failed', { error: error.message });
        } finally {
            this.isRunning = false;
        }
    }

    private getNext18OClock(): Date {
        const next = new Date();
        next.setHours(18, 0, 0, 0);
        if (new Date() > next) {
            next.setDate(next.getDate() + 1);
        }
        return next;
    }
}
