/**
 * Export System Types & Enums
 */
import { Document, Types } from 'mongoose';

/**
 * Export Path Strategy
 * - manual: User downloads CSV manually
 * - immediate: Posted to Express API immediately
 * - scheduled: Batched for daily cron job
 */
export enum ExportPath {
    MANUAL = 'manual',
    IMMEDIATE = 'immediate',
    SCHEDULED = 'scheduled'
}

/**
 * Lifecycle Status of an Export Request
 */
export enum ExportStatus {
    QUEUED = 'queued',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

/**
 * Audit Log Actions
 */
export enum ExportAction {
    QUEUED = 'queued',
    EXPORT_STARTED = 'export_started',
    CSV_GENERATED = 'csv_generated',
    COMPLETED = 'completed',
    FAILED = 'failed',
    RETRY = 'retry'
}

/**
 * Export Queue Document Interface
 */
export interface IExportQueue extends Document {
    entryId: Types.ObjectId;
    exportPath: ExportPath;
    status: ExportStatus;
    scheduledFor?: Date;
    attempts: number;
    lastError?: string;
    completedAt?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;

    // Instance Methods
    markAsProcessing(): Promise<void>;
    markAsCompleted(metadata: any): Promise<void>;
    markAsFailed(error: string): Promise<void>;
    canRetry(): boolean;
}

/**
 * Export Log Document Interface (Immutable)
 */
export interface IExportLog extends Document {
    queueId: Types.ObjectId;
    action: ExportAction;
    message: string;
    performedBy: string; // 'system' or User ID
    metadata?: Record<string, any>;
    createdAt: Date;
}
