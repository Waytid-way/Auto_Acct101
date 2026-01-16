import mongoose, { Schema, Document } from 'mongoose';

export interface IFlowAccountToken extends Document {
    clientId: string;              // Internal client reference
    accessToken: string;           // Encrypted access token
    refreshToken: string;          // Encrypted refresh token
    expiresAt: Date;               // Token expiration time
    scope: string;                 // OAuth scopes granted
    flowAccountCompanyId: string;  // FlowAccount company ID
    isActive: boolean;             // Enable/disable sync
    lastSyncAt?: Date;             // Last successful sync timestamp
    metadata?: {
        companyName?: string;
        taxId?: string;
    };
}

const FlowAccountTokenSchema = new Schema<IFlowAccountToken>(
    {
        clientId: { type: String, required: true, unique: true, index: true },
        accessToken: { type: String, required: true },      // Will be encrypted
        refreshToken: { type: String, required: true },     // Will be encrypted
        expiresAt: { type: Date, required: true, index: true },
        scope: { type: String, required: true },
        flowAccountCompanyId: { type: String, required: true },
        isActive: { type: Boolean, default: true, index: true },
        lastSyncAt: { type: Date },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true, collection: 'flowaccount_tokens' }
);

export const FlowAccountToken = mongoose.model<IFlowAccountToken>(
    'FlowAccountToken',
    FlowAccountTokenSchema
);
