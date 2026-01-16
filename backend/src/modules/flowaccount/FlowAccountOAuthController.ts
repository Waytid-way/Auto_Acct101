import { Request, Response, NextFunction } from 'express';
import { FlowAccountOAuthService } from './FlowAccountOAuthService';
import { randomUUID } from 'crypto';
import logger from '@loaders/logger';

const oauthService = new FlowAccountOAuthService();

// Temporary state storage (in production, use Redis)
const pendingStates = new Map<string, { clientId: string; timestamp: number }>();

export class FlowAccountOAuthController {
    /**
     * Step 1: Initiate OAuth flow
     * GET /api/flowaccount/authorize?clientId=xxx
     */
    async authorize(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { clientId } = req.query;

            if (!clientId || typeof clientId !== 'string') {
                res.status(400).json({
                    error: 'BadRequest',
                    message: 'clientId query parameter required',
                });
                return;
            }

            // Generate CSRF state token
            const state = randomUUID();
            pendingStates.set(state, {
                clientId,
                timestamp: Date.now(),
            });

            // Clean up expired states (older than 10 minutes)
            this.cleanupExpiredStates();

            const authURL = oauthService.getAuthorizationURL(state);

            logger.info('OAuth flow initiated', { clientId, state });

            res.redirect(authURL);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Step 2: Handle OAuth callback
     * GET /api/flowaccount/callback?code=xxx&state=xxx
     */
    async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { code, state } = req.query;

            if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
                res.status(400).json({
                    error: 'BadRequest',
                    message: 'code and state parameters required',
                });
                return;
            }

            // Verify state (CSRF protection)
            const pending = pendingStates.get(state);
            if (!pending) {
                res.status(400).json({
                    error: 'InvalidState',
                    message: 'Invalid or expired state parameter',
                });
                return;
            }

            pendingStates.delete(state);

            const { clientId } = pending;

            // Exchange code for token
            const token = await oauthService.exchangeCodeForToken(code, clientId);

            logger.info('OAuth flow completed', {
                clientId,
                companyId: token.flowAccountCompanyId,
            });

            res.status(200).json({
                success: true,
                message: 'FlowAccount connected successfully',
                data: {
                    clientId,
                    companyName: token.metadata?.companyName,
                    expiresAt: token.expiresAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    private cleanupExpiredStates(): void {
        const now = Date.now();
        for (const [state, data] of pendingStates.entries()) {
            if (now - data.timestamp > 10 * 60 * 1000) {
                pendingStates.delete(state);
            }
        }
    }
}
