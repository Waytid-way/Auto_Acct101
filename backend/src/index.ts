import config from '@config/env';
import logger from '@loaders/logger';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import { createExpressApp } from '@loaders/express';
import { initializeJobs, shutdownJobs } from '@loaders/jobs';
import discordLoader from '@loaders/discord'; // Phase 7
import { configService } from './modules/config/services/ConfigService'; // [NEW]

async function startServer() {
    try {
        // 1. Connect to Database
        await connectMongoDB();
        logger.info('✌️ DB loaded and connected!');

        // 2. Initialize Config System (Defaults) [NEW]
        await configService.initialize();

        // 3. Initialize Express App
        const app = createExpressApp();
        logger.info('✌️ Express loaded');

        // 3. Initialize scheduled jobs (Cron Jobs)
        initializeJobs(); // Renamed from cronLoader in the example, keeping original function name
        logger.info('✌️ Cron jobs loaded');

        // 4. Discord Bot (Phase 7: Resilient Sidecar)
        if (config.DISCORD_BOT_TOKEN) {
            try {
                await discordLoader();
                logger.info('✌️ Discord Bot loaded');
            } catch (error) {
                logger.warn('⚠️ Discord Bot failed to load. Continuing without it.', error);
            }
        } else {
            logger.info('ℹ️ Discord Bot skipped (No Token provided)');
        }

        // 5. Start Server
        const server = app.listen(config.PORT, () => {
            logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
            logger.info(`Health check: http://localhost:${config.PORT}/api/health`);
        });

        // Graceful Shutdown
        const shutdown = async () => {
            logger.info('SIGTERM/SIGINT received. Shutting down...');

            // Stop scheduled jobs first
            shutdownJobs();

            server.close(() => {
                logger.info('HTTP server closed');
            });

            await disconnectMongoDB();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

startServer();
