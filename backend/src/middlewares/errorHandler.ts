import { Request, Response, NextFunction } from 'express';
import logger, { sendDiscordAlert } from '@loaders/logger';

export default function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const statusCode = (err as any).statusCode || 500;

    logger.error('Error caught by global handler', {
        requestId: req.id,
        error: err.message,
        stack: err.stack,
        path: req.path,
    });

    // Alert on 5xx errors
    if (statusCode >= 500) {
        sendDiscordAlert(`5xx Error on ${req.method} ${req.path}`, {
            error: err.message,
            requestId: req.id,
        }).catch(() => {
            // Fail silently to not block response
        });
    }

    res.status(statusCode).json({
        error: err.name || 'InternalServerError',
        message: statusCode >= 500 ? 'An unexpected error occurred' : err.message,
        requestId: req.id,
        timestamp: new Date().toISOString(),
    });
}
