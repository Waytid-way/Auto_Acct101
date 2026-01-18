import { GoogleGenerativeAI } from '@google/generative-ai';
import config from "../../config/env.js";

async function listModels() {
    console.log('๐” Listing available Gemini models...\n');

    if (!config.GOOGLE_API_KEY) {
        console.error('โ GOOGLE_API_KEY not set in .env');
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);

        // Try to list models
        console.log('Fetching models from Gemini API...\n');

        // The SDK might not have listModels, so let's try a known working model
        const testModels = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'gemini-1.0-pro',
            'models/gemini-1.5-pro',
            'models/gemini-1.5-flash',
        ];

        for (const modelName of testModels) {
            try {
                console.log(`Testing: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent('Say hello');
                const response = result.response.text();

                console.log(`  โ… WORKS! Response: ${response.substring(0, 50)}...\n`);
                console.log(`๐ Use this model: "${modelName}"\n`);
                break;
            } catch (error: any) {
                console.log(`  โ Failed: ${error.message?.substring(0, 100)}\n`);
            }
        }

    } catch (error) {
        console.error('โ Error:', (error as Error).message);
        process.exit(1);
    }
}

listModels();
