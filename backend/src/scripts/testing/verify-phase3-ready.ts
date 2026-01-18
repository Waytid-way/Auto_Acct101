import { connectMongoDB, disconnectMongoDB } from "../../loaders/mongoose.js";
import { JournalEntryModel as JournalEntry } from "../../modules/accounting/models/JournalEntry.model";
import logger from "../../loaders/logger.js";

async function verifyPhase3Ready(): Promise<void> {
    console.log('๐” Phase 3 Prerequisites Verification\n');
    console.log('='.repeat(60) + '\n');


    const checks = {
        mongodb: false,
        approvedEntries: 0,
        envVars: {} as Record<string, boolean>,
        containers: {} as Record<string, boolean>,
    };

    try {
        // Check 1: MongoDB Connection
        console.log('๐“ Check 1: MongoDB Connection...');
        try {
            await connectMongoDB();
            checks.mongodb = true;
            console.log('   โ… MongoDB connected\\n');
        } catch (error) {
            console.log(`   โ MongoDB connection failed: ${(error as Error).message}\\n`);
        }

        // Check 2: Approved Entries Count
        if (checks.mongodb) {
            console.log('๐“ Check 2: Training Data (Approved Entries)...');
            try {
                const count = await JournalEntry.countDocuments({
                    status: { $in: ['approved', 'posted'] },
                });
                checks.approvedEntries = count;

                if (count >= 100) {
                    console.log(`   โ… Approved entries: ${count} (sufficient for ML training)\\n`);
                } else {
                    console.log(`   โ ๏ธ  Approved entries: ${count} (recommended: >= 100)\\n`);
                }
            } catch (error) {
                console.log(`   โ Failed to count entries: ${(error as Error).message}\\n`);
            }
        }

        // Check 3: Environment Variables
        console.log('๐”ง Check 3: Environment Variables...');

        const requiredVars = {
            // Phase 1-2 (Should exist)
            MONGODB_URI: process.env.MONGODB_URI,
            FLOWACCOUNT_CLIENT_ID: process.env.FLOWACCOUNT_CLIENT_ID,
            FLOWACCOUNT_CLIENT_SECRET: process.env.FLOWACCOUNT_CLIENT_SECRET,

            // Phase 3 Discord (3-tier alerts)
            DISCORD_WEBHOOK_CRITICAL: process.env.DISCORD_WEBHOOK_CRITICAL,
            DISCORD_WEBHOOK_INFO: process.env.DISCORD_WEBHOOK_INFO,
            DISCORD_WEBHOOK_ML: process.env.DISCORD_WEBHOOK_ML,

            // Teable
            TEABLE_API_URL: process.env.TEABLE_API_URL,
            TEABLE_API_TOKEN: process.env.TEABLE_API_TOKEN,
            TEABLE_TABLE_ID: process.env.TEABLE_TABLE_ID,
            TEABLE_WEBHOOK_SECRET: process.env.TEABLE_WEBHOOK_SECRET,

            // Phase 3 ML
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
            ML_CONFIDENCE_THRESHOLD: process.env.ML_CONFIDENCE_THRESHOLD,
            ML_MODEL_PATH: process.env.ML_MODEL_PATH,
            PYTHON_VENV_PATH: process.env.PYTHON_VENV_PATH,
        };

        for (const [key, value] of Object.entries(requiredVars)) {
            checks.envVars[key] = !!value;
            const status = value ? 'โ…' : 'โ';
            const display = value
                ? key.includes('SECRET') || key.includes('TOKEN') || key.includes('KEY')
                    ? '***'
                    : value.length > 40
                        ? value.substring(0, 37) + '...'
                        : value
                : 'NOT SET';

            console.log(`   ${status} ${key}: ${display}`);
        }

        console.log('');

        // Check 4: Docker Containers
        console.log('๐ณ Check 4: Docker Containers...');
        console.log('   (Run manually: docker ps)\\n');

        // Summary
        console.log('='.repeat(60));
        console.log('\\n๐“ Summary\\n');

        const phase1Ready = checks.mongodb && checks.envVars.MONGODB_URI;
        const phase2Ready =
            checks.envVars.FLOWACCOUNT_CLIENT_ID && checks.envVars.FLOWACCOUNT_CLIENT_SECRET;
        const teableReady =
            checks.envVars.TEABLE_API_URL &&
            checks.envVars.TEABLE_API_TOKEN &&
            checks.envVars.TEABLE_TABLE_ID;
        const discordReady =
            checks.envVars.DISCORD_WEBHOOK_CRITICAL &&
            checks.envVars.DISCORD_WEBHOOK_INFO &&
            checks.envVars.DISCORD_WEBHOOK_ML;
        const mlConfigReady =
            checks.envVars.ML_CONFIDENCE_THRESHOLD &&
            checks.envVars.ML_MODEL_PATH &&
            checks.envVars.PYTHON_VENV_PATH;

        console.log(`Phase 1 (MongoDB):           ${phase1Ready ? 'โ…' : 'โ'}`);
        console.log(`Phase 2 (FlowAccount):       ${phase2Ready ? 'โ…' : 'โ'}`);
        console.log(`Teable Integration:          ${teableReady ? 'โ…' : 'โ'}`);
        console.log(`Discord Alerts (3-tier):     ${discordReady ? 'โ…' : 'โ'}`);
        console.log(`ML Configuration:            ${mlConfigReady ? 'โ…' : 'โ'}`);
        console.log(`Training Data (>= 100):      ${checks.approvedEntries >= 100 ? 'โ…' : 'โ ๏ธ '} (${checks.approvedEntries})`);
        console.log(`\\nGoogle Gemini API (optional): ${checks.envVars.GOOGLE_API_KEY ? 'โ…' : 'โ ๏ธ  NOT SET'}`);

        console.log('\n' + '='.repeat(60));

        const allReady =
            phase1Ready &&
            phase2Ready &&
            teableReady &&
            discordReady &&
            mlConfigReady &&
            checks.approvedEntries >= 100;

        if (allReady) {
            console.log('\\n๐ System is READY for Phase 3!\\n');
            logger.info('Phase 3 prerequisites check: PASSED');
        } else {
            console.log('\\nโ ๏ธ  System needs configuration before Phase 3\\n');
            console.log('Missing items:');

            if (!discordReady) {
                console.log('  โ€ข Configure 3-tier Discord webhooks');
            }
            if (!mlConfigReady) {
                console.log('  โ€ข Add ML configuration variables to .env');
            }
            if (checks.approvedEntries < 100) {
                console.log(`  โ€ข Need ${100 - checks.approvedEntries} more approved entries for ML training`);
            }
            if (!checks.envVars.GOOGLE_API_KEY) {
                console.log('  โ€ข (Optional) Generate Google Gemini API key');
            }

            console.log('');
            logger.warn('Phase 3 prerequisites check: INCOMPLETE');
        }
    } catch (error) {
        console.error('\\nโ Verification failed:', (error as Error).message);
        logger.error('Phase 3 prerequisites check failed', { error });
        process.exit(1);
    } finally {
        if (checks.mongodb) {
            await disconnectMongoDB();
        }
    }
}

verifyPhase3Ready();
