import { describe, it, expect, beforeAll, afterAll, mock, spyOn } from 'bun:test';
import mongoose from 'mongoose';
import { ExportQueueModel } from '@modules/export/models/ExportQueue.ts';
import { ExportLogModel } from '@modules/export/models/ExportLog.ts';
import { ExportPath, ExportStatus, ExportAction } from '@modules/export/types';
import { GoogleDriveService } from '@modules/files/GoogleDriveService';

// Mock googleapis
mock.module('googleapis', () => {
    return {
        google: {
            auth: {
                GoogleAuth: class MockAuth { constructor() { } }
            },
            drive: () => ({
                files: {
                    create: async () => ({
                        data: { id: 'mock_file_id', webViewLink: 'http://mock.drive.link/123' }
                    }),
                    get: async () => ({
                        data: { webViewLink: 'http://mock.drive.link/123' }
                    })
                },
                permissions: {
                    create: async () => ({})
                }
            })
        }
    };
});

describe('Export Models & Services', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_export_db');
        }
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    describe('ExportQueue Model', () => {
        it('should enforce required fields and defaults', async () => {
            const validQueue = new ExportQueueModel({
                entryId: new mongoose.Types.ObjectId(),
                exportPath: ExportPath.IMMEDIATE
            });
            const saved = await validQueue.save();

            expect(saved.status).toBe(ExportStatus.QUEUED);
            expect(saved.attempts).toBe(0);
        });

        it('should require scheduledFor if path is scheduled', async () => {
            const invalidQueue = new ExportQueueModel({
                entryId: new mongoose.Types.ObjectId(),
                exportPath: ExportPath.SCHEDULED
                // missing scheduledFor
            });

            // Should fail validation
            let err;
            try { await invalidQueue.save(); } catch (e) { err = e; }
            expect(err).toBeDefined();
        });

        it('should allow valid scheduled export', async () => {
            const validQueue = new ExportQueueModel({
                entryId: new mongoose.Types.ObjectId(),
                exportPath: ExportPath.SCHEDULED,
                scheduledFor: new Date()
            });
            await expect(validQueue.save()).resolves.toBeDefined();
        });

        it('should markAsFailed and increment attempts', async () => {
            const queue = await ExportQueueModel.create({
                entryId: new mongoose.Types.ObjectId(),
                exportPath: ExportPath.MANUAL
            });

            await queue.markAsFailed('Simulated failure');
            expect(queue.status).toBe(ExportStatus.FAILED);
            expect(queue.attempts).toBe(1);
            expect(queue.lastError).toBe('Simulated failure');

            // Retry check
            expect(queue.canRetry()).toBe(true);
        });

        it('should cap attempts at 3', async () => {
            const queue = await ExportQueueModel.create({
                entryId: new mongoose.Types.ObjectId(),
                exportPath: ExportPath.MANUAL
            });

            await queue.markAsFailed('Fail 1');
            await queue.markAsFailed('Fail 2');
            await queue.markAsFailed('Fail 3');
            expect(queue.attempts).toBe(3);

            // 4th failure
            await queue.markAsFailed('Fail 4');
            const reloaded = await ExportQueueModel.findById(queue._id);
            expect(reloaded?.attempts).toBe(3); // capped logic in method
            expect(reloaded?.canRetry()).toBe(false);
        });

        it('should prevent duplicate entryId', async () => {
            const entryId = new mongoose.Types.ObjectId();
            await ExportQueueModel.create({ entryId, exportPath: ExportPath.MANUAL });

            // Try duplicate
            const duplicate = new ExportQueueModel({ entryId, exportPath: ExportPath.IMMEDIATE });
            try {
                await duplicate.save();
            } catch (error: any) {
                expect(error.code).toBe(11000); // MongoDB duplicate key
            }
        });
    });

    describe('ExportLog Model (Immutability)', () => {
        it('should create log via static method', async () => {
            const queueId = new mongoose.Types.ObjectId();
            await ExportLogModel.log(queueId.toString(), ExportAction.QUEUED, 'Test log');

            const logs = await ExportLogModel.find({ queueId });
            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe(ExportAction.QUEUED);
        });

        it('should NOT allow updates', async () => {
            const log = await ExportLogModel.create({
                queueId: new mongoose.Types.ObjectId(),
                action: ExportAction.EXPORT_STARTED,
                message: 'Start'
            });

            log.message = 'Hacked';
            try {
                await log.save();
                throw new Error('Should have failed');
            } catch (error: any) {
                expect(error.message).toContain('immutable');
            }
        });
    });

    describe('GoogleDriveService (Mock)', () => {
        it('should upload file and return mock link', async () => {
            const service = new GoogleDriveService();
            const buffer = Buffer.from('test csv content');
            const link = await service.uploadFile('test.csv', buffer);

            expect(link).toBe('http://mock.drive.link/123');
        });
    });
});
