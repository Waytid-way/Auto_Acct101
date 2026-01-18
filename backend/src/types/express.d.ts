import 'express-serve-static-core';

declare module 'express-serve-static-core' {
    export interface Request {
        id?: string;
        rateLimit?: {
            limit: number;
            current: number;
            remaining: number;
            resetTime?: Date;
        };
    }
}
