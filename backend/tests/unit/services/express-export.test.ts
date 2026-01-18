import { describe, it, expect, beforeAll, afterAll, mock, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { ExpressExportService } from '@modules/export/ExpressExportService';
import { ExportQueueModel } from '@modules/export/models/ExportQueue';
import { ExportLogModel } from '@modules/export/models/ExportLog';
import { JournalEntryModel } from '@modules/accounting/models/JournalEntry.model';
import { ExportPath, ExportStatus } from '@modules/export/types';

// Mock axios for Express API calls
mock.module('axios', () => ({
    default: {
        post: async () => ({ status: 200, data: { success: true } })
    }
}));

// Mock Google Drive Service
mock.module('@modules/files/GoogleDriveService', () => ({
    GoogleDriveService: class MockGoogleDriveService {
        async uploadFile() {
            return 'https://drive.google.com/mock/file/123';
        }
        async getFileUrl() {
            return 'https://drive.google.com/mock/file/123';
        }
    }
}));

// Mock Discord logger
mock.module('@loaders/logger', () => ({
    default: {
        info: () => { },
        error: () => { },
        warn: () => { }
    },
    sendInfoLog: async () => { },
    sendCriticalAlert: async () => { }
}));

describe('ExpressExportService', () => {
    let service: ExpressExportService;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_export_service');
        }
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        // Clear collections before each test
        await ExportQueueModel.deleteMany({});
        await ExportLogModel.deleteMany({});
        await JournalEntryModel.deleteMany({});

        service = new ExpressExportService();
    });

    describe('queueForExport', () => {
        it('should queue an approved entry successfully', async () => {
            // Create approved journal entry
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000, // 100 baht in satang
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const queue = await service.queueForExport(
                entry._id.toString(),
                ExportPath.IMMEDIATE,
                'user-123'
            );

            expect(queue.entryId.toString()).toBe(entry._id.toString());
            expect(queue.exportPath).toBe(ExportPath.IMMEDIATE);
            expect(queue.status).toBe(ExportStatus.QUEUED);

            // Check log was created
            const logs = await ExportLogModel.find({ queueId: queue._id });
            expect(logs.length).toBeGreaterThan(0);
        });

        it('should reject entry that is not approved', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'draft' // Not approved!
            });

            try {
                await service.queueForExport(entry._id.toString(), ExportPath.IMMEDIATE, 'user-123');
                throw new Error('Should have failed');
            } catch (error: any) {
                expect(error.message).toContain('not approved');
            }
        });

        it('should reject duplicate queue entries', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            // First queue
            await service.queueForExport(entry._id.toString(), ExportPath.IMMEDIATE, 'user-123');

            // Try duplicate
            try {
                await service.queueForExport(entry._id.toString(), ExportPath.SCHEDULED, 'user-123');
                throw new Error('Should have failed');
            } catch (error: any) {
                expect(error.message).toContain('already queued');
            }
        });

        it('should set scheduledFor for scheduled exports', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const queue = await service.queueForExport(
                entry._id.toString(),
                ExportPath.SCHEDULED,
                'user-123'
            );

            expect(queue.scheduledFor).toBeDefined();
            expect(queue.scheduledFor?.getHours()).toBe(18);
        });
    });

    describe('validateEntry', () => {
        it('should pass validation for valid entry', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000, // Integer
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const result = await service.validateEntry(entry._id.toString());
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail validation for non-integer amount', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 100.50, // Float - invalid!
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const result = await service.validateEntry(entry._id.toString());
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('integer'))).toBe(true);
        });

        it('should fail validation for unapproved entry', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'pending'
            });

            const result = await service.validateEntry(entry._id.toString());
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('approved'))).toBe(true);
        });
    });

    describe('processImmediate', () => {
        it('should process immediate export successfully', async () => {
            // Create entry and queue
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const queue = await service.queueForExport(
                entry._id.toString(),
                ExportPath.IMMEDIATE,
                'user-123'
            );

            // Process
            await service.processImmediate(queue._id.toString());

            // Check queue status
            const updated = await ExportQueueModel.findById(queue._id);
            expect(updated?.status).toBe(ExportStatus.COMPLETED);
            expect(updated?.completedAt).toBeDefined();
        });

        it('should fail export for invalid entry', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 100.99, // Invalid float
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const queue = await service.queueForExport(
                entry._id.toString(),
                ExportPath.IMMEDIATE,
                'user-123'
            );

            try {
                await service.processImmediate(queue._id.toString());
                throw new Error('Should have failed');
            } catch (error: any) {
                expect(error.message).toContain('Validation failed');
            }

            // Check queue is marked as failed
            const updated = await ExportQueueModel.findById(queue._id);
            expect(updated?.status).toBe(ExportStatus.FAILED);
            expect(updated?.attempts).toBe(1);
        });
    });

    describe('generateDailyBatch', () => {
        it('should generate batch CSV and upload to Drive', async () => {
            // Create multiple approved entries
            const entries = await JournalEntryModel.create([
                {
                    clientId: 'test-client',
                    date: new Date(),
                    accountCode: '5000',
                    description: 'Expense 1',
                    amount: 10000,
                    type: 'debit',
                    category: 'Office Supplies',
                    source: 'manual',
                    createdBy: 'user-123',
                    status: 'approved'
                },
                {
                    clientId: 'test-client',
                    date: new Date(),
                    accountCode: '5100',
                    description: 'Expense 2',
                    amount: 20000,
                    type: 'debit',
                    category: 'Travel',
                    source: 'manual',
                    createdBy: 'user-123',
                    status: 'approved'
                }
            ]);

            // Queue for scheduled export
            for (const entry of entries) {
                await service.queueForExport(
                    entry._id.toString(),
                    ExportPath.SCHEDULED,
                    'user-123'
                );
            }

            // Generate batch
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const fileUrl = await service.generateDailyBatch(tomorrow);

            expect(fileUrl).toContain('drive.google.com');

            // Check all queues are marked completed
            const queues = await ExportQueueModel.find({ status: ExportStatus.COMPLETED });
            expect(queues.length).toBe(2);
        });
    });

    describe('retryFailed', () => {
        it('should retry failed exports', async () => {
            // Create failed export
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const queue = await ExportQueueModel.create({
                entryId: entry._id,
                exportPath: ExportPath.IMMEDIATE,
                status: ExportStatus.FAILED,
                attempts: 1,
                lastError: 'Network error'
            });

            // Retry
            await service.retryFailed();

            // Check queue is now completed (mock axios returns success)
            const updated = await ExportQueueModel.findById(queue._id);
            expect(updated?.status).toBe(ExportStatus.COMPLETED);
        });

        it('should not retry if attempts >= 3', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const queue = await ExportQueueModel.create({
                entryId: entry._id,
                exportPath: ExportPath.IMMEDIATE,
                status: ExportStatus.FAILED,
                attempts: 3, // Max attempts
                lastError: 'Permanent failure'
            });

            // Retry
            await service.retryFailed();

            // Queue should still be failed
            const updated = await ExportQueueModel.findById(queue._id);
            expect(updated?.status).toBe(ExportStatus.FAILED);
            expect(updated?.attempts).toBe(3);
        });
    });
});
