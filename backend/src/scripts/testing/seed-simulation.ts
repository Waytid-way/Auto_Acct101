import mongoose from 'mongoose';
import config from '../../config/env';
import fs from 'fs';
import path from 'path';
import { JournalEntryModel } from '../../modules/accounting/models/JournalEntry.model';
import { ExportQueueModel } from '../../modules/export/models/ExportQueue';
import { ExportLogModel } from '../../modules/export/models/ExportLog';

// Connect to MongoDB
async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(config.MONGODB_URI);
        console.log('โ… Connected to MongoDB');
    }
}

async function seed() {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('๐ฑ Starting Seed Process...');

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

        // 1. Clean existing data for today
        await ExportQueueModel.deleteMany({
            scheduledFor: { $gte: startOfDay, $lte: endOfDay }
        }).session(session);

        await ExportLogModel.deleteMany({
            'metadata.batchDate': today
        }).session(session);

        // Note: We don't delete JournalEntries usually, but for simulation we might want to avoid duplicates if re-running?
        // Let's assume we allow duplicates in JournalEntry but Queue is cleaned.
        // Actually, to keep it clean, let's delete JournalEntries with specific reference prefix or just "today's simulation"
        // But the synthetic data has specific references. Let's delete by reference.

        const dataPath = path.join(__dirname, '../data/synthetic_batch_001.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const syntheticEntries = JSON.parse(rawData);

        const references = syntheticEntries.map((e: any) => e.referenceNo);
        await JournalEntryModel.deleteMany({ referenceNo: { $in: references } }).session(session);

        console.log('๐งน Cleaned existing simulation data for today');

        // 2. Prepare Entries
        const journalEntries = syntheticEntries.map((entry: any) => ({
            clientId: 'SIM_CLIENT_001',
            date: new Date(),
            description: entry.description,
            accountCode: entry.accountCode,
            amount: entry.amount,
            type: entry.type,
            category: entry.category,
            source: 'Measurement_Synthetic_001',
            createdBy: 'system',
            status: 'approved',
            metadata: {
                referenceNo: entry.referenceNo,
                accountName: entry.accountName
            }
        }));

        // 3. Insert Journal Entries
        const createdEntries = await JournalEntryModel.insertMany(journalEntries, { session });
        console.log(`โ… Seeded ${createdEntries.length} Journal Entries`);

        // 4. Create Export Queue
        const queueItems = createdEntries.map(entry => ({
            entryId: entry._id,
            status: 'queued',
            scheduledFor: new Date(), // Ready immediately
            exportPath: 'scheduled'
        }));

        await ExportQueueModel.insertMany(queueItems, { session });
        console.log(`โ… Queued ${queueItems.length} items for export`);

        await session.commitTransaction();
        console.log('โจ Seeding Check: COMPLETE');

    } catch (error) {
        await session.abortTransaction();
        console.error('โ Seeding Failed:', error);
        process.exit(1);
    } finally {
        session.endSession();
        await mongoose.disconnect();
    }
}

seed();
