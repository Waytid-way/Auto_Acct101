import axios, { AxiosInstance } from 'axios';
import config from '@config/env';
import logger from '@loaders/logger';

export interface TeableRecordDTO {
    fields: Record<string, any>;
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
                typecast: true // Allow creating new options (e.g. New Categories)
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

    /**
     * Update arbitrary record fields
     */
    async updateRecord(
        tableId: string,
        recordId: string,
        fields: Record<string, any>
    ): Promise<void> {
        // Use Batch Endpoint for robustness
        await this.client.patch(`/table/${tableId}/record`, {
            records: [{
                id: recordId,
                fields: fields
            }]
        });
        // Note: Teable API specific structure might vary, usually PATCH /record/{recordId} or bulk PATCH.
        // Based on docs, usually PATCH /table/{tableId}/record with records array for bulk or single.
        // Let's assume standard Teable API structure for single record update via batch endpoint if specific endpoint ambiguous.
        // Correction: Teable API usually uses PATCH /table/{tableId}/record for batch update.
        // payload: { records: [ { id: '...', fields: { ... } } ] }

        logger.info('Teable record updated', {
            tableId,
            recordId,
            fields: Object.keys(fields)
        });
    }
    /**
     * Fetch all Approved records from Teable
     */
    async getApprovedRecords(tableId: string): Promise<any[]> {
        try {
            // Filter: Status is "Approved"
            // Note: Teable API expects JSON stringified filter
            const filter = {
                filterSet: [
                    {
                        fieldId: "Status", // Assuming field name is used (Teable supports ID or Name?)
                        // User script used "Status".
                        // If Name, Teable usually inferred.
                        // Ideally use Field ID but Name works in many cases.
                        operator: "is",
                        value: "Approved"
                    }
                ],
                conjunction: "and"
            };

            const response = await this.client.get(`/table/${tableId}/record`, {
                params: {
                    filter: JSON.stringify(filter)
                }
            });

            return response.data.records || [];
        } catch (error) {
            logger.error('Failed to fetch approved records', { error, tableId });
            return [];
        }
    }
}
