const http = require('http');

const TEABLE_API_URL = 'http://localhost:3000/api';
const TEABLE_BASE_ID = 'bseI4ENer6KleVeAdTn';
const TEABLE_TABLE_ID = 'tblnGkVbSOBX9HCp74H';
const TEABLE_API_TOKEN = 'teable_accziQ1XR2FXHythfq6_1LZHQ+NrX7ssDMgkDMujirAsVHI';

console.log('🧪 Testing Teable API Connection...\n');
console.log('Configuration:');
console.log(`  Base ID: ${TEABLE_BASE_ID}`);
console.log(`  Table ID: ${TEABLE_TABLE_ID}`);
console.log(`  API Token: ***${TEABLE_API_TOKEN.slice(-8)}\n`);

// Test multiple possible endpoint patterns
const endpoints = [
    `/table/${TEABLE_TABLE_ID}`,
    `/base/${TEABLE_BASE_ID}/table/${TEABLE_TABLE_ID}`,
    `/table/${TEABLE_TABLE_ID}/record`,
    `/base/${TEABLE_BASE_ID}/table/${TEABLE_TABLE_ID}/record`,
];

async function testEndpoint(path) {
    return new Promise((resolve) => {
        const url = `${TEABLE_API_URL}${path}`;
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEABLE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    path,
                    status: res.statusCode,
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    data: data.substring(0, 200)
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                path,
                status: 'ERROR',
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                path,
                status: 'TIMEOUT',
                success: false,
                error: 'Request timed out'
            });
        });

        req.end();
    });
}

async function runTests() {
    console.log('📋 Testing possible API endpoints...\n');

    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);

        if (result.success) {
            console.log(`✅ ${endpoint}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${result.data}\n`);
        } else {
            console.log(`❌ ${endpoint}`);
            console.log(`   Status: ${result.status}`);
            if (result.error) {
                console.log(`   Error: ${result.error}\n`);
            } else {
                console.log(`   Response: ${result.data}\n`);
            }
        }
    }

    console.log('Test completed!\n');
}

runTests();
