/**
 * Receipt Model
 * MongoDB schema for receipt OCR data with deduplication
 * 
 * P0 Fix #1: Expert Review - MongoDB persistence layer
 */

import mongoose, { Schema, Document } from 'mongoose';
import type { OCREngine, OCRStatus } from '@modules/ocr/types';

/**
 * Receipt document interface
 */
export interface IReceipt extends Document {
    /** SHA-256 hash for deduplication (Critical #2) */
    fileHash: string;
    /** Original filename */
    filename: string;
    /** MIME type */
    mimeType: string;
    /** File size in bytes */
    fileSize: number;

    /** OCR extracted text */
    ocrText: string;
    /** OCR confidence score */
    confidence: number;
    /** OCR engine used */
    engine: OCREngine;

    /** Extracted receipt fields */
    extractedFields: {
        vendor?: string;
        /** Amount in satang (MUST be integer - Golden Rule #1) */
        amount?: number;
        date?: string;
        taxId?: string;
        vatAmount?: number;
        subtotal?: number;
    };

    /** Validation errors from financial checks (Critical #1) */
    validationErrors: Array<{
        field: string;
        code: string;
        message: string;
        severity: 'critical' | 'warning';
    }>;

    /** Processing status */
    status: OCRStatus;
    /** Requires manual review flag */
    requiresManualReview: boolean;

    /** Groq AI classification result (if processed) */
    classification?: {
        category: string;
        confidence: number;
        reasoning: string;
    };

    /** Teable record ID (if synced) */
    teableRecordId?: string;
    /** Google Drive file ID (if uploaded) */
    driveFileId?: string;

    /** User who uploaded */
    uploadedBy?: string;

    /** Processing time in milliseconds */
    processingTimeMs: number;

    /** Timestamps */
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Receipt schema
 */
const ReceiptSchema = new Schema<IReceipt>({
    // Deduplication (Critical #2)
    fileHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
        description: 'SHA-256 hash for preventing duplicate uploads'
    },

    // File metadata
    filename: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    },
    fileSize: {
        type: Number,
        required: true,
        min: 0,
        max: 10 * 1024 * 1024 // 10MB
    },

    // OCR results
    ocrText: {
        type: String,
        required: true,
        default: ''
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    engine: {
        type: String,
        required: true,
        enum: ['paddleocr', 'google_vision', 'manual']
    },

    // Extracted fields
    extractedFields: {
        vendor: String,
        amount: {
            type: Number,
            validate: {
                validator: Number.isInteger,
                message: 'Amount must be integer (satang) - Golden Rule #1'
            }
        },
        date: String,
        taxId: String,
        vatAmount: {
            type: Number,
            validate: {
                validator: Number.isInteger,
                message: 'VAT amount must be integer (satang)'
            }
        },
        subtotal: {
            type: Number,
            validate: {
                validator: Number.isInteger,
                message: 'Subtotal must be integer (satang)'
            }
        }
    },

    // Financial validation (Critical #1)
    validationErrors: [{
        field: { type: String, required: true },
        code: { type: String, required: true },
        message: { type: String, required: true },
        severity: {
            type: String,
            enum: ['critical', 'warning'],
            required: true
        }
    }],

    // Status
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processed', 'manual_review_required', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    requiresManualReview: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },

    // AI Classification (Phase 3A integration)
    classification: {
        category: String,
        confidence: Number,
        reasoning: String
    },

    // External integrations
    teableRecordId: String,
    driveFileId: String,

    // User tracking
    uploadedBy: String,

    // Performance metrics
    processingTimeMs: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    timestamps: true,
    collection: 'receipts'
});

// Indexes for performance
ReceiptSchema.index({ createdAt: -1 }); // Sort by recent
ReceiptSchema.index({ uploadedBy: 1, createdAt: -1 }); // User history
ReceiptSchema.index({ status: 1, requiresManualReview: 1 }); // Review queue

// Static methods
ReceiptSchema.statics.findByHash = function (fileHash: string) {
    return this.findOne({ fileHash });
};

ReceiptSchema.statics.findPendingReview = function () {
    return this.find({
        requiresManualReview: true,
        status: 'manual_review_required'
    }).sort({ createdAt: -1 });
};

ReceiptSchema.statics.countByEngine = function () {
    return this.aggregate([
        { $group: { _id: '$engine', count: { $sum: 1 } } }
    ]);
};

/**
 * Export Receipt model
 */
export const ReceiptModel = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
