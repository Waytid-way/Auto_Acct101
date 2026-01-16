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
 * Send CRITICAL alert (@everyone mention) for system failures
 * Use for: 5xx errors, database failures, critical system issues
 */
export async function sendCriticalAlert(message: string, metadata?: object): Promise<void> {
    if (!config.DISCORD_WEBHOOK_CRITICAL) {
        logger.warn('DISCORD_WEBHOOK_CRITICAL not configured');
        return;
    }

    try {
        const sanitized = metadata ? sanitizeLogData(metadata) : {};

        // Check if running in test environment
        if (config.NODE_ENV === 'test') return;

        await axios.post(config.DISCORD_WEBHOOK_CRITICAL, {
            content: `@everyone 🚨 **CRITICAL ALERT**`,
            embeds: [
                {
                    title: message,
                    description: '```json\n' + JSON.stringify(sanitized, null, 2) + '\n```',
                    color: 15158332, // Red
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Auto-Acct-001 Critical Alert System',
                    },
                },
            ],
        });

        logger.info('Critical alert sent to Discord', { message });
    } catch (error) {
        logger.error('Failed to send critical alert', { error });
    }
}

/**
 * Send INFO log (no mention) for general system updates
 * Use for: successful operations, status updates, general info
 */
export async function sendInfoLog(message: string, metadata?: object): Promise<void> {
    if (!config.DISCORD_WEBHOOK_INFO) {
        logger.warn('DISCORD_WEBHOOK_INFO not configured');
        return;
    }

    try {
        const sanitized = metadata ? sanitizeLogData(metadata) : {};

        // Check if running in test environment
        if (config.NODE_ENV === 'test') return;

        await axios.post(config.DISCORD_WEBHOOK_INFO, {
            content: `ℹ️ **Info Update**`,
            embeds: [
                {
                    title: message,
                    description: '```json\n' + JSON.stringify(sanitized, null, 2) + '\n```',
                    color: 3447003, // Blue
                    timestamp: new Date().toISOString(),
                },
            ],
        });

        logger.info('Info log sent to Discord', { message });
    } catch (error) {
        logger.error('Failed to send info log', { error });
    }
}

/**
 * Send ML update for AI/ML pipeline events
 * Use for: ML training, classification results, model updates
 */
export async function sendMLUpdate(message: string, metadata?: object): Promise<void> {
    if (!config.DISCORD_WEBHOOK_ML) {
        logger.warn('DISCORD_WEBHOOK_ML not configured');
        return;
    }

    try {
        const sanitized = metadata ? sanitizeLogData(metadata) : {};

        // Check if running in test environment
        if (config.NODE_ENV === 'test') return;

        await axios.post(config.DISCORD_WEBHOOK_ML, {
            content: `🤖 **ML System Update**`,
            embeds: [
                {
                    title: message,
                    description: '```json\n' + JSON.stringify(sanitized, null, 2) + '\n```',
                    color: 10181046, // Purple
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Auto-Acct ML Pipeline',
                    },
                },
            ],
        });

        logger.info('ML update sent to Discord', { message });
    } catch (error) {
        logger.error('Failed to send ML update', { error });
    }
}

/**
 * Backward compatibility: keep old function
 * @deprecated Use sendCriticalAlert, sendInfoLog, or sendMLUpdate instead
 */
export async function sendDiscordAlert(message: string, metadata?: object): Promise<void> {
    // Fallback to legacy webhook or INFO channel
    if (config.DISCORD_WEBHOOK_URL) {
        try {
            const sanitized = metadata ? sanitizeLogData(metadata) : {};
            if (config.NODE_ENV === 'test') return;

            await axios.post(config.DISCORD_WEBHOOK_URL, {
                content: `🚨 **Auto-Acct Alert**\n\`\`\`${message}\`\`\``,
                embeds: [
                    {
                        title: 'Error Details',
                        description: JSON.stringify(sanitized, null, 2).substring(0, 4000),
                        color: 0xff0000,
                        timestamp: new Date().toISOString(),
                    },
                ],
            });
        } catch (error) {
            logger.error('Failed to send Discord alert', { error });
        }
    } else {
        // Default to INFO channel for backward compatibility
        await sendInfoLog(message, metadata);
    }
}

/**
 * Remove PII from logs (PDPA compliance)
 * Enhanced for Phase 3 with additional sensitive fields
 */
function sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveKeys = [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'secret',
        'apiKey',
        'accountNumber',
        'taxId',
        'amount', // PII for accounting
        'clientId',
        'email',
        'phone',
    ];

    for (const key of sensitiveKeys) {
        if (key in sanitized) {
            delete sanitized[key];
        }
    }

    return sanitized;
}

export default logger;
