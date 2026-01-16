import axios, { AxiosInstance } from 'axios';
import config from '@config/env';
import logger from '@loaders/logger';

export interface TeableRecordDTO {
    fields: {
        clientId: string;
        journalEntryId: string;
        date: string;
        vendor: string;
        amount: number; // Display as THB (divided by 100)
        category: string;
        status: string;
        vatAmount?: number;
        confidenceScore?: number;
        warnings?: string[];
        attachmentUrl?: string;
    };
}

export class TeableClient {
    private client: AxiosInstance;

    constructor() {
        // Ensure URL is present or throw (validated by env.ts, safe to assume string if optional handled)
        if (!config.TEABLE_API_URL || !config.TEABLE_API_TOKEN) {
            // Warn but allow construction, methods will fail if called
            logger.warn('Teable configuration missing. TeableClient will not function.');
        }

        this.client = axios.create({
            baseURL: config.TEABLE_API_URL,
            headers: {
                Authorization: `Bearer ${config.TEABLE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }

    /**
     * Create a record in Teable
     */
    async createRecord(tableId: string, record: TeableRecordDTO): Promise<string> {
        try {
            const response = await this.client.post(`/table/${tableId}/record`, {
                records: [record],
            });

            // Teable returns { records: [ { id: ... } ] }
            const recordId = response.data.records[0].id;

            logger.info('Teable record created', {
                tableId,
                recordId,
                journalEntryId: record.fields.journalEntryId,
            });

            return recordId;
        } catch (error) {
            logger.error('Failed to create Teable record', { error, record });
            throw error;
        }
    }

    /**
     * Bulk create records (for batch sync)
     */
    async bulkCreateRecords(
        tableId: string,
        records: TeableRecordDTO[]
    ): Promise<string[]> {
        try {
            const response = await this.client.post(`/table/${tableId}/record`, {
                records,
            });

            const recordIds = response.data.records.map((r: any) => r.id);

            logger.info('Teable bulk records created', {
                tableId,
                count: recordIds.length,
            });

            return recordIds;
        } catch (error) {
            logger.error('Failed to bulk create Teable records', { error });
            throw error;
        }
    }

    /**
     * Update record status (after approval)
     */
    async updateRecordStatus(
        tableId: string,
        recordId: string,
        status: string
    ): Promise<void> {
        await this.client.patch(`/table/${tableId}/record/${recordId}`, {
            fields: { status },
        });

        logger.info('Teable record status updated', {
            tableId,
            recordId,
            status,
        });
    }
}
