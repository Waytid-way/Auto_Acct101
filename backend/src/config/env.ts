import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env if not found in backend
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // fallback to local .env

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    // Discord Webhooks (3-tier alerts for Phase 3)
    DISCORD_WEBHOOK_CRITICAL: z.string().url('Invalid Discord critical webhook URL').optional(),
    DISCORD_WEBHOOK_INFO: z.string().url('Invalid Discord info webhook URL').optional(),
    DISCORD_WEBHOOK_ML: z.string().url('Invalid Discord ML webhook URL').optional(),
    // Legacy webhook (backward compatibility)
    DISCORD_WEBHOOK_URL: z.string().url('Invalid Discord webhook URL').optional(),

    // Teable Integration
    TEABLE_API_URL: z.string().url().optional(),
    TEABLE_API_TOKEN: z.string().min(1).optional(),
    TEABLE_WEBHOOK_SECRET: z.string().min(1).optional(),
    TEABLE_TABLE_ID: z.string().min(1).optional(),

    // FlowAccount OAuth
    FLOWACCOUNT_CLIENT_ID: z.string().optional(),
    FLOWACCOUNT_CLIENT_SECRET: z.string().optional(),
    FLOWACCOUNT_REDIRECT_URI: z.string().url().optional(),

    // Google Drive (Service Account)
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1).optional(),

    // Encryption
    ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 chars').optional(),
    ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),
    ENCRYPTION_IV_LENGTH: z.coerce.number().default(16),

    // Export
    EXPRESS_CHART_OF_ACCOUNTS_PATH: z.string().default('./config/chart-of-accounts.json'),

    // Phase 3: Google Gemini API (for ML fallback)
    GOOGLE_API_KEY: z.string().optional(),

    // Phase 3: Groq API (alternative AI provider)
    GROQ_API_KEY: z.string().optional(),

    // Phase 3: ML Configuration
    ML_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.80),
    ML_MODEL_PATH: z.string().default('./ml/models/category_classifier.pkl'),
    PYTHON_VENV_PATH: z.string().default('./ml/ml-env/bin/python3'),

    // Phase 7: Interactive Discord Bot
    DISCORD_BOT_TOKEN: z.string().optional(),
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_ADMIN_ROLE_ID: z.string().optional(),
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
