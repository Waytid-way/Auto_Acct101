import axios, { AxiosInstance } from 'axios';
import { FlowAccountOAuthService } from './FlowAccountOAuthService';
import { FlowAccountDocumentSchema, FlowAccountDocumentDTO } from './dtos/FlowAccountDocument.dto';
import logger from '@loaders/logger';
import { z } from 'zod';

export class FlowAccountClient {
    private client: AxiosInstance;
    private oauthService = new FlowAccountOAuthService();

    constructor() {
        this.client = axios.create({
            baseURL: 'https://openapi.flowaccount.com/v1',
            timeout: 30000,
        });
    }

    /**
     * Fetch documents from FlowAccount for a date range
     */
    async getDocuments(
        clientId: string,
        startDate: Date,
        endDate: Date
    ): Promise<FlowAccountDocumentDTO[]> {
        try {
            const accessToken = await this.oauthService.getValidAccessToken(clientId);

            const response = await this.client.get('/documents', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
                    endDate: endDate.toISOString().split('T')[0],
                },
            });

            // Validate response with Zod
            // Note: Adjusting parsing if the API wraps data in specific ways (e.g. data.items)
            // Assuming response.data.data is the array of documents based on common patterns
            // If the API returns directly, change to response.data
            const rawData = response.data.data || response.data;

            const documents = z.array(FlowAccountDocumentSchema).parse(rawData);

            logger.info('FlowAccount documents fetched', {
                clientId,
                count: documents.length,
                startDate,
                endDate,
            });

            return documents;
        } catch (error) {
            logger.error('Failed to fetch FlowAccount documents', {
                error,
                clientId,
            });
            throw error;
        }
    }

    /**
     * Get a single document by ID
     */
    async getDocumentById(
        clientId: string,
        documentId: string
    ): Promise<FlowAccountDocumentDTO> {
        const accessToken = await this.oauthService.getValidAccessToken(clientId);

        const response = await this.client.get(`/documents/${documentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        return FlowAccountDocumentSchema.parse(response.data);
    }
}
