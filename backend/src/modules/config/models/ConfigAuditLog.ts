import { Schema, model, Document } from 'mongoose';

/**
 * ConfigAuditLog Schema - Audit trail for all config changes
 * Tracks who changed what, when, and why
 */

export interface IConfigAuditLog extends Document {
    key: string;
    action: 'set' | 'rollback' | 'reset' | 'delete';
    oldValue: string | null;
    newValue: string | null;
    version: number;
    status: 'success' | 'failed' | 'pending';
    error?: string;
    changedBy: string;
    userAgent?: string;
    ipAddress?: string;
    reason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const ConfigAuditLogSchema = new Schema<IConfigAuditLog>(
    {
        key: {
            type: String,
            required: true,
            index: true
        },
        action: {
            type: String,
            enum: ['set', 'rollback', 'reset', 'delete'],
            required: true
        },
        oldValue: {
            type: String,
            default: null
        },
        newValue: {
            type: String,
            default: null
        },
        version: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['success', 'failed', 'pending'],
            default: 'pending',
            index: true
        },
        error: {
            type: String,
            default: null
        },
        changedBy: {
            type: String,
            required: true,
            index: true
        },
        userAgent: {
            type: String,
            default: null
        },
        ipAddress: {
            type: String,
            default: null
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
        collection: 'config_audit_logs'
    }
);

// Indexes
ConfigAuditLogSchema.index({ key: 1, createdAt: -1 });
ConfigAuditLogSchema.index({ changedBy: 1, createdAt: -1 });
ConfigAuditLogSchema.index({ status: 1, createdAt: -1 });
ConfigAuditLogSchema.index({ action: 1, createdAt: -1 });

export const ConfigAuditLogModel = model<IConfigAuditLog>('ConfigAuditLog', ConfigAuditLogSchema);
