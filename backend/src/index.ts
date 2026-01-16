import config from '@config/env';
import logger from '@loaders/logger';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import { createExpressApp } from '@loaders/express';

async function startServer() {
    try {
        // 1. Connect to Database
        await connectMongoDB();

        // 2. Initialize Express App
        const app = createExpressApp();

        // 3. Start Server
        const server = app.listen(config.PORT, () => {
            logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
            logger.info(`Health check: http://localhost:${config.PORT}/api/health`);
        });

        // Graceful Shutdown
        const shutdown = async () => {
            logger.info('SIGTERM/SIGINT received. Shutting down...');

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
