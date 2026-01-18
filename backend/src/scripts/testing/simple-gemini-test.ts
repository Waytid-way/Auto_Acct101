import { GoogleGenerativeAI } from '@google/generative-ai';
import config from "../../config/env.js";

async function simpleTest() {
    console.log('๐งช Simple Gemini API Test\n');

    const apiKey = config.GOOGLE_API_KEY;
    console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' + apiKey.slice(-4) : 'NOT SET'}\n`);

    if (!apiKey) {
        console.error('โ No API key found!');
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Try the simplest possible model name
        console.log('Testing model: gemini-1.5-flash\n');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = 'Say hello in Thai';
        console.log(`Sending prompt: "${prompt}"\n`);

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        console.log('โ… SUCCESS!\n');
        console.log(`Response: ${response}\n`);
        console.log('๐ API key is working!\n');

    } catch (error: any) {
        console.error('โ FAILED\n');
        console.error('Error details:');
        console.error(`  Status: ${error.status || 'N/A'}`);
        console.error(`  Message: ${error.message}\n`);

        if (error.status === 404) {
            console.log('Trying alternative model names...\n');

            const alternatives = [
                'gemini-pro',
                'gemini-1.5-pro',
                'gemini-1.5-flash-001',
            ];

            for (const modelName of alternatives) {
                try {
                    console.log(`  Testing: ${modelName}...`);
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent('Hello');
                    console.log(`    โ… ${modelName} works!\n`);
                    break;
                } catch (err: any) {
                    console.log(`    โ ${err.message?.substring(0, 50)}`);
                }
            }
        }

        process.exit(1);
    }
}

simpleTest();
