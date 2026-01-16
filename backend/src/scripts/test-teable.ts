import axios from 'axios';
import config from '../config/env';

async function testTeable() {
    console.log('🧪 Testing Teable Connection...');
    console.log(`URL: ${config.TEABLE_API_URL}`);
    console.log(`Token: ${config.TEABLE_API_TOKEN?.substring(0, 10)}...`);
    console.log(`Table ID: ${config.TEABLE_TABLE_ID}`);

    const client = axios.create({
        baseURL: config.TEABLE_API_URL,
        headers: {
            Authorization: `Bearer ${config.TEABLE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });

    try {
        // 1. Check User/Me
        console.log('\n1. Checking User Identity...');
        const me = await client.get('/auth/user');
        console.log('✅ Connected as:', me.data.name, `(${me.data.email})`);

        // 2. Check Table Directly
        if (config.TEABLE_TABLE_ID) {
            console.log(`\n2. Fetching Table Details (${config.TEABLE_TABLE_ID})...`);
            const table = await client.get(`/table/${config.TEABLE_TABLE_ID}`);
            console.log('✅ Table Found:', table.data.name);
            console.log('   Description:', table.data.description);
        }

    } catch (error: any) {
        console.error('❌ Connection Failed:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            message: error.response?.data?.message || error.message
        });
    }
}

testTeable();
