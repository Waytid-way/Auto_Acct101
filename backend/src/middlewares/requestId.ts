import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export default function requestId(req: Request, res: Response, next: NextFunction): void {
    req.id = randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
}
