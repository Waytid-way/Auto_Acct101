import { sendCriticalAlert, sendInfoLog, sendMLUpdate } from '../../loaders/logger';

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runStressTest() {
    console.log('๐”” Starting Discord Bot Stress Test (3 Rounds)...');

    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- Round ${i} ---`);

        // 1. Critical Bot
        console.log(`[Round ${i}] Sending Critical Alert...`);
        try {
            await sendCriticalAlert(`TEST: Critical Round ${i}`, {
                source: 'StressTest',
                attempt: i,
                status: 'Testing'
            });
            console.log('โ… Critical Sent');
        } catch (error) {
            console.error('โ Critical Failed:', error);
        }

        await delay(1000); // 1s delay to prevent rate limit

        // 2. Info Bot
        console.log(`[Round ${i}] Sending Info Log...`);
        try {
            await sendInfoLog(`TEST: Info Round ${i}`, {
                category: 'StressTest',
                round: i,
                description: 'This is a test message for Info Bot'
            });
            console.log('โ… Info Sent');
        } catch (error) {
            console.error('โ Info Failed:', error);
        }

        await delay(1000);

        // 3. ML Bot
        console.log(`[Round ${i}] Sending ML Log...`);
        try {
            // Check if sendMlLog is available (it might be named differently)
            // Based on assumption, if not found, we will catch error.
            // But let's assume it exists or use logger.info('ML ...') if routed?
            // Checking logger.ts usually exposes explicit functions.
            // If previous view_file confirms sendMlLog, we use it. 
            // If not, I will update this script after viewing file.
            // For now, I'll assume sendMlLog exists based on .env config.
            await sendMLUpdate(`TEST: ML Round ${i}`, {
                model: 'TestModel',
                confidence: 0.99,
                prediction: 'TestCategory'
            });
            console.log('โ… ML Sent');
        } catch (error) {
            console.error('โ ML Failed:', error);
        }

        await delay(2000); // Pause between rounds
    }

    console.log('\nโจ Stress Test Complete!');
    process.exit(0);
}

// Mock global logger if needed (logger.ts might depend on it?)
// Usually logger.ts EXPORTS the logger, so it's fine.

runStressTest();
