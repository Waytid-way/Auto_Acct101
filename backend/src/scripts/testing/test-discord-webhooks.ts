import { connectMongoDB, disconnectMongoDB } from "../../loaders/mongoose.js";
import logger, { sendCriticalAlert, sendInfoLog, sendMLUpdate } from "../../loaders/logger.js";
import config from "../../config/env.js";

/**
 * Test all 3-tier Discord webhooks
 */
async function testDiscordWebhooks(): Promise<void> {
    console.log('๐งช Testing 3-Tier Discord Webhooks\n');
    console.log('='.repeat(60) + '\n');

    const results = {
        critical: false,
        info: false,
        ml: false,
    };

    try {
        // Test 1: Critical Alert
        if (config.DISCORD_WEBHOOK_CRITICAL) {
            console.log('๐”ด Testing CRITICAL webhook...');
            await sendCriticalAlert('Test Critical Alert from Phase 3 Setup', {
                test: true,
                timestamp: new Date().toISOString(),
                environment: config.NODE_ENV,
            });
            results.critical = true;
            console.log('   โ… Critical alert sent successfully\n');
        } else {
            console.log('   โ ๏ธ  DISCORD_WEBHOOK_CRITICAL not configured\n');
        }

        // Wait a bit to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Test 2: Info Log
        if (config.DISCORD_WEBHOOK_INFO) {
            console.log('๐”ต Testing INFO webhook...');
            await sendInfoLog('Test Info Log from Phase 3 Setup', {
                test: true,
                timestamp: new Date().toISOString(),
                environment: config.NODE_ENV,
            });
            results.info = true;
            console.log('   โ… Info log sent successfully\n');
        } else {
            console.log('   โ ๏ธ  DISCORD_WEBHOOK_INFO not configured\n');
        }

        // Wait a bit to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Test 3: ML Update
        if (config.DISCORD_WEBHOOK_ML) {
            console.log('๐ฃ Testing ML webhook...');
            await sendMLUpdate('Test ML Update from Phase 3 Setup', {
                test: true,
                timestamp: new Date().toISOString(),
                environment: config.NODE_ENV,
            });
            results.ml = true;
            console.log('   โ… ML update sent successfully\n');
        } else {
            console.log('   โ ๏ธ  DISCORD_WEBHOOK_ML not configured\n');
        }

        // Summary
        console.log('='.repeat(60));
        console.log('\n๐“ Test Results\n');
        console.log(`Critical Webhook: ${results.critical ? 'โ… PASSED' : 'โ NOT CONFIGURED'}`);
        console.log(`Info Webhook:     ${results.info ? 'โ… PASSED' : 'โ NOT CONFIGURED'}`);
        console.log(`ML Webhook:       ${results.ml ? 'โ… PASSED' : 'โ NOT CONFIGURED'}`);

        const allPassed = results.critical && results.info && results.ml;

        if (allPassed) {
            console.log('\n๐ All Discord webhooks are working!\n');
            logger.info('Discord webhook test: PASSED');
        } else {
            console.log('\nโ ๏ธ  Some webhooks are not configured\n');
            logger.warn('Discord webhook test: INCOMPLETE');
        }
    } catch (error) {
        console.error('\nโ Test failed:', (error as Error).message);
        logger.error('Discord webhook test failed', { error });
        process.exit(1);
    }
}

testDiscordWebhooks();
