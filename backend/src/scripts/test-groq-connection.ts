
import config from '@config/env';
import { groqService } from '@modules/ai/GroqClassificationService';
import logger from '@loaders/logger';

async function testGroqConnection() {
    console.log('Testing Groq AI Connection...');
    console.log('API Key configured:', !!config.GROQ_API_KEY);

    if (!config.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY is missing');
        process.exit(1);
    }

    try {
        const testEntry = {
            vendor: 'Test Vendor - Grab Taxi',
            amount: 15000, // 150.00 THB
            description: 'Taxi to client meeting',
            date: new Date(),
        };

        console.log('Sending test entry:', testEntry);

        const result = await groqService.classifyEntry(testEntry);

        console.log('✅ Groq Response Received:');
        console.log(JSON.stringify(result, null, 2));

        if (result.category.includes('Transportation') || result.category.includes('เดินทาง')) {
            console.log('✅ Classification Logic Check: PASS');
        } else {
            console.warn('⚠️ Classification Logic Check: UNEXPECTED', result.category);
        }

    } catch (error) {
        console.error('❌ Groq Test Failed:', error);
    }
}

testGroqConnection();
