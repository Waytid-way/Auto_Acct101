import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, mock, jest } from 'bun:test';
import mongoose from 'mongoose';

// Mock logger before imports to prevent network calls
mock.module('../../src/loaders/logger', () => ({
    default: {
        info: mock(),
        error: mock(),
        warn: mock(),
    },
    sendInfoLog: mock(() => Promise.resolve()),
    sendCriticalAlert: mock(() => Promise.resolve()),
}));

import { DailyExportJob } from '../../src/jobs/DailyExportJob';
import { ExpressExportService } from '../../src/modules/export/ExpressExportService';
import { GoogleDriveService } from '../../src/modules/files/GoogleDriveService';
import { ExportQueueModel } from '../../src/modules/export/models/ExportQueue';
import { ExportLogModel } from '../../src/modules/export/models/ExportLog';
import { JournalEntryModel } from '../../src/modules/accounting/models/JournalEntry.model';
import { ExportAction } from '../../src/modules/export/types';

describe('Daily Export Integration Tests', () => {
    let job: DailyExportJob;
    let exportService: ExpressExportService;
    let googleDrive: GoogleDriveService;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(
                process.env.MONGODB_URI || 'mongodb://localhost:27017/test_daily_export_integration'
            );
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        jest.useFakeTimers(); // Use fake timers to control setTimeout

        // Clear collections
        await ExportQueueModel.deleteMany({});
        await ExportLogModel.deleteMany({});
        await JournalEntryModel.deleteMany({});

        // Create real service instances
        exportService = new ExpressExportService();

        // Mock Google Drive for integration tests
        googleDrive = {
            uploadFile: mock((filename: string, buffer: Buffer) =>
                Promise.resolve({
                    fileId: `test_${Date.now()}`,
                    webViewLink: `https://drive.google.com/file/d/test_${Date.now()}/view`
                })
            ),
            getFileUrl: mock(() => Promise.resolve('https://drive.google.com/test'))
        } as any;

        job = new DailyExportJob(exportService, googleDrive);
    }, { timeout: 60000 }); // 60 second timeout for beforeEach

    afterEach(async () => {
        job.stop();
        jest.useRealTimers(); // Restore real timers

        await ExportQueueModel.deleteMany({});
        await ExportLogModel.deleteMany({});
        await JournalEntryModel.deleteMany({});
    }, { timeout: 60000 }); // 60 second timeout for afterEach

    it('should process full batch export flow end-to-end', async () => {
        // Create journal entries
        const entries = await JournalEntryModel.create([
            {
                clientId: 'test-client',
                date: new Date('2026-01-18'),
                accountCode: '5000',
                description: 'Office Supplies',
                amount: 10000,
                type: 'debit',
                category: 'Expenses',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            },
            {
                clientId: 'test-client',
                date: new Date('2026-01-18'),
                accountCode: '1000',
                description: 'Cash Payment',
                amount: 10000,
                type: 'credit',
                category: 'Assets',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            },
            {
                clientId: 'test-client',
                date: new Date('2026-01-18'),
                accountCode: '5100',
                description: 'Utilities',
                amount: 5000,
                type: 'debit',
                category: 'Expenses',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            }
        ]);

        // Queue entries for scheduled export
        await ExportQueueModel.create([
            {
                entryId: entries[0]._id,
                exportPath: 'scheduled',
                status: 'queued',
                scheduledFor: new Date(),
                createdBy: 'system'
            },
            {
                entryId: entries[1]._id,
                exportPath: 'scheduled',
                status: 'queued',
                scheduledFor: new Date(),
                createdBy: 'system'
            },
            {
                entryId: entries[2]._id,
                exportPath: 'scheduled',
                status: 'queued',
                scheduledFor: new Date(),
                createdBy: 'system'
            }
        ]);

        // Execute daily export via private method
        const jobAny = job as any;
        await jobAny.executeDaily();

        // Verify Google Drive upload was called
        expect(googleDrive.uploadFile).toHaveBeenCalledTimes(1);
        const uploadCall = (googleDrive.uploadFile as any).mock.calls[0];
        expect(uploadCall[0]).toMatch(/^batch_\d{4}-\d{2}-\d{2}\.csv$/);
        expect(uploadCall[1]).toBeInstanceOf(Buffer);

        // Verify ExportQueue entries marked as completed
        const completedEntries = await ExportQueueModel.find({ status: 'completed' });
        expect(completedEntries.length).toBe(3);

        for (const entry of completedEntries) {
            expect(entry.completedAt).toBeDefined();
            expect(entry.metadata?.googleDriveFileId).toBeDefined();
            expect(entry.metadata?.googleDriveUrl).toBeDefined();
        }

        // Verify ExportLog entry created
        const logs = await ExportLogModel.find({ action: ExportAction.CSV_GENERATED });
        expect(logs.length).toBe(1);
        expect(logs[0].metadata?.entryCount).toBe(3);
        expect(logs[0].metadata?.fileId).toBeDefined();
        expect(logs[0].metadata?.webViewLink).toBeDefined();
    });

    it('should handle empty queue gracefully', async () => {
        // Execute with no queued entries
        const jobAny = job as any;
        await jobAny.executeDaily();

        // Should not upload to Google Drive
        expect(googleDrive.uploadFile).not.toHaveBeenCalled();

        // Should not create ExportLog entry
        const logs = await ExportLogModel.find({});
        expect(logs.length).toBe(0);
    });

    it('should verify ExportQueue and ExportLog state after batch', async () => {
        const today = new Date().toISOString().split('T')[0];

        // Create entries
        const entry = await JournalEntryModel.create({
            clientId: 'test-client',
            date: new Date(),
            accountCode: '5000',
            description: 'Test',
            amount: 10000,
            type: 'debit',
            category: 'Expenses',
            source: 'teable',
            createdBy: 'system',
            status: 'approved'
        });

        await ExportQueueModel.create({
            entryId: entry._id,
            exportPath: 'scheduled',
            status: 'queued',
            scheduledFor: new Date(),
            createdBy: 'system'
        });

        const jobAny = job as any;
        await jobAny.executeDaily();

        // Verify ExportQueue state
        const queue = await ExportQueueModel.findOne({ entryId: entry._id });
        expect(queue?.status).toBe('completed');
        expect(queue?.completedAt).toBeDefined();
        expect(queue?.metadata?.googleDriveFileId).toBeDefined();

        // Verify ExportLog state
        const log = await ExportLogModel.findOne({ action: ExportAction.CSV_GENERATED });
        expect(log).not.toBeNull();
        expect(log?.queueId).toBeNull(); // Batch operations have null queueId
        expect(log?.performedBy).toBe('system');
        expect(log?.metadata?.filename).toContain(today);
    });

    it('should handle idempotency - prevent duplicate batch same day', async () => {
        const today = new Date().toISOString().split('T')[0];

        // Create entry
        const entry = await JournalEntryModel.create({
            clientId: 'test-client',
            date: new Date(),
            accountCode: '5000',
            description: 'Test',
            amount: 10000,
            type: 'debit',
            category: 'Expenses',
            source: 'teable',
            createdBy: 'system',
            status: 'approved'
        });

        await ExportQueueModel.create({
            entryId: entry._id,
            exportPath: 'scheduled',
            status: 'queued',
            scheduledFor: new Date(),
            createdBy: 'system'
        });

        // First execution
        const jobAny = job as any;
        await jobAny.executeDaily();

        expect(googleDrive.uploadFile).toHaveBeenCalledTimes(1);

        // Second execution (same day)
        await jobAny.executeDaily();

        // Should NOT upload again
        expect(googleDrive.uploadFile).toHaveBeenCalledTimes(1); // Still 1, not 2

        // Should only have one ExportLog entry
        const logs = await ExportLogModel.find({ action: ExportAction.CSV_GENERATED });
        expect(logs.length).toBe(1);
    });

    it('should verify CSV content structure', async () => {
        const entries = await JournalEntryModel.create([
            {
                clientId: 'test-client',
                date: new Date('2026-01-18'),
                accountCode: '5000',
                description: 'Test Entry 1',
                amount: 10000,
                type: 'debit',
                category: 'Expenses',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            },
            {
                clientId: 'test-client',
                date: new Date('2026-01-18'),
                accountCode: '1000',
                description: 'Test Entry 2',
                amount: 10000,
                type: 'credit',
                category: 'Assets',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            }
        ]);

        await ExportQueueModel.create([
            {
                entryId: entries[0]._id,
                exportPath: 'scheduled',
                status: 'queued',
                scheduledFor: new Date(),
                createdBy: 'system'
            },
            {
                entryId: entries[1]._id,
                exportPath: 'scheduled',
                status: 'queued',
                scheduledFor: new Date(),
                createdBy: 'system'
            }
        ]);

        const jobAny = job as any;
        await jobAny.executeDaily();

        // Get the CSV buffer from upload call
        const uploadCall = (googleDrive.uploadFile as any).mock.calls[0];
        const csvBuffer = uploadCall[1] as Buffer;
        const csvContent = csvBuffer.toString('utf-8');

        // Verify CSV structure
        const lines = csvContent.split('\n');

        // Should have header
        expect(lines[0]).toContain('Entry ID');
        expect(lines[0]).toContain('Date');
        expect(lines[0]).toContain('Account');
        expect(lines[0]).toContain('Debit');
        expect(lines[0]).toContain('Credit');
        expect(lines[0]).toContain('Description');

        // Should have data rows (at least 2)
        expect(lines.length).toBeGreaterThanOrEqual(4); // Header + 2 data rows + totals

        // Should have TOTALS footer
        expect(csvContent).toContain('TOTALS');
    });

    it('should rollback transaction on Google Drive failure', async () => {
        // Mock Google Drive to fail
        (googleDrive.uploadFile as any).mockRejectedValueOnce(new Error('Google Drive quota exceeded'));

        const entry = await JournalEntryModel.create({
            clientId: 'test-client',
            date: new Date(),
            accountCode: '5000',
            description: 'Test',
            amount: 10000,
            type: 'debit',
            category: 'Expenses',
            source: 'teable',
            createdBy: 'system',
            status: 'approved'
        });

        await ExportQueueModel.create({
            entryId: entry._id,
            exportPath: 'scheduled',
            status: 'queued',
            scheduledFor: new Date(),
            createdBy: 'system'
        });

        // Execute should fail
        const jobAny = job as any;
        // Set retry count to max to prevent rescheduling (avoid background timer keeping process alive)
        jobAny.retryCount = 3;

        await expect(jobAny.executeDaily()).rejects.toThrow();

        // Verify entries still queued (not completed due to rollback)
        const queuedEntries = await ExportQueueModel.find({ status: 'queued' });
        expect(queuedEntries.length).toBe(1);

        // Verify no ExportLog created (transaction rolled back)
        const logs = await ExportLogModel.find({ action: ExportAction.CSV_GENERATED });
        expect(logs.length).toBe(0);
    }, { timeout: 60000 });
});
