import { Schema, model, Model } from 'mongoose';
import { IExportLog, ExportAction } from '../types';

interface IExportLogModel extends Model<IExportLog> {
    log(
        queueId: string,
        action: ExportAction,
        message: string,
        metadata?: any,
        performedBy?: string
    ): Promise<void>;
}

const ExportLogSchema = new Schema<IExportLog, IExportLogModel>(
    {
        queueId: { type: Schema.Types.ObjectId, ref: 'ExportQueue', required: true },
        action: {
            type: String,
            enum: Object.values(ExportAction),
            required: true
        },
        message: { type: String, required: true },
        performedBy: { type: String, default: 'system' },
        metadata: { type: Object }
    },
    {
        timestamps: { createdAt: true, updatedAt: false } // Only createdAt
    }
);

// Indexes for audit trail queries
ExportLogSchema.index({ queueId: 1, createdAt: -1 });

// Immutability enforcement (Golden Rule #4)
ExportLogSchema.pre('save', function (next) {
    if (!this.isNew) {
        const err = new Error('ExportLog is immutable. Updates are not allowed.');
        return next(err);
    }
    next();
});

// Middleware for updates (block findOneAndUpdate etc.)
const blockUpdates = function (next: any) {
    const err = new Error('ExportLog is immutable. Updates are not allowed.');
    next(err);
};

ExportLogSchema.pre('findOneAndUpdate', blockUpdates);
ExportLogSchema.pre('updateOne', blockUpdates);
ExportLogSchema.pre('updateMany', blockUpdates);

// Static Helper
ExportLogSchema.statics.log = async function (
    queueId: string,
    action: ExportAction,
    message: string,
    metadata?: any,
    performedBy: string = 'system'
) {
    await this.create({
        queueId,
        action,
        message,
        metadata,
        performedBy
    });
};

export const ExportLogModel = model<IExportLog, IExportLogModel>('ExportLog', ExportLogSchema);
