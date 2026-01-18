
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';
import { TeablePollingJob } from '../../jobs/TeablePollingJob';
import logger from '../../loaders/logger';

async function forcePoll() {
    console.log('๐” Forcing Teable Polling Job...');

    await connectMongoDB();

    const job = new TeablePollingJob();
    try {
        await job.execute();
        console.log('โ… Polling finished.');
    } catch (error: any) {
        console.error('โ Polling failed:', error);
    } finally {
        await disconnectMongoDB();
    }
}

forcePoll();
