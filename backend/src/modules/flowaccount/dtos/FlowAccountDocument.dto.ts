import { z } from 'zod';

export const FlowAccountDocumentSchema = z.object({
    recordId: z.string(),
    documentType: z.enum(['income', 'expense', 'revenue', 'purchase_order']),
    documentDate: z.string().datetime(),
    contactName: z.string(),
    grandTotal: z.number(),
    grandTotalWithTax: z.number(),
    taxAmount: z.number(),
    remarks: z.string().optional().nullable(), // Nullable in case API returns null
    referenceDocument: z.string().optional().nullable(),
    items: z.array(
        z.object({
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            total: z.number(),
        })
    ),
    attachments: z.array(
        z.object({
            fileName: z.string(),
            fileUrl: z.string().url(),
        })
    ).optional().nullable(),
});

export type FlowAccountDocumentDTO = z.infer<typeof FlowAccountDocumentSchema>;
