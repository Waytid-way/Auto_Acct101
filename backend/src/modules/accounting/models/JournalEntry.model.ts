import mongoose, { Document, Schema } from 'mongoose';

export interface IJournalEntry extends Document {
    clientId: string;
    date: Date;
    accountCode: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    vatAmount?: number;
    attachmentId?: string;
    source: string;
    metadata?: Record<string, any>;
    createdBy: string;
    status: string;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const JournalEntrySchema = new Schema({
    clientId: { type: String, required: true },
    date: { type: Date, required: true },
    accountCode: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['debit', 'credit'], required: true },
    category: { type: String, required: true },
    vatAmount: Number,
    attachmentId: String,
    source: String,
    metadata: Object,
    createdBy: String,
    status: { type: String, default: 'draft' },
    approvedBy: String,
}, { timestamps: true });

export const JournalEntryModel = mongoose.models.JournalEntry || mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
