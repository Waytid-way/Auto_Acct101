import mongoose from 'mongoose';
import { DailyExportJob } from '../../jobs/DailyExportJob';
import { GoogleDriveService } from '../../modules/files/GoogleDriveService';
import { ExportQueueModel } from '../../modules/export/models/ExportQueue';
import '../../modules/accounting/models/JournalEntry.model'; // Register JournalEntry model
import config from '../../config/env';

// Use console logger for E2E script
const logger = console;

// @ts-ignore
global.logger = logger;

async function run() {
    console.log('๐€ Starting Manual Trigger Script...');

    // Connect to MongoDB
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(config.MONGODB_URI);
    console.log('โ… Connected to MongoDB');

    // Initialize Services
    const googleDriveService = new GoogleDriveService();

    // Note: DailyExportJob constructor signature changed to (GoogleDriveService)
    const job = new DailyExportJob(
        googleDriveService
    );

    // Force execution
    console.log('๐” Executing DailyExportJob.executeDaily()...');
    try {
        await job.executeDaily(true);
        console.log('โ… Job execution finished successfully');
    } catch (error) {
        console.error('โ Job execution failed:', error);
    }

    // Cleanup
    await mongoose.disconnect();
    console.log('๐‘ Disconnected and exiting');
    process.exit(0);
}

run();
