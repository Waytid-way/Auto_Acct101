import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEABLE_API_URL = process.env.TEABLE_API_URL!;
const TEABLE_API_TOKEN = process.env.TEABLE_API_TOKEN!;
const TEABLE_TABLE_ID = process.env.TEABLE_TABLE_ID!;

async function testTeableConnection() {
    console.log('🧪 Testing Teable Connection...\n');
    console.log('Configuration:');
    console.log(`  API URL: ${TEABLE_API_URL}`);
    console.log(`  Table ID: ${TEABLE_TABLE_ID}`);
    console.log(`  API Token: ${TEABLE_API_TOKEN ? '***' + TEABLE_API_TOKEN.slice(-8) : 'MISSING'}\n`);

    try {
        // Test 1: Get table info
        console.log('📋 Test 1: Fetching table information...');
        const tableResponse = await axios.get(
            `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}`,
            {
                headers: {
                    Authorization: `Bearer ${TEABLE_API_TOKEN}`,
                },
                timeout: 10000,
            }
        );

        console.log('✅ Table fetched successfully!');
        console.log(`  Table Name: ${tableResponse.data.name || 'N/A'}`);
        console.log(`  Fields: ${tableResponse.data.fields?.length || 0}`);

        if (tableResponse.data.fields && tableResponse.data.fields.length > 0) {
            console.log('\n  Available Fields:');
            tableResponse.data.fields.forEach((field: any) => {
                console.log(`    - ${field.name} (${field.type})`);
            });
        }

        // Test 2: Get records (limited to 5)
        console.log('\n📊 Test 2: Fetching sample records...');
        const recordsResponse = await axios.get(
            `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record`,
            {
                headers: {
                    Authorization: `Bearer ${TEABLE_API_TOKEN}`,
                },
                params: {
                    take: 5,
                },
                timeout: 10000,
            }
        );

        console.log('✅ Records fetched successfully!');
        console.log(`  Total Records: ${recordsResponse.data.total || 0}`);
        console.log(`  Sample Size: ${recordsResponse.data.records?.length || 0}`);

        console.log('\n✅ All tests passed! Teable connection is working correctly.');
        console.log('🎉 Your configuration is correct!\n');

    } catch (error: any) {
        console.error('\n❌ Test failed!');

        if (error.response) {
            console.error(`  HTTP ${error.response.status}: ${error.response.statusText}`);
            console.error(`  Error: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            console.error('  No response received from server');
            console.error(`  ${error.message}`);
        } else {
            console.error(`  ${error.message}`);
        }

        process.exit(1);
    }
}

testTeableConnection();
