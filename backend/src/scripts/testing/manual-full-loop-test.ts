import { TeableClient } from "../../modules/teable/TeableClient";
import { TeablePollingJob } from "../../jobs/TeablePollingJob";
import { DailyExportJob } from "../../jobs/DailyExportJob";
import { GoogleDriveService } from "../../modules/files/GoogleDriveService";
import { JournalEntryModel } from "../../modules/accounting/models/JournalEntry.model";
import { ExportQueueModel } from "../../modules/export/models/ExportQueue";
import mongoose from 'mongoose';
import config from "../../config/env";

async function runTest() {
    console.log('๐€ Starting Full Loop Test...');

    // 1. Connect DB
    await mongoose.connect(config.MONGODB_URI!);
    console.log('โ… Connected to MongoDB');

    // 2. Setup Services
    const teable = new TeableClient();
    const pollingJob = new TeablePollingJob();
    const driveService = new GoogleDriveService();
    const exportJob = new DailyExportJob(driveService);

    const testId = `TEST-${Date.now()}`;
    let teableRecordId: string | null = null;

    try {
        // 3. Create Test Record in Teable
        console.log('\n1๏ธโฃ Creating Test Record in Teable...');
        teableRecordId = await teable.createRecord(config.TEABLE_TABLE_ID!, {
            fields: {
                'Date': new Date().toISOString().split('T')[0],
                'Description': `Full Loop Test ${testId}`,
                'Amount': 1500.50, // Should become 150050 satang
                'Type': 'Debit',
                'Account Code': '5110', // Electricity
                'Category': 'Expense',
                'Status': 'Approved', // Ready for pickup
                'Export Path': 'Scheduled'
            }
        });
        console.log(`โ… Created Teable Record: ${teableRecordId}`);

        // 4. Run Polling Job (Ingestion)
        console.log('\n2๏ธโฃ Running Polling Job (Ingestion)...');
        await pollingJob.execute();

        // 5. Verify Mongo Ingestion
        console.log('\n3๏ธโฃ Verifying Ingestion...');
        const entry = await JournalEntryModel.findOne({ 'metadata.teableRecordId': teableRecordId });

        if (!entry) throw new Error('โ Entry not found in MongoDB!');
        console.log(`โ… Found MongoDB Entry: ${entry._id}`);
        console.log(`   - Amount: ${entry.amount} (Expected: 150050)`);
        console.log(`   - Status: ${entry.status}`);

        if (entry.amount !== 150050) throw new Error(`โ Amount mismatch! Got ${entry.amount}`);

        // 6. Verify Queue
        const queue = await ExportQueueModel.findOne({ entryId: entry._id });
        if (!queue) throw new Error('โ Export Queue not found!');
        console.log(`โ… Found Export Queue: ${queue._id} (Status: ${queue.status})`);

        // 7. Run Export Job
        console.log('\n4๏ธโฃ Running Export Job...');
        const result = await exportJob.executeDaily(true); // Force execute

        console.log('\n5๏ธโฃ Export Result:');
        console.log(`   - Processed: ${result.processed}`);
        console.log(`   - File ID: ${result.fileId}`);

        if (result.processed === 0) throw new Error('โ Export processed 0 records!');

        console.log('\n๐ FULL LOOP TEST PASSED!');

    } catch (error) {
        console.error('\nโ TEST FAILED:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTest();
