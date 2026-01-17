import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock dependencies (must be before imports)
mock.module('axios', () => ({
    default: {
        post: async () => ({ status: 200, data: { success: true } })
    }
}));

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

import { createExpressApp } from '@loaders/express';
import { JournalEntryModel } from '@modules/accounting/models/JournalEntry.model';
import { ExportQueueModel } from '@modules/export/models/ExportQueue';
import { ExportLogModel } from '@modules/export/models/ExportLog';
import type { Application } from 'express';

describe('Teable Webhook Export Integration', () => {
    let app: Application;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(
                process.env.MONGODB_URI || 'mongodb://localhost:27017/test_teable_webhook'
            );
        }
        app = createExpressApp();
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
    });

    describe('Manual Export Path', () => {
        it('should queue entry with exportPath=manual', async () => {
            // Create approved entry
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            });

            // Send webhook payload
            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_manual_123',
                    tableId: 'tbl_test',
                    fields: {
                        status: 'approved',
                        exportPath: 'manual',
                        entryId: entry._id.toString()
                    }
                }
            };

            const response = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(200);

            // Verify response
            expect(response.body.success).toBe(true);
            expect(response.body.exportPath).toBe('manual');
            expect(response.body.queueId).toBeDefined();

            // Verify queue created
            const queue = await ExportQueueModel.findOne({ entryId: entry._id });
            expect(queue).toBeDefined();
            expect(queue?.status).toBe('queued');
            expect(queue?.exportPath).toBe('manual');
        });
    });

    describe('Immediate Export Path', () => {
        it('should queue entry with exportPath=immediate and trigger async', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            });

            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_immediate_456',
                    tableId: 'tbl_test',
                    fields: {
                        status: 'approved',
                        exportPath: 'immediate',
                        entryId: entry._id.toString()
                    }
                }
            };

            const response = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.exportPath).toBe('immediate');

            // Wait for async processing
            await new Promise(r => setTimeout(r, 500));

            // Check if queue was created
            const queue = await ExportQueueModel.findOne({ entryId: entry._id });
            expect(queue).toBeDefined();
        });
    });

    describe('Scheduled Export Path', () => {
        it('should queue entry with exportPath=scheduled and set scheduledFor=18:00', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            });

            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_scheduled_789',
                    tableId: 'tbl_test',
                    fields: {
                        status: 'approved',
                        exportPath: 'scheduled',
                        entryId: entry._id.toString()
                    }
                }
            };

            const response = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.scheduledFor).toBeDefined();

            // Verify scheduledFor is set to 18:00
            const queue = await ExportQueueModel.findOne({ entryId: entry._id });
            expect(queue?.scheduledFor).toBeDefined();
            expect(queue?.scheduledFor?.getHours()).toBe(18);
        });
    });

    describe('Idempotency', () => {
        it('should handle duplicate webhook (idempotency)', async () => {
            const entry = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test expense',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'teable',
                createdBy: 'system',
                status: 'approved'
            });

            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_duplicate_999',
                    tableId: 'tbl_test',
                    fields: {
                        status: 'approved',
                        exportPath: 'manual',
                        entryId: entry._id.toString()
                    }
                }
            };

            // First webhook
            const res1 = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(200);

            expect(res1.body.success).toBe(true);
            const queueId1 = res1.body.queueId;

            // Second webhook (duplicate - Teable retry)
            const res2 = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(200);

            expect(res2.body.success).toBe(true);
            expect(res2.body.message).toContain('already queued');
            expect(res2.body.queueId).toBe(queueId1); // Same queue ID

            // Verify only ONE queue entry
            const count = await ExportQueueModel.countDocuments({ entryId: entry._id });
            expect(count).toBe(1);
        });
    });

    describe('Validation & Error Handling', () => {
        it('should ignore unapproved record', async () => {
            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_draft_000',
                    tableId: 'tbl_test',
                    fields: {
                        status: 'draft', // NOT approved
                        exportPath: 'manual',
                        entryId: new mongoose.Types.ObjectId().toString()
                    }
                }
            };

            const response = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(200);

            expect(response.body.message).toContain('not approved');

            // Verify queue NOT created
            const count = await ExportQueueModel.countDocuments();
            expect(count).toBe(0);
        });

        it('should reject invalid exportPath', async () => {
            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_invalid_111',
                    tableId: 'tbl_test',
                    fields: {
                        status: 'approved',
                        exportPath: 'invalid_path', // Invalid!
                        entryId: new mongoose.Types.ObjectId().toString()
                    }
                }
            };

            const response = await request(app)
                .post('/webhooks/teable')
                .send(payload)
                .expect(400);

            expect(response.body.error).toBe('Invalid payload');
            expect(response.body.details).toBeDefined();
        });

        it('should reject missing required fields', async () => {
            const payload = {
                event: 'record.updated',
                data: {
                    recordId: 'rec_missing_222',
                    // Missing 'fields'
                }
            };

            const response = await request(app)
                .post('/webhooks/teable')
                .send(payload as any)
                .expect(400);

            expect(response.body.error).toBe('Invalid payload');
        });
    });
});

