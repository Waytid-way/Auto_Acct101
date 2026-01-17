import { z } from 'zod';

/**
 * Export Path Strategy Enum
 * Defines how an approved entry should be exported to Express
 */
export const ExportPathSchema = z.enum(['manual', 'immediate', 'scheduled'], {
    errorMap: () => ({
        message: 'exportPath must be one of: manual, immediate, scheduled'
    })
});

/**
 * Teable Record Fields Schema
 * Validates the fields object from Teable webhook payload
 */
export const TeableRecordFieldsSchema = z.object({
    status: z.string().min(1, 'Status is required'),
    exportPath: ExportPathSchema,
    entryId: z.string().min(1, 'Entry ID is required'),
});

/**
 * Full Teable Webhook Payload Schema
 * Validates the entire webhook request body
 */
export const TeableWebhookSchema = z.object({
    event: z.enum(['record.created', 'record.updated'], {
        errorMap: () => ({
            message: 'Event must be record.created or record.updated'
        })
    }),
    data: z.object({
        recordId: z.string().min(1, 'Record ID is required'),
        tableId: z.string().min(1, 'Table ID is required'),
        fields: TeableRecordFieldsSchema,
    }),
});

/**
 * TypeScript Types inferred from Zod schemas
 */
export type TeableWebhookPayload = z.infer<typeof TeableWebhookSchema>;
export type TeableRecordFields = z.infer<typeof TeableRecordFieldsSchema>;
export type ExportPathValue = z.infer<typeof ExportPathSchema>;
