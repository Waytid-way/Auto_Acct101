import { describe, expect, it } from 'bun:test';
import { parseMoneyFromString, assertMoneyIsInteger, splitMoney, formatMoney } from '../../src/types/money';

describe('Money Utilities', () => {
    describe('parseMoneyFromString', () => {
        it('converts valid strings to satang', () => {
            expect(parseMoneyFromString("100.00")).toBe(10000);
            expect(parseMoneyFromString("99.99")).toBe(9999);
            expect(parseMoneyFromString("0.50")).toBe(50);
            expect(parseMoneyFromString("0")).toBe(0);
        });

        it('throws on invalid strings', () => {
            expect(() => parseMoneyFromString("abc")).toThrow();
        });
    });

    describe('assertMoneyIsInteger', () => {
        it('allows integers', () => {
            expect(assertMoneyIsInteger(100)).toBe(100);
        });

        it('throws on floats', () => {
            expect(() => assertMoneyIsInteger(100.5)).toThrow();
        });
    });

    describe('splitMoney', () => {
        it('uses plug method correctly (100 / 3)', () => {
            const result = splitMoney(100, 3);
            // Floor(100/3) = 33
            // Remainder = 1
            // [33+1, 33, 33]
            expect(result).toEqual([34, 33, 33]);
            expect(result.reduce((a, b) => a + b, 0)).toBe(100);
        });

        it('handles exact division (100 / 2)', () => {
            const result = splitMoney(100, 2);
            expect(result).toEqual([50, 50]);
        });
    });

    describe('formatMoney', () => {
        it('formats satang correctly', () => {
            expect(formatMoney(10050)).toBe("100.50");
            expect(formatMoney(9999)).toBe("99.99");
        });
    });
});
