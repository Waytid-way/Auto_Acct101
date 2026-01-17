import { z } from 'zod';

export interface CreateJournalEntryDTO {
    clientId: string;
    date: Date;
    accountCode: string;
    description: string;
    amount: number; // Satang
    type: 'debit' | 'credit';
    category: string;
    vatAmount?: number;
    attachmentId?: string;
    source: string;
    metadata?: Record<string, any>;
    createdBy: string;
}

export const CreateJournalEntrySchema = z.object({
    clientId: z.string(),
    date: z.date(),
    accountCode: z.string(),
    description: z.string(),
    amount: z.number().int(),
    type: z.enum(['debit', 'credit']),
    category: z.string(),
    vatAmount: z.number().int().optional(),
    attachmentId: z.string().optional(),
    source: z.string(),
    metadata: z.record(z.any()).optional(),
    createdBy: z.string(),
});
