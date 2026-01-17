/**
 * Batch Upload Integration Test
 * P0 Fix #5: Verify batch processing capabilities
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createExpressApp } from '../../src/loaders/express';
import { connectMongoDB, disconnectMongoDB } from '../../src/loaders/mongoose';
import { ReceiptModel } from '../../src/models/Receipt';
import type { Application } from 'express';
import request from 'supertest';

describe('Batch Upload Tests', () => {
    let app: Application;

    beforeAll(async () => {
        await connectMongoDB();
        app = createExpressApp();
    });

    afterAll(async () => {
        await disconnectMongoDB();
    });

    it('should process multiple receipts in a single batch', async () => {
        // Create dummy image buffers
        const image1 = Buffer.from('fake-image-1');
        const image2 = Buffer.from('fake-image-2');

        const response = await request(app)
            .post('/api/ocr/process-batch')
            .attach('images', image1, 'receipt1.jpg')
            .attach('images', image2, 'receipt2.jpg')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.summary.total).toBe(2);
        // We expect results array to be present
        expect(Array.isArray(response.body.results)).toBe(true);
        expect(response.body.results).toHaveLength(2);

        // Results should contain filenames
        const filenames = response.body.results.map((r: any) => r.filename);
        expect(filenames).toContain('receipt1.jpg');
        expect(filenames).toContain('receipt2.jpg');
    });

    it('should reject batch larger than limit', async () => {
        const req = request(app).post('/api/ocr/process-batch');

        // Attach 11 files (limit is 10)
        // Creating small buffers to avoid memory issues
        for (let i = 0; i < 11; i++) {
            req.attach('images', Buffer.from(`img${i}`), `file${i}.jpg`);
        }

        const response = await req;
        // Multer throws error before controller, might be 500 depending on error handler
        expect(response.status).not.toBe(200);
    });
});
