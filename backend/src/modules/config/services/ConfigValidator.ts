export interface ValidationResult {
    valid: boolean;
    error?: string;
    warning?: string;
}

/**
 * ConfigValidator - Validates configuration values
 * Prevents invalid configs from being applied
 */
export class ConfigValidator {
    /**
     * Validate export schedule time (HH:MM format)
     */
    validateExportTime(time: string): ValidationResult {
        // 1. Format validation
        const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(time)) {
            return {
                valid: false,
                error: 'Invalid format. Use HH:MM (e.g., 18:00)'
            };
        }

        // 2. Parse time
        const [hours, _] = time.split(':').map(Number);

        // 3. Business hours check (6 AM - 10 PM)
        if (hours < 6 || hours > 22) {
            return {
                valid: false,
                error: 'Export must be scheduled between 06:00 and 22:00 (business hours)'
            };
        }

        // 4. Warning for peak hours
        if (hours >= 9 && hours <= 17) {
            return {
                valid: true,
                warning: 'Scheduled during business hours. Consider off-peak times (18:00-22:00)'
            };
        }

        return { valid: true };
    }

    /**
     * Validate AI confidence threshold (0.0 - 1.0)
     */
    validateConfidenceThreshold(value: string): ValidationResult {
        const num = parseFloat(value);

        // 1. Type check
        if (isNaN(num)) {
            return {
                valid: false,
                error: 'Must be a number between 0.0 and 1.0'
            };
        }

        // 2. Range check
        if (num < 0 || num > 1) {
            return {
                valid: false,
                error: 'Must be between 0.0 and 1.0'
            };
        }

        // 3. Too low check
        if (num < 0.5) {
            return {
                valid: false,
                error: 'Threshold too low (< 0.5). Would accept unreliable predictions'
            };
        }

        // 4. Warning for very high threshold
        if (num > 0.95) {
            return {
                valid: true,
                warning: 'Very high threshold (> 0.95). May require excessive manual review'
            };
        }

        return { valid: true };
    }

    /**
     * Validate batch size (positive integer)
     */
    validateBatchSize(value: string): ValidationResult {
        const num = parseInt(value, 10);

        if (isNaN(num) || num <= 0) {
            return {
                valid: false,
                error: 'Must be a positive integer'
            };
        }

        if (num > 1000) {
            return {
                valid: false,
                error: 'Batch size too large (max: 1000). May cause memory issues'
            };
        }

        if (num < 10) {
            return {
                valid: true,
                warning: 'Batch size very small (< 10). May cause frequent exports'
            };
        }

        return { valid: true };
    }

    /**
     * Validate buffer time (minutes)
     */
    validateBufferTime(value: string): ValidationResult {
        const num = parseInt(value, 10);

        if (isNaN(num) || num < 0) {
            return {
                valid: false,
                error: 'Must be a non-negative integer (minutes)'
            };
        }

        if (num > 120) {
            return {
                valid: false,
                error: 'Buffer time too long (max: 120 minutes)'
            };
        }

        return { valid: true };
    }

    /**
     * Main validation dispatcher
     */
    validate(key: string, value: string): ValidationResult {
        switch (key) {
            case 'DAILY_EXPORT_TIME':
                return this.validateExportTime(value);
            case 'AI_CONFIDENCE_THRESHOLD':
                return this.validateConfidenceThreshold(value);
            case 'MAX_BATCH_SIZE':
                return this.validateBatchSize(value);
            case 'IMMEDIATE_EXPORT_BUFFER':
                return this.validateBufferTime(value);
            default:
                // Unknown key - allow but warn
                return {
                    valid: true,
                    warning: `Unknown config key: ${key}. No validation rules defined`
                };
        }
    }
}
