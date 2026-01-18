import mongoose from 'mongoose';
import config from '../../config/env';
import { ExportQueueModel } from '../../modules/export/models/ExportQueue';

async function checkQueue() {
    console.log('๐” Checking Export Queue...');

    // Connect DB
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(config.MONGODB_URI);
    }

    const queued = await ExportQueueModel.find({ status: 'queued' });
    const processing = await ExportQueueModel.find({ status: 'processing' });
    const completed = await ExportQueueModel.find({ status: 'completed' }).limit(5).sort({ updatedAt: -1 });

    console.log(`\n๐“ QUEUE STATUS:`);
    console.log(`-----------------------------------`);
    console.log(`โณ Pending (Queued):  ${queued.length}`);
    queued.forEach(q => {
        console.log(`   - ID: ${q._id} | Path: ${q.exportPath} | Scheduled: ${q.scheduledFor}`);
    });

    console.log(`\nโ–ถ๏ธ  Processing:       ${processing.length}`);

    console.log(`\nโ… Completed (Last 5):`);
    completed.forEach(q => {
        console.log(`   - ID: ${q._id} | Path: ${q.exportPath} | At: ${q.updatedAt}`);
    });

    console.log(`-----------------------------------`);
    process.exit(0);
}

checkQueue();
