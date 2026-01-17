/**
 * Google Vision Service
 * P0 Fix #3: Expert Review - Service Account instead of API Key
 * 
 * Security improvements:
 * - Uses Service Account credentials (GOOGLE_APPLICATION_CREDENTIALS)
 * - Fine-grained IAM permissions
 * - Better rate limit management
 * - Production-ready authentication
 */

import vision from '@google-cloud/vision';
import logger from '@loaders/logger';
import { QuotaModel } from '@models/Quota';
import config from '@config/env';
import type { ExtractedReceiptFields, FieldConfidence } from './types';

export class GoogleVisionService {
    private client: vision.ImageAnnotatorClient | null = null;
    private enabled: boolean;

    constructor() {
        // Check if Service Account is configured
        this.enabled = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (this.enabled) {
            try {
                // Uses GOOGLE_APPLICATION_CREDENTIALS env var automatically
                this.client = new vision.ImageAnnotatorClient();
                logger.info('Google Vision Service initialized with Service Account', {
                    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
                });
            } catch (error) {
                logger.error('Failed to initialize Google Vision client', {
                    error: error instanceof Error ? error.message : 'Unknown'
                });
                this.enabled = false;
            }
        } else {
            logger.warn('Google Vision Service disabled - no GOOGLE_APPLICATION_CREDENTIALS');
        }
    }

    /**
     * Extract text from image using Google Vision API
     * With quota tracking (Critical #4)
     */
    async extractText(
        imageBuffer: Buffer
    ): Promise<{
        rawText: string;
        extractedFields: ExtractedReceiptFields;
        confidence: FieldConfidence
    } | null> {
        if (!this.enabled || !this.client) {
            logger.warn('Google Vision not available');
            return null;
        }

        try {
            // Critical #4: Check quota before API call
            const quotaAvailable = await QuotaModel.checkAvailability('google_vision');
            if (!quotaAvailable) {
                const remaining = await QuotaModel.getRemainingQuota('google_vision');
                logger.warn('Google Vision quota exhausted', {
                    remaining,
                    quota: await QuotaModel.getOrCreateToday('google_vision')
                });
                return null;
            }

            // Make API call
            const [result] = await this.client.textDetection(imageBuffer);

            // Critical #4: Increment quota after successful call
            await QuotaModel.incrementUsage('google_vision');

            const textAnnotations = result.textAnnotations;
            const fullText = textAnnotations?.[0]?.description || '';

            logger.info('Google Vision extraction successful', {
                textLength: fullText.length,
                blocksDetected: textAnnotations?.length || 0
            });

            // Parse receipt fields from text
            const extractedFields = this.parseReceiptFields(fullText);

            // Calculate confidence (Google Vision doesn't provide per-field confidence)
            const confidence: FieldConfidence = {
                vendor: 0.90,
                amount: 0.90,
                date: 0.90,
                overall: 0.90
            };

            return {
                rawText: fullText,
                extractedFields,
                confidence
            };

        } catch (error) {
            logger.error('Google Vision API call failed', {
                error: error instanceof Error ? error.message : 'Unknown'
            });
            return null;
        }
    }

    /**
     * Parse receipt fields from raw text
     * (Same logic as in OCRService - could be extracted to shared utility)
     */
    private parseReceiptFields(text: string): ExtractedReceiptFields {
        const fields: ExtractedReceiptFields = {};

        // Extract vendor (first line usually)
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            fields.vendor = lines[0].trim();
        }

        // Extract amount (Thai Baht patterns)
        const amountPatterns = [
            /รวม\s*[:\s]*฿?\s*([\d,]+\.?\d*)/i,
            /ยอดรวม\s*[:\s]*฿?\s*([\d,]+\.?\d*)/i,
            /total\s*[:\s]*฿?\s*([\d,]+\.?\d*)/i,
            /฿\s*([\d,]+\.?\d*)/,
            /([\d,]+\.?\d*)\s*(?:บาท|THB)/i
        ];

        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match) {
                const amountStr = match[1].replace(/,/g, '');
                const amount = parseFloat(amountStr);
                if (!isNaN(amount)) {
                    fields.amount = Math.round(amount * 100); // Convert to satang
                    break;
                }
            }
        }

        // Extract date
        const datePatterns = [
            /(\d{1,2})[\\/\-](\d{1,2})[\\/\-](\d{2,4})/,
            /(\d{4})[\\/\-](\d{1,2})[\\/\-](\d{1,2})/
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    let year = match[3] || match[1];
                    let month = match[2];
                    let day = match[1] || match[3];

                    // Handle 2-digit year
                    if (year.length === 2) {
                        year = `20${year}`;
                    }

                    // Handle Buddhist Era (BE) - subtract 543
                    const yearNum = parseInt(year);
                    if (yearNum > 2500) {
                        year = String(yearNum - 543);
                    }

                    fields.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    break;
                } catch {
                    // Continue to next pattern
                }
            }
        }

        // Extract Tax ID (13 digits)
        const taxIdMatch = text.match(/(?:เลขประจำตัวผู้เสียภาษี|Tax\s*ID)[:\s]*(\d[\d\-\s]{12,16}\d)/i);
        if (taxIdMatch) {
            fields.taxId = taxIdMatch[1].replace(/[\-\s]/g, '');
        }

        // Extract VAT
        const vatMatch = text.match(/(?:VAT|ภาษีมูลค่าเพิ่ม|vat\s*7%?)[:\s]*฿?\s*([\d,]+\.?\d*)/i);
        if (vatMatch) {
            const vatStr = vatMatch[1].replace(/,/g, '');
            const vat = parseFloat(vatStr);
            if (!isNaN(vat)) {
                fields.vatAmount = Math.round(vat * 100); // Convert to satang
            }
        }

        return fields;
    }

    /**
     * Check if service is available
     */
    isAvailable(): boolean {
        return this.enabled && this.client !== null;
    }

    /**
     * Get current quota status
     */
    async getQuotaStatus(): Promise<{
        used: number;
        limit: number;
        remaining: number;
        available: boolean;
    }> {
        const quota = await QuotaModel.getOrCreateToday('google_vision');
        const remaining = await QuotaModel.getRemainingQuota('google_vision');
        const available = await QuotaModel.checkAvailability('google_vision');

        return {
            used: quota.count,
            limit: quota.limit,
            remaining,
            available
        };
    }
}

// Singleton export
export const googleVisionService = new GoogleVisionService();
