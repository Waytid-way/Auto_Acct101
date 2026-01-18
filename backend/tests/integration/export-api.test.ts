import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import mongoose from 'mongoose';

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

import { createExpressApp } from '@loaders/express';
import { JournalEntryModel } from '@modules/accounting/models/JournalEntry.model';
import { ExportQueueModel } from '@modules/export/models/ExportQueue';
import { ExportLogModel } from '@modules/export/models/ExportLog';
import type { Application } from 'express';

describe('Export API Integration Tests', () => {
    let app: Application;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_export_api');
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

    describe('POST /api/export/queue', () => {
        it('should queue an approved entry successfully', async () => {
            // Create approved journal entry
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

            const response = await request(app)
                .post('/api/export/queue')
                .send({
                    entryId: entry._id.toString(),
                    exportPath: 'manual'
                })
                .expect(201);

            expect(response.body.queueId).toBeDefined();
            expect(response.body.status).toBe('queued');
            expect(response.body.message).toContain('manual export');
        });

        it('should return 400 for missing fields', async () => {
            const response = await request(app)
                .post('/api/export/queue')
                .send({
                    // Missing entryId and exportPath
                })
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
            expect(response.body.details).toBeDefined();
        });

        it('should return 400 for invalid exportPath', async () => {
            const response = await request(app)
                .post('/api/export/queue')
                .send({
                    entryId: new mongoose.Types.ObjectId().toString(),
                    exportPath: 'invalid-path'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });

        it('should return 404 for non-existent entry', async () => {
            const response = await request(app)
                .post('/api/export/queue')
                .send({
                    entryId: new mongoose.Types.ObjectId().toString(),
                    exportPath: 'manual'
                })
                .expect(404);

            expect(response.body.error).toContain('not found');
        });

        it('should return 400 for unapproved entry', async () => {
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
                status: 'draft'
            });

            const response = await request(app)
                .post('/api/export/queue')
                .send({
                    entryId: entry._id.toString(),
                    exportPath: 'manual'
                })
                .expect(400);

            expect(response.body.error).toContain('not approved');
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

            const response = await request(app)
                .post('/api/export/queue')
                .send({
                    entryId: entry._id.toString(),
                    exportPath: 'scheduled'
                })
                .expect(201);

            expect(response.body.scheduledFor).toBeDefined();
        });
    });

    describe('GET /api/export/status/:entryId', () => {
        it('should return queue and logs for existing entry', async () => {
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

            // Queue the entry first
            await request(app)
                .post('/api/export/queue')
                .send({
                    entryId: entry._id.toString(),
                    exportPath: 'manual'
                });

            // Get status
            const response = await request(app)
                .get(`/api/export/status/${entry._id}`)
                .expect(200);

            expect(response.body.queue).toBeDefined();
            expect(response.body.queue.entryId).toBe(entry._id.toString());
            expect(response.body.logs).toBeInstanceOf(Array);
            expect(response.body.logs.length).toBeGreaterThan(0);
        });

        it('should return 404 for non-existent entry', async () => {
            const response = await request(app)
                .get(`/api/export/status/${new mongoose.Types.ObjectId()}`)
                .expect(404);

            expect(response.body.error).toBeDefined();
            expect(response.body.error.toLowerCase()).toContain('not found');
        });
    });

    describe('POST /api/export/retry/:queueId', () => {
        it('should retry a failed export', async () => {
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

            // Create a failed queue manually
            const queue = await ExportQueueModel.create({
                entryId: entry._id,
                exportPath: 'immediate',
                status: 'failed',
                attempts: 1,
                lastError: 'Network error'
            });

            const response = await request(app)
                .post(`/api/export/retry/${queue._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('retry initiated');
        });

        it('should return 400 when max attempts reached', async () => {
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
                exportPath: 'immediate',
                status: 'failed',
                attempts: 3,
                lastError: 'Max attempts'
            });

            const response = await request(app)
                .post(`/api/export/retry/${queue._id}`)
                .expect(400);

            expect(response.body.error).toContain('Cannot retry');
        });

        it('should return 404 for non-existent queue', async () => {
            const response = await request(app)
                .post(`/api/export/retry/${new mongoose.Types.ObjectId()}`)
                .expect(404);

            expect(response.body.error).toContain('not found');
        });
    });

    describe('GET /api/export/metrics', () => {
        it('should return correct metrics', async () => {
            // Create some test queues
            const entry1 = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5000',
                description: 'Test 1',
                amount: 10000,
                type: 'debit',
                category: 'Office Supplies',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            const entry2 = await JournalEntryModel.create({
                clientId: 'test-client',
                date: new Date(),
                accountCode: '5100',
                description: 'Test 2',
                amount: 20000,
                type: 'debit',
                category: 'Travel',
                source: 'manual',
                createdBy: 'user-123',
                status: 'approved'
            });

            // Queue entries
            await request(app)
                .post('/api/export/queue')
                .send({ entryId: entry1._id.toString(), exportPath: 'manual' });

            await request(app)
                .post('/api/export/queue')
                .send({ entryId: entry2._id.toString(), exportPath: 'manual' });

            // Get metrics
            const response = await request(app)
                .get('/api/export/metrics')
                .expect(200);

            expect(response.body.metrics).toBeDefined();
            expect(response.body.metrics.total).toBe(2);
            expect(response.body.metrics.queued).toBe(2);
            expect(response.body.metrics.timestamp).toBeDefined();
        });

        it('should return zero metrics for empty queue', async () => {
            const response = await request(app)
                .get('/api/export/metrics')
                .expect(200);

            expect(response.body.metrics.total).toBe(0);
            expect(response.body.metrics.successRate).toBe(0);
        });
    });
});
