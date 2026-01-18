import { groqService, ACCOUNTING_CATEGORIES } from "../../modules/ai/GroqClassificationService.js";
import logger from "../../loaders/logger.js";
import { sendMLUpdate } from "../../loaders/logger.js";

async function testGroqClassification() {
    console.log('๐งช Testing Groq AI Classification\n');
    console.log('='.repeat(60) + '\n');

    const testTransactions = [
        {
            vendor: '7-Eleven',
            amount: 12500,
            description: 'Coffee and sandwich',
        },
        {
            vendor: 'Tops Supermarket',
            amount: 35000,
            description: 'Office supplies - pens, paper',
        },
        {
            vendor: 'TOT Fiber',
            amount: 59900,
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

            const result = await groqService.classifyEntry(tx);

            console.log(`  โ… Result:`);
            console.log(`     Category: ${result.category}`);
            console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`     Reasoning: ${result.reasoning}`);
            console.log('');

            // Send to Discord
            await sendMLUpdate('Groq Classification Test', {
                vendor: tx.vendor,
                amount: `${(tx.amount / 100).toFixed(2)} THB`,
                category: result.category,
                confidence: `${(result.confidence * 100).toFixed(1)}%`,
            });

            // Small delay
            if (i < testTransactions.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        console.log('='.repeat(60));
        console.log('\n๐ Groq classification test completed!\n');
        logger.info('Groq classification test: PASSED');
    } catch (error) {
        console.error('\nโ Test failed:', (error as Error).message);
        logger.error('Groq classification test failed', { error });
        process.exit(1);
    }
}

testGroqClassification();
