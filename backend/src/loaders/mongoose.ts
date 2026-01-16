import mongoose from 'mongoose';
import config from '@config/env';
import logger from './logger';

export async function connectMongoDB(): Promise<void> {
    try {
        mongoose.set('strictQuery', true);

        await mongoose.connect(config.MONGODB_URI, {
            // Bun compatibility: use native fetch
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
        });

        // Verify replica set (required for transactions)
        const admin = mongoose.connection.db!.admin();
        const status = await admin.replSetGetStatus();

        if (!status.ok) {
            throw new Error('MongoDB replica set not initialized');
        }

        logger.info('✅ MongoDB connected (replica set enabled)', {
            host: mongoose.connection.host,
            dbName: mongoose.connection.name,
        });
    } catch (error: any) {
        logger.error('❌ MongoDB connection failed', { error });
        // In dev mode without replica set, it might fail the check but still be connected.
        // However, for this project, transactions are CRITICAL, so we must enforce it.
        throw error;
    }
}

export async function disconnectMongoDB(): Promise<void> {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
}
