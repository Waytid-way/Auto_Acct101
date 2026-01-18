import { geminiService, ACCOUNTING_CATEGORIES } from "../../modules/gemini/GeminiClassificationService.js";
import logger from "../../loaders/logger.js";
import { sendMLUpdate } from "../../loaders/logger.js";

/**
 * Test Gemini classification with sample transactions
 */
async function testGeminiClassification() {
    console.log('๐งช Testing Gemini AI Classification\n');
    console.log('='.repeat(60) + '\n');

    const testTransactions = [
        {
            vendor: '7-Eleven',
            amount: 12500, // 125.00 THB
            description: 'Coffee and sandwich',
        },
        {
            vendor: 'Tops Supermarket',
            amount: 35000, // 350.00 THB
            description: 'Office supplies - pens, paper',
        },
        {
            vendor: 'TOT Fiber',
            amount: 59900, // 599.00 THB
            description: 'Internet monthly fee',
        },
    ];

    try {
        console.log('๐“ Available Categories:');
        Object.entries(ACCOUNTING_CATEGORIES).forEach(([key, value]) => {
            console.log(`  โ€ข ${value}`);
        });
        console.log('');

        for (let i = 0; i < testTransactions.length; i++) {
            const tx = testTransactions[i];
            console.log(`Test ${i + 1}/${testTransactions.length}:`);
            console.log(`  Vendor: ${tx.vendor}`);
            console.log(`  Amount: ${(tx.amount / 100).toFixed(2)} THB`);
            console.log(`  Description: ${tx.description}`);
            console.log('  Classifying...\n');

            const result = await geminiService.classifyEntry(tx);

            console.log(`  โ… Result:`);
            console.log(`     Category: ${result.category}`);
            console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`     Reasoning: ${result.reasoning}`);
            console.log('');

            // Send to Discord ML channel
            await sendMLUpdate('Gemini Classification Test', {
                vendor: tx.vendor,
                amount: `${(tx.amount / 100).toFixed(2)} THB`,
                category: result.category,
                confidence: `${(result.confidence * 100).toFixed(1)}%`,
            });

            // Wait between requests (rate limiting)
            if (i < testTransactions.length - 1) {
                console.log('  โณ Waiting 4 seconds (rate limit)...\n');
                await new Promise((resolve) => setTimeout(resolve, 4000));
            }
        }

        console.log('='.repeat(60));
        console.log('\n๐ Gemini classification test completed!\n');
        logger.info('Gemini classification test: PASSED');
    } catch (error) {
        console.error('\nโ Test failed:', (error as Error).message);
        logger.error('Gemini classification test failed', { error });
        process.exit(1);
    }
}

testGeminiClassification();
