import { Schema, model, Document } from 'mongoose';

/**
 * SystemConfig Schema - Stores active system configuration
 * This is the "current state" - only one active config per key
 */

export interface ISystemConfig extends Document {
    key: string;
    value: string;
    description?: string;
    dataType: 'string' | 'number' | 'boolean' | 'json';
    category: 'export' | 'ai' | 'security' | 'performance';
    isActive: boolean;
    version: number;
    updatedAt: Date;
    updatedBy: string;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        value: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        dataType: {
            type: String,
            enum: ['string', 'number', 'boolean', 'json'],
            default: 'string'
        },
        category: {
            type: String,
            enum: ['export', 'ai', 'security', 'performance'],
            default: 'export'
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        version: {
            type: Number,
            default: 1
        },
        updatedBy: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true,
        collection: 'system_configs'
    }
);

// Indexes for performance
SystemConfigSchema.index({ key: 1, isActive: 1 });
SystemConfigSchema.index({ category: 1, isActive: 1 });

export const SystemConfigModel = model<ISystemConfig>('SystemConfig', SystemConfigSchema);
