import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
    async check(req: Request, res: Response): Promise<void> {
        const uptime = process.uptime();
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            mongodb: mongoStatus,
            version: '1.0.0',
        });
    }
}
