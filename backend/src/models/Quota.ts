/**
 * Quota Model
 * MongoDB schema for tracking Google Vision API quota usage
 * 
 * P0 Fix #1: Expert Review - Persistent quota tracking (Critical #4)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IQuota extends Document {
    /** Service identifier */
    service: 'google_vision';
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Current usage count */
    count: number;
    /** Daily limit */
    limit: number;
    /** Last updated timestamp */
    lastUpdated: Date;
}

/**
 * Quota schema
 */
const QuotaSchema = new Schema<IQuota>({
    service: {
        type: String,
        required: true,
        enum: ['google_vision'],
        index: true
    },
    date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        index: true,
        description: 'Date in YYYY-MM-DD format'
    },
    count: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    limit: {
        type: Number,
        required: true,
        default: 30 // 30/day = ~900/month
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    collection: 'quotas'
});

// Compound unique index to prevent duplicates
QuotaSchema.index({ service: 1, date: 1 }, { unique: true });

/**
 * Static methods
 */
QuotaSchema.statics.getOrCreateToday = async function (this: any, service: 'google_vision') {
    const today = new Date().toISOString().split('T')[0];

    let quota = await this.findOne({ service, date: today });

    if (!quota) {
        quota = await this.create({
            service,
            date: today,
            count: 0,
            limit: 30,
            lastUpdated: new Date()
        });
    }

    return quota;
};

QuotaSchema.statics.incrementUsage = async function (this: any, service: 'google_vision') {
    const today = new Date().toISOString().split('T')[0];

    const result = await this.findOneAndUpdate(
        { service, date: today },
        {
            $inc: { count: 1 },
            $set: { lastUpdated: new Date() }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return result;
};

QuotaSchema.statics.checkAvailability = async function (this: any, service: 'google_vision'): Promise<boolean> {
    const quota = await this.getOrCreateToday(service);
    return quota.count < quota.limit;
};

QuotaSchema.statics.getRemainingQuota = async function (this: any, service: 'google_vision'): Promise<number> {
    const quota = await this.getOrCreateToday(service);
    return Math.max(0, quota.limit - quota.count);
};

// Static methods interface
interface QuotaModel extends mongoose.Model<IQuota> {
    getOrCreateToday(service: 'google_vision'): Promise<IQuota>;
    incrementUsage(service: 'google_vision'): Promise<IQuota>;
    checkAvailability(service: 'google_vision'): Promise<boolean>;
    getRemainingQuota(service: 'google_vision'): Promise<number>;
}

/**
 * Export Quota model
 */
export const QuotaModel = mongoose.model('Quota', QuotaSchema) as QuotaModel;
