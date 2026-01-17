/**
 * OCR Service Unit Tests
 * Tests for Phase 3B OCR Integration
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { OCRValidationService } from '../../src/modules/ocr/OCRValidationService';
import { OCR_CONFIG, type ExtractedReceiptFields, type ValidationError } from '../../src/modules/ocr/types';

describe('OCRValidationService', () => {
    let validationService: OCRValidationService;

    beforeEach(() => {
        validationService = new OCRValidationService();
    });

    describe('validateExtractedFields - Critical #1: Financial Integrity', () => {
        it('should pass valid integer amounts', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'ร้านกาแฟ Test',
                amount: 15000, // 150.00 THB in satang
                date: '2026-01-17'
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.filter(e => e.severity === 'critical')).toHaveLength(0);
        });

        it('should reject non-integer amounts (Golden Rule #1)', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test Vendor',
                amount: 150.50 // Floating point - INVALID
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'AMOUNT_NOT_INTEGER')).toBe(true);
        });

        it('should reject negative amounts', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: -5000
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'AMOUNT_INVALID_NEGATIVE')).toBe(true);
        });

        it('should reject amounts exceeding 1M THB limit', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 200000000 // 2M THB in satang - exceeds limit
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'AMOUNT_EXCEEDS_LIMIT')).toBe(true);
        });

        it('should warn on suspiciously small amounts', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 0 // Zero - warning
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'AMOUNT_INVALID_NEGATIVE')).toBe(true);
        });
    });

    describe('VAT Validation', () => {
        it('should pass valid VAT amounts', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 10700, // 107.00 THB
                vatAmount: 700, // 7.00 THB (7%)
                subtotal: 10000
            };

            const errors = validationService.validateExtractedFields(fields);
            const vatErrors = errors.filter(e => e.field === 'vatAmount' && e.severity === 'critical');
            expect(vatErrors).toHaveLength(0);
        });

        it('should reject VAT exceeding total amount', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 10000,
                vatAmount: 15000 // VAT > total - invalid
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'VAT_EXCEEDS_AMOUNT')).toBe(true);
        });

        it('should reject non-integer VAT', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 10000,
                vatAmount: 700.5 // Float - invalid
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'VAT_NOT_INTEGER')).toBe(true);
        });
    });

    describe('Date Validation', () => {
        it('should accept valid ISO date format', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 5000,
                date: '2026-01-17'
            };

            const errors = validationService.validateExtractedFields(fields);
            const dateErrors = errors.filter(e => e.field === 'date');
            expect(dateErrors).toHaveLength(0);
        });

        it('should warn on invalid date format', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 5000,
                date: '17/01/2026' // Wrong format
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'DATE_INVALID_FORMAT')).toBe(true);
        });

        it('should reject future dates', () => {
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 2);
            const futureStr = futureDate.toISOString().split('T')[0];

            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 5000,
                date: futureStr
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'DATE_IN_FUTURE')).toBe(true);
        });
    });

    describe('Tax ID Validation', () => {
        it('should accept valid 13-digit Thai Tax ID', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 5000,
                taxId: '0123456789012' // 13 digits
            };

            const errors = validationService.validateExtractedFields(fields);
            const taxErrors = errors.filter(e => e.field === 'taxId');
            expect(taxErrors).toHaveLength(0);
        });

        it('should warn on invalid Tax ID length', () => {
            const fields: ExtractedReceiptFields = {
                vendor: 'Test',
                amount: 5000,
                taxId: '123456789' // Too short
            };

            const errors = validationService.validateExtractedFields(fields);
            expect(errors.some(e => e.code === 'TAX_ID_INVALID')).toBe(true);
        });
    });

    describe('parseThaiBahtToSatang', () => {
        it('should parse "฿100" to 10000 satang', () => {
            const result = validationService.parseThaiBahtToSatang('฿100');
            expect(result).toBe(10000);
        });

        it('should parse "100.50 บาท" to 10050 satang', () => {
            const result = validationService.parseThaiBahtToSatang('100.50 บาท');
            expect(result).toBe(10050);
        });

        it('should parse "THB 1,234.56" to 123456 satang', () => {
            const result = validationService.parseThaiBahtToSatang('THB 1,234.56');
            expect(result).toBe(123456);
        });

        it('should return null for invalid input', () => {
            const result = validationService.parseThaiBahtToSatang('invalid');
            expect(result).toBeNull();
        });
    });

    describe('requiresManualReview', () => {
        it('should return true if any critical errors exist', () => {
            const errors: ValidationError[] = [
                { field: 'amount', code: 'AMOUNT_NOT_INTEGER', message: 'test', severity: 'critical' }
            ];

            expect(validationService.requiresManualReview(errors)).toBe(true);
        });

        it('should return false if only warnings exist', () => {
            const errors: ValidationError[] = [
                { field: 'date', code: 'DATE_TOO_OLD', message: 'test', severity: 'warning' }
            ];

            expect(validationService.requiresManualReview(errors)).toBe(false);
        });

        it('should return false for empty errors', () => {
            expect(validationService.requiresManualReview([])).toBe(false);
        });
    });
});

describe('OCR_CONFIG', () => {
    it('should have correct confidence thresholds', () => {
        expect(OCR_CONFIG.CONFIDENCE_THRESHOLDS.PADDLE_OCR.ACCEPT).toBe(0.85);
        expect(OCR_CONFIG.CONFIDENCE_THRESHOLDS.PADDLE_OCR.FALLBACK).toBe(0.70);
        expect(OCR_CONFIG.CONFIDENCE_THRESHOLDS.GOOGLE_VISION.ACCEPT).toBe(0.90);
    });

    it('should have correct file size limit (10MB)', () => {
        expect(OCR_CONFIG.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should have correct amount validation limits', () => {
        expect(OCR_CONFIG.AMOUNT_VALIDATION.MIN_SATANG).toBe(1);
        expect(OCR_CONFIG.AMOUNT_VALIDATION.MAX_SATANG).toBe(100000000); // 1M THB
    });
});
