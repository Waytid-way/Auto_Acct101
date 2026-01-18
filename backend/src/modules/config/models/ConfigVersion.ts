import { Schema, model, Document } from 'mongoose';

/**
 * ConfigVersion Schema - Stores historical versions of configs
 * Enables rollback and audit trail
 */

export interface IConfigVersion extends Document {
    key: string;
    value: string;
    version: number;
    isActive: boolean;
    updatedBy: string;
    reason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const ConfigVersionSchema = new Schema<IConfigVersion>(
    {
        key: {
            type: String,
            required: true,
            index: true
        },
        value: {
            type: String,
            required: true
        },
        version: {
            type: Number,
            required: true,
            min: 1
        },
        isActive: {
            type: Boolean,
            default: false,
            index: true
        },
        updatedBy: {
            type: String,
            required: true
        },
        reason: {
            type: String,
            default: ''
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: 'config_versions'
    }
);

// Compound indexes
ConfigVersionSchema.index({ key: 1, version: -1 }); // Latest versions first
ConfigVersionSchema.index({ key: 1, isActive: 1 });
ConfigVersionSchema.index({ createdAt: -1 }); // Recent changes

// Ensure unique version per key
ConfigVersionSchema.index({ key: 1, version: 1 }, { unique: true });

export const ConfigVersionModel = model<IConfigVersion>('ConfigVersion', ConfigVersionSchema);
