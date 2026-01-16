import express, { Application } from 'express';
import { randomUUID } from 'crypto';
import healthRouter from '@modules/health/routes';
import accountingRouter from '@modules/accounting/routes';
import flowAccountRouter from '@modules/flowaccount/routes';
import teableRouter from '@modules/teable/routes';
import filesRouter from '@modules/files/routes';
import exportRouter from '@modules/export/routes';
import errorHandler from '@middlewares/errorHandler';
import requestId from '@middlewares/requestId';
import logger from './logger';

export function createExpressApp(): Application {
    const app = express();

    // Middleware stack
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request ID middleware
    app.use(requestId);

    // Request logging
    app.use((req, res, next) => {
        logger.info('Incoming request', {
            requestId: req.id,
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        next();
    });

    // Routes
    app.use('/api/health', healthRouter);
    app.use('/api/accounting', accountingRouter);
    app.use('/api/flowaccount', flowAccountRouter);
    app.use('/api/files', filesRouter);
    app.use('/api/export', exportRouter);
    app.use('/webhooks/teable', teableRouter);

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.path} not found`,
            requestId: req.id,
        });
    });

    // Global error handler (MUST be last)
    app.use(errorHandler);

    return app;
}
