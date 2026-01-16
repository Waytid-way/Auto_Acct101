declare global {
    namespace Express {
        interface Request {
            id: string; // Request ID from middleware
            user?: {
                id: string;
                role: 'admin' | 'accountant' | 'reviewer';
            };
        }
    }
}

export { };
