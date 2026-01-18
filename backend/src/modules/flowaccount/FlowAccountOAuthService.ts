import axios from 'axios';
import config from '@config/env';
import { FlowAccountToken, IFlowAccountToken } from './models/FlowAccountToken.model';
import { EncryptionService } from '@modules/files/EncryptionService';
import logger from '@loaders/logger';

export class FlowAccountOAuthService {
    private baseURL = 'https://openapi.flowaccount.com';
    // Use a singleton of EncryptionService to avoid key regen (though it uses fixed config key)
    private encryption = new EncryptionService();

    /**
     * Step 1: Generate authorization URL
     * User will be redirected to FlowAccount to grant access
     */
    getAuthorizationURL(state: string): string {
        const params = new URLSearchParams({
            client_id: config.FLOWACCOUNT_CLIENT_ID || '',
            redirect_uri: config.FLOWACCOUNT_REDIRECT_URI || '',
            response_type: 'code',
            scope: 'flowaccount-api',
            state, // CSRF protection
        });

        return `${this.baseURL}/oauth/authorize?${params.toString()}`;
    }

    /**
     * Step 2: Exchange authorization code for access token
     * Called from callback endpoint after user approves
     */
    async exchangeCodeForToken(
        code: string,
        clientId: string
    ): Promise<IFlowAccountToken> {
        try {
            const response = await axios.post(
                `${this.baseURL}/oauth/token`,
                {
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: config.FLOWACCOUNT_REDIRECT_URI,
                    client_id: config.FLOWACCOUNT_CLIENT_ID,
                    client_secret: config.FLOWACCOUNT_CLIENT_SECRET,
                },
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            const { access_token, refresh_token, expires_in, scope } = response.data;

            // Get company info to link token to client
            const companyInfo = await this.getCompanyInfo(access_token);

            // Encrypt tokens before storage
            const encryptedAccess = this.encryption.encrypt(access_token);
            const encryptedRefresh = this.encryption.encrypt(refresh_token);

            const expiresAt = new Date(Date.now() + expires_in * 1000);

            // Store in database
            const token = await FlowAccountToken.findOneAndUpdate(
                { clientId },
                {
                    accessToken: encryptedAccess,
                    refreshToken: encryptedRefresh,
                    expiresAt,
                    scope,
                    flowAccountCompanyId: companyInfo.id,
                    isActive: true,
                    metadata: {
                        companyName: companyInfo.name,
                        taxId: companyInfo.taxId,
                    },
                },
                { upsert: true, new: true }
            );

            logger.info('FlowAccount token stored', {
                clientId,
                companyId: companyInfo.id,
                expiresAt,
            });

            return token;
        } catch (error) {
            logger.error('Failed to exchange OAuth code', { error, clientId });
            throw new Error('OAuth token exchange failed');
        }
    }

    /**
     * Step 3: Refresh expired access token
     */
    async refreshToken(clientId: string): Promise<string> {
        const tokenDoc = await FlowAccountToken.findOne({ clientId });

        if (!tokenDoc) {
            throw new Error(`No token found for client: ${clientId}`);
        }

        const decryptedRefresh = this.encryption.decrypt(tokenDoc.refreshToken);

        try {
            const response = await axios.post(
                `${this.baseURL}/oauth/token`,
                {
                    grant_type: 'refresh_token',
                    refresh_token: decryptedRefresh,
                    client_id: config.FLOWACCOUNT_CLIENT_ID,
                    client_secret: config.FLOWACCOUNT_CLIENT_SECRET,
                }
            );

            const { access_token, expires_in } = response.data;

            const encryptedAccess = this.encryption.encrypt(access_token);
            const expiresAt = new Date(Date.now() + expires_in * 1000);

            tokenDoc.accessToken = encryptedAccess;
            tokenDoc.expiresAt = expiresAt;
            await tokenDoc.save();

            logger.info('FlowAccount token refreshed', { clientId, expiresAt });

            return access_token;
        } catch (error) {
            logger.error('Token refresh failed', { error, clientId });
            tokenDoc.isActive = false;
            await tokenDoc.save();
            throw new Error('Token refresh failed - re-authorization required');
        }
    }

    /**
     * Get valid access token (refresh if expired)
     */
    async getValidAccessToken(clientId: string): Promise<string> {
        const tokenDoc = await FlowAccountToken.findOne({ clientId, isActive: true });

        if (!tokenDoc) {
            throw new Error(`No active token for client: ${clientId}`);
        }

        // Check if token expires in next 5 minutes
        const expiresIn = tokenDoc.expiresAt.getTime() - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
            return this.refreshToken(clientId);
        }

        return this.encryption.decrypt(tokenDoc.accessToken);
    }

    /**
     * Helper: Get company info from FlowAccount
     */
    private async getCompanyInfo(accessToken: string): Promise<any> {
        const response = await axios.get(`${this.baseURL}/v1/company/info`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        return response.data;
    }
}
