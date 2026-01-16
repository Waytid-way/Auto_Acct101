import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env if not found in backend
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // fallback to local .env

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('4000'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    DISCORD_WEBHOOK_URL: z.string().url('Invalid Discord webhook URL').optional(),

    TEABLE_API_URL: z.string().url().optional(),
    TEABLE_API_TOKEN: z.string().min(1).optional(),
    TEABLE_WEBHOOK_SECRET: z.string().min(1).optional(),

    FLOWACCOUNT_CLIENT_ID: z.string().optional(),
    FLOWACCOUNT_CLIENT_SECRET: z.string().optional(),
    FLOWACCOUNT_REDIRECT_URI: z.string().url().optional(),

    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1).optional(),

    ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 chars').optional(),
    ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),
    ENCRYPTION_IV_LENGTH: z.string().transform(Number).default('16'),

    // FlowAccount
    FLOWACCOUNT_CLIENT_ID: z.string().min(1, 'FlowAccount Client ID required'),
    FLOWACCOUNT_CLIENT_SECRET: z.string().min(1, 'FlowAccount Client Secret required'),
    FLOWACCOUNT_REDIRECT_URI: z.string().url('Invalid FlowAccount redirect URI'),

    // Export
    EXPRESS_CHART_OF_ACCOUNTS_PATH: z.string().default('./config/chart-of-accounts.json'),
});

export type Env = z.infer<typeof envSchema>;

let config: Env;

try {
    config = envSchema.parse(process.env);
} catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
}

export default Object.freeze(config);
