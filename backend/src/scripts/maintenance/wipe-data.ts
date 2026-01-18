
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';
import { JournalEntryModel } from '../../modules/accounting/models/JournalEntry.model';
import { ExportQueueModel } from '../../modules/export/models/ExportQueue';
import { ExportLogModel } from '../../modules/export/models/ExportLog';

async function wipeData() {
    console.log('๐งน Wiping MongoDB Data (JournalEntry, ExportQueue, ExportLog)...');

    await connectMongoDB();

    try {
        const deletedEntries = await JournalEntryModel.deleteMany({});
        console.log(`โ… Deleted ${deletedEntries.deletedCount} Journal Entries`);

        const deletedQueues = await ExportQueueModel.deleteMany({});
        console.log(`โ… Deleted ${deletedQueues.deletedCount} Export Queues`);

        const deletedLogs = await ExportLogModel.deleteMany({});
        console.log(`โ… Deleted ${deletedLogs.deletedCount} Export Logs`);

        console.log('โจ Database clean! Ready for re-ingestion.');
    } catch (error) {
        console.error('โ Wipe failed:', error);
    } finally {
        await disconnectMongoDB();
    }
}

wipeData();
