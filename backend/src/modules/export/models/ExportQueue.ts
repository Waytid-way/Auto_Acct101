import { Schema, model, Types } from 'mongoose';
import { IExportQueue, ExportPath, ExportStatus } from '../types';

const ExportQueueSchema = new Schema<IExportQueue>(
    {
        entryId: {
            type: Schema.Types.ObjectId,
            ref: 'JournalEntry',
            required: true,
            unique: true
        },
        exportPath: {
            type: String,
            enum: Object.values(ExportPath),
            required: true
        },
        status: {
            type: String,
            enum: Object.values(ExportStatus),
            default: ExportStatus.QUEUED
        },
        scheduledFor: {
            type: Date,
            required: function (this: any) {
                return this.exportPath === ExportPath.SCHEDULED;
            }
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
            max: 3,
            validate: {
                validator: (v: number) => Number.isInteger(v) && v >= 0 && v <= 3,
                message: 'Attempts must be an integer between 0 and 3'
            }
        },
        lastError: { type: String },
        completedAt: { type: Date },
        metadata: { type: Object }
    },
    { timestamps: true }
);

// Indexes
// Compound index for finding pending scheduled jobs efficiently
ExportQueueSchema.index({ status: 1, scheduledFor: 1 });
// Unique index already defined in field definition, but good to be explicit in thought

// Methods
ExportQueueSchema.methods.markAsProcessing = async function () {
    this.status = ExportStatus.PROCESSING;
    await this.save();
};

ExportQueueSchema.methods.markAsCompleted = async function (metadata: any) {
    this.status = ExportStatus.COMPLETED;
    this.completedAt = new Date();
    if (metadata) {
        this.metadata = { ...this.metadata, ...metadata };
    }
    await this.save();
};

ExportQueueSchema.methods.markAsFailed = async function (error: string) {
    this.status = ExportStatus.FAILED;
    this.lastError = error;
    // Increment attempts only if not already max (though validator catches save)
    // We want to increment so we know we tried. Validator will stop > 3.
    if (this.attempts < 3) {
        this.attempts += 1;
    }
    await this.save();
};

ExportQueueSchema.methods.canRetry = function (): boolean {
    return this.attempts < 3 && this.status === ExportStatus.FAILED;
};

export const ExportQueueModel = model<IExportQueue>('ExportQueue', ExportQueueSchema);
