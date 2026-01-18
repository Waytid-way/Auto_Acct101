/**
 * OCR Financial Validation Service
 * Critical Modification #1: Validate OCR output against financial integrity rules
 * 
 * Golden Rules enforced:
 * 1. All money = integers (satang/cents)
 * 2. Amounts must be within valid range
 * 3. No floating-point amounts
 */

import logger from '@loaders/logger';
import {
    ExtractedReceiptFields,
    ValidationError,
    OCR_CONFIG
} from './types';

export class OCRValidationService {
    /**
     * Validate extracted receipt fields against financial integrity rules
     * @param fields Extracted receipt fields from OCR
     * @returns Array of validation errors (empty if valid)
     */
    validateExtractedFields(fields: ExtractedReceiptFields): ValidationError[] {
        const errors: ValidationError[] = [];
        const { MIN_SATANG, MAX_SATANG } = OCR_CONFIG.AMOUNT_VALIDATION;

        // Validate main amount
        if (fields.amount !== undefined) {
            // Critical: Amount must be integer (satang)
            if (!Number.isInteger(fields.amount)) {
                errors.push({
                    field: 'amount',
                    code: 'AMOUNT_NOT_INTEGER',
                    message: `Amount must be integer (satang). Got: ${fields.amount}`,
                    severity: 'critical'
                });
            }

            // Check valid range
            if (fields.amount <= 0) {
                errors.push({
                    field: 'amount',
                    code: 'AMOUNT_INVALID_NEGATIVE',
                    message: `Amount must be positive. Got: ${fields.amount}`,
                    severity: 'critical'
                });
            }

            if (fields.amount > MAX_SATANG) {
                errors.push({
                    field: 'amount',
                    code: 'AMOUNT_EXCEEDS_LIMIT',
                    message: `Amount exceeds maximum (${MAX_SATANG / 100} THB). Got: ${fields.amount / 100} THB`,
                    severity: 'critical'
                });
            }

            // Warning: suspiciously small amounts
            if (fields.amount > 0 && fields.amount < MIN_SATANG) {
                errors.push({
                    field: 'amount',
                    code: 'AMOUNT_TOO_SMALL',
                    message: `Amount is unusually small: ${fields.amount} satang`,
                    severity: 'warning'
                });
            }
        }

        // Validate VAT amount
        if (fields.vatAmount !== undefined) {
            if (!Number.isInteger(fields.vatAmount)) {
                errors.push({
                    field: 'vatAmount',
                    code: 'VAT_NOT_INTEGER',
                    message: `VAT amount must be integer. Got: ${fields.vatAmount}`,
                    severity: 'critical'
                });
            }

            if (fields.vatAmount < 0) {
                errors.push({
                    field: 'vatAmount',
                    code: 'VAT_NEGATIVE',
                    message: `VAT cannot be negative. Got: ${fields.vatAmount}`,
                    severity: 'critical'
                });
            }

            // VAT sanity check: should not exceed amount
            if (fields.amount && fields.vatAmount > fields.amount) {
                errors.push({
                    field: 'vatAmount',
                    code: 'VAT_EXCEEDS_AMOUNT',
                    message: `VAT (${fields.vatAmount}) exceeds total amount (${fields.amount})`,
                    severity: 'critical'
                });
            }
        }

        // Validate subtotal
        if (fields.subtotal !== undefined) {
            if (!Number.isInteger(fields.subtotal)) {
                errors.push({
                    field: 'subtotal',
                    code: 'SUBTOTAL_NOT_INTEGER',
                    message: `Subtotal must be integer. Got: ${fields.subtotal}`,
                    severity: 'critical'
                });
            }

            // Cross-validate: subtotal + VAT should equal amount
            if (fields.amount && fields.vatAmount) {
                const expectedTotal = fields.subtotal + fields.vatAmount;
                if (expectedTotal !== fields.amount) {
                    errors.push({
                        field: 'subtotal',
                        code: 'SUBTOTAL_MISMATCH',
                        message: `Subtotal + VAT (${expectedTotal}) does not equal total (${fields.amount})`,
                        severity: 'warning'
                    });
                }
            }
        }

        // Validate date format
        if (fields.date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(fields.date)) {
                errors.push({
                    field: 'date',
                    code: 'DATE_INVALID_FORMAT',
                    message: `Date must be YYYY-MM-DD format. Got: ${fields.date}`,
                    severity: 'warning'
                });
            } else {
                // Check if date is in reasonable range
                const parsedDate = new Date(fields.date);
                const now = new Date();
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                const oneMonthAhead = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

                if (parsedDate < oneYearAgo) {
                    errors.push({
                        field: 'date',
                        code: 'DATE_TOO_OLD',
                        message: `Receipt date is more than 1 year old: ${fields.date}`,
                        severity: 'warning'
                    });
                }

                if (parsedDate > oneMonthAhead) {
                    errors.push({
                        field: 'date',
                        code: 'DATE_IN_FUTURE',
                        message: `Receipt date is in the future: ${fields.date}`,
                        severity: 'critical'
                    });
                }
            }
        }

        // Validate Tax ID format (Thai format: 13 digits)
        if (fields.taxId) {
            const taxIdClean = fields.taxId.replace(/[-\s]/g, '');
            if (!/^\d{13}$/.test(taxIdClean)) {
                errors.push({
                    field: 'taxId',
                    code: 'TAX_ID_INVALID',
                    message: `Thai Tax ID must be 13 digits. Got: ${fields.taxId}`,
                    severity: 'warning'
                });
            }
        }

        // Log validation results
        if (errors.length > 0) {
            const criticalErrors = errors.filter(e => e.severity === 'critical');
            logger.warn('OCR validation errors detected', {
                totalErrors: errors.length,
                criticalCount: criticalErrors.length,
                fields,
                errors
            });
        }

        return errors;
    }

    /**
     * Check if validation errors require manual review
     */
    requiresManualReview(errors: ValidationError[]): boolean {
        return errors.some(e => e.severity === 'critical');
    }

    /**
     * Convert Thai Baht string to satang (integer)
     * Handles formats: "฿100", "100.50 บาท", "THB 1,234.56"
     */
    parseThaiBahtToSatang(amountStr: string): number | null {
        try {
            // Remove Thai Baht symbol, commas, spaces
            const cleaned = amountStr
                .replace(/[฿บาทTHB\s,]/gi, '')
                .trim();

            const parsed = parseFloat(cleaned);
            if (isNaN(parsed)) {
                return null;
            }

            // Convert to satang (multiply by 100 and round)
            return Math.round(parsed * 100);
        } catch {
            return null;
        }
    }
}

// Singleton export
export const ocrValidationService = new OCRValidationService();
