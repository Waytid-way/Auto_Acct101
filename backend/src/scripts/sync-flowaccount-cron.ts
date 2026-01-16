import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import { FlowAccountSyncService } from '@modules/flowaccount/FlowAccountSyncService';
import logger from '@loaders/logger';
import { sendDiscordAlert } from '@loaders/logger';

async function runNightlySync(): Promise<void> {
    try {
        await connectMongoDB();

        logger.info('🌙 Starting nightly FlowAccount sync');

        const syncService = new FlowAccountSyncService();
        const today = new Date();

        await syncService.syncAllClients(today);

        logger.info('✅ Nightly FlowAccount sync completed successfully');

        await sendDiscordAlert(
            '✅ Nightly FlowAccount sync completed',
            { date: today.toISOString().split('T')[0], status: 'success' }
        );
    } catch (error) {
        logger.error('❌ Nightly sync failed', { error });

        await sendDiscordAlert(
            '🚨 Nightly FlowAccount sync FAILED',
            { error: (error as Error).message }
        );

        process.exit(1);
    } finally {
        await disconnectMongoDB();
        process.exit(0);
    }
}

// Check if running directly
if (import.meta.main) {
    runNightlySync();
}
