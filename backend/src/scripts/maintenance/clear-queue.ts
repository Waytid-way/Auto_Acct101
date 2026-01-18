import { ExportQueueModel } from '../../modules/export/models/ExportQueue';
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';

async function clearQueue() {
    console.log('๐—‘๏ธ Clearing Export Queue...');
    await connectMongoDB();

    const result = await ExportQueueModel.deleteMany({ status: 'queued' });
    console.log(`โ… Removed ${result.deletedCount} items from the Export Queue.`);

    await disconnectMongoDB();
}

clearQueue();
