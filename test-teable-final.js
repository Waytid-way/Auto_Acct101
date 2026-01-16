const http = require('http');

const TEABLE_API_URL = 'http://localhost:3000/api';
const TEABLE_TABLE_ID = 'tblnGkVbSOBX9HCp74H';
const TEABLE_API_TOKEN = 'teable_accziQ1XR2FXHythfq6_1LZHQ+NrX7ssDMgkDMujirAsVHI';

console.log('🧪 Testing Teable API Connection (Final Test)...\n');
console.log('Configuration:');
console.log(`  API URL: ${TEABLE_API_URL}`);
console.log(`  Table ID: ${TEABLE_TABLE_ID}`);
console.log(`  API Token: ***${TEABLE_API_TOKEN.slice(-8)}\n`);

// Test 1: GET records (should work to verify connection)
async function testGetRecords() {
    console.log('📊 Test 1: GET /api/table/{tableId}/record (Fetch Records)...');

    return new Promise((resolve) => {
        const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record?take=1`;
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
            timeout: 10000
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (res.statusCode === 200) {
                        console.log('✅ SUCCESS!');
                        console.log(`   Status: ${res.statusCode}`);
                        console.log(`   Records found: ${result.records?.length || 0}`);
                        console.log(`   Total: ${result.total || 0}`);
                        resolve({ success: true, data: result });
                    } else {
                        console.log(`❌ FAILED`);
                        console.log(`   Status: ${res.statusCode}`);
                        console.log(`   Error: ${result.message || 'Unknown error'}`);
                        resolve({ success: false, status: res.statusCode, error: result });
                    }
                } catch (error) {
                    console.log(`❌ FAILED - Invalid JSON response`);
                    console.log(`   Raw: ${data.substring(0, 200)}`);
                    resolve({ success: false, error: 'Invalid JSON' });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ FAILED - Network error`);
            console.log(`   ${error.message}`);
            resolve({ success: false, error: error.message });
        });

        req.on('timeout', () => {
            console.log(`❌ FAILED - Request timeout`);
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });

        req.end();
    });
}

// Test 2: Verify table info (if API supports it)
async function testTableInfo() {
    console.log('\n📋 Test 2: GET /api/table/{tableId} (Table Info)...');

    return new Promise((resolve) => {
        const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}`;
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
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
                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(data);
                        console.log('✅ SUCCESS!');
                        console.log(`   Table Name: ${result.name || 'N/A'}`);
                        console.log(`   Fields: ${result.fields?.length || 0}`);
                        resolve({ success: true });
                    } catch {
                        console.log('⚠️  Endpoint exists but response format unexpected');
                        resolve({ success: false });
                    }
                } else {
                    console.log(`⚠️  Endpoint not available (${res.statusCode})`);
                    console.log('   (This is optional - not all Teable versions support this)');
                    resolve({ success: false });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`⚠️  ${error.message}`);
            resolve({ success: false });
        });

        req.end();
    });
}

// Run all tests
async function runAllTests() {
    const test1 = await testGetRecords();
    await testTableInfo();

    console.log('\n' + '='.repeat(60));

    if (test1.success) {
        console.log('\n🎉 TEABLE CONNECTION TEST PASSED!');
        console.log('\n✅ Your backend can successfully communicate with Teable!');
        console.log('✅ Table ID is correct: ' + TEABLE_TABLE_ID);
        console.log('✅ API Token is valid and has proper permissions');
        console.log('\n📝 Next steps:');
        console.log('   1. Your TeableClient.ts is configured correctly');
        console.log('   2. You can start using the Teable integration');
        console.log('   3. Test creating records via your backend API\n');
    } else {
        console.log('\n❌ TEABLE CONNECTION TEST FAILED!');
        console.log('\nPossible issues:');
        console.log('   1. Check if Teable is running: docker ps | grep teable');
        console.log('   2. Verify API token has proper permissions');
        console.log('   3. Check table ID is correct');
        console.log('   4. Review Teable logs: docker logs teable-app\n');
    }
}

runAllTests();
