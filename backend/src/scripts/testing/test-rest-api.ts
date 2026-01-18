import axios from 'axios';
import config from "../../config/env.js";

async function testRestAPI() {
    console.log('๐งช Testing Gemini REST API Directly\n');

    const apiKey = config.GOOGLE_API_KEY;
    console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' + apiKey.slice(-4) : 'NOT SET'}\n`);

    if (!apiKey) {
        console.error('โ No API key');
        process.exit(1);
    }

    // Try v1 API (not v1beta)
    const urls = [
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    ];

    for (const url of urls) {
        try {
            console.log(`Testing: ${url.split('/models/')[1]?.split(':')[0]}...`);

            const response = await axios.post(url, {
                contents: [{
                    parts: [{
                        text: 'Say hello in Thai'
                    }]
                }]
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('โ… SUCCESS!\n');
            console.log(`Response: ${response.data.candidates[0].content.parts[0].text}\n`);
            console.log(`๐ This URL works: ${url.split('?')[0]}\n`);
            break;

        } catch (error: any) {
            console.log(`โ ${error.response?.status || error.message}\n`);
        }
    }
}

testRestAPI();
