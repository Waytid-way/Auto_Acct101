/**
 * MoneyInt: Integer representation of money in satang/cents
 * NEVER use floats for monetary values to avoid precision errors
 * 
 * Examples:
 * - 100.00 THB = 10000 satang
 * - 99.99 THB = 9999 satang
 */
export type MoneyInt = number;

/**
 * Parse money string to integer satang
 * @param str - Amount as string (e.g., "100.50", "99.99")
 * @returns Integer satang (e.g., 10050, 9999)
 * @throws Error if not a valid number
 */
export function parseMoneyFromString(str: string): MoneyInt {
    const float = parseFloat(str);
    if (isNaN(float)) {
        throw new Error(`Invalid money string: ${str}`);
    }

    const satang = Math.round(float * 100);
    return assertMoneyIsInteger(satang);
}

/**
 * Assert value is an integer (no decimals)
 * @throws Error if value has decimal places
 */
export function assertMoneyIsInteger(value: number): MoneyInt {
    if (!Number.isInteger(value)) {
        throw new Error(`Money must be integer (satang), got: ${value}`);
    }
    return value;
}

/**
 * Split amount into N parts using "plug method"
 * Ensures sum of parts exactly equals total
 * 
 * @example
 * splitMoney(100, 3) => [33, 33, 34] (sum: 100)
 */
export function splitMoney(total: MoneyInt, parts: number): MoneyInt[] {
    assertMoneyIsInteger(total);

    if (parts <= 0) {
        throw new Error('Parts must be > 0');
    }

    const base = Math.floor(total / parts);
    const remainder = total - (base * parts);

    const result: MoneyInt[] = Array(parts).fill(base);

    // Add remainder to first item (plug method)
    result[0] += remainder;

    // Verify sum
    const sum = result.reduce((a, b) => a + b, 0);
    if (sum !== total) {
        throw new Error(`Split money sum mismatch: ${sum} !== ${total}`);
    }

    return result;
}

/**
 * Format satang to THB display string
 * @example formatMoney(10050) => "100.50"
 */
export function formatMoney(satang: MoneyInt): string {
    assertMoneyIsInteger(satang);
    return (satang / 100).toFixed(2);
}
