import { connectMongoDB, disconnectMongoDB } from '../loaders/mongoose.js';
import logger, { sendCriticalAlert, sendInfoLog, sendMLUpdate } from '../loaders/logger.js';
import config from '../config/env.js';

/**
 * Test all 3-tier Discord webhooks
 */
async function testDiscordWebhooks(): Promise<void> {
    console.log('🧪 Testing 3-Tier Discord Webhooks\n');
    console.log('='.repeat(60) + '\n');

    const results = {
        critical: false,
        info: false,
        ml: false,
    };

    try {
        // Test 1: Critical Alert
        if (config.DISCORD_WEBHOOK_CRITICAL) {
            console.log('🔴 Testing CRITICAL webhook...');
            await sendCriticalAlert('Test Critical Alert from Phase 3 Setup', {
                test: true,
                timestamp: new Date().toISOString(),
                environment: config.NODE_ENV,
            });
            results.critical = true;
            console.log('   ✅ Critical alert sent successfully\n');
        } else {
            console.log('   ⚠️  DISCORD_WEBHOOK_CRITICAL not configured\n');
        }

        // Wait a bit to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Test 2: Info Log
        if (config.DISCORD_WEBHOOK_INFO) {
            console.log('🔵 Testing INFO webhook...');
            await sendInfoLog('Test Info Log from Phase 3 Setup', {
                test: true,
                timestamp: new Date().toISOString(),
                environment: config.NODE_ENV,
            });
            results.info = true;
            console.log('   ✅ Info log sent successfully\n');
        } else {
            console.log('   ⚠️  DISCORD_WEBHOOK_INFO not configured\n');
        }

        // Wait a bit to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Test 3: ML Update
        if (config.DISCORD_WEBHOOK_ML) {
            console.log('🟣 Testing ML webhook...');
            await sendMLUpdate('Test ML Update from Phase 3 Setup', {
                test: true,
                timestamp: new Date().toISOString(),
                environment: config.NODE_ENV,
            });
            results.ml = true;
            console.log('   ✅ ML update sent successfully\n');
        } else {
            console.log('   ⚠️  DISCORD_WEBHOOK_ML not configured\n');
        }

        // Summary
        console.log('='.repeat(60));
        console.log('\n📋 Test Results\n');
        console.log(`Critical Webhook: ${results.critical ? '✅ PASSED' : '❌ NOT CONFIGURED'}`);
        console.log(`Info Webhook:     ${results.info ? '✅ PASSED' : '❌ NOT CONFIGURED'}`);
        console.log(`ML Webhook:       ${results.ml ? '✅ PASSED' : '❌ NOT CONFIGURED'}`);

        const allPassed = results.critical && results.info && results.ml;

        if (allPassed) {
            console.log('\n🎉 All Discord webhooks are working!\n');
            logger.info('Discord webhook test: PASSED');
        } else {
            console.log('\n⚠️  Some webhooks are not configured\n');
            logger.warn('Discord webhook test: INCOMPLETE');
        }
    } catch (error) {
        console.error('\n❌ Test failed:', (error as Error).message);
        logger.error('Discord webhook test failed', { error });
        process.exit(1);
    }
}

testDiscordWebhooks();
