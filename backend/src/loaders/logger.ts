import winston from 'winston';
import config from '@config/env';
import axios from 'axios';

const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
        }),
    ],
});

/**
 * Send critical error alerts to Discord webhook
 * Used for 5xx errors and system failures
 */
export async function sendDiscordAlert(message: string, metadata?: object): Promise<void> {
    if (!config.DISCORD_WEBHOOK_URL) return;

    try {
        // Sanitize PII: remove sensitive fields
        const sanitized = metadata ? sanitizeLogData(metadata) : {};

        // Check if running in test environment to avoid spam
        if (config.NODE_ENV === 'test') return;

        await axios.post(config.DISCORD_WEBHOOK_URL, {
            content: `🚨 **Auto-Acct Alert**\n\`\`\`${message}\`\`\``,
            embeds: [
                {
                    title: 'Error Details',
                    description: JSON.stringify(sanitized, null, 2).substring(0, 4000), // Discord limit
                    color: 0xff0000,
                    timestamp: new Date().toISOString(),
                },
            ],
        });
    } catch (error) {
        logger.error('Failed to send Discord alert', { error });
    }
}

/**
 * Remove PII from logs (PDPA compliance)
 */
function sanitizeLogData(data: object): object {
    const sanitized = { ...data };
    const sensitiveKeys = ['accountNumber', 'taxId', 'amount', 'clientId', 'password', 'token'];

    for (const key of sensitiveKeys) {
        if (key in sanitized) {
            delete sanitized[key as keyof typeof sanitized];
        }
    }

    return sanitized;
}

export default logger;
