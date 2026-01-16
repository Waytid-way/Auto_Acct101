const http = require('http');
const fs = require('fs');
const path = require('path');

// Read .env file directly
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const TEABLE_API_URL = env.TEABLE_API_URL || 'http://localhost:3000/api';
const TEABLE_TABLE_ID = env.TEABLE_TABLE_ID;
const TEABLE_API_TOKEN = env.TEABLE_API_TOKEN;

console.log('🧪 Testing Teable API Connection (Fresh Test)...\n');
console.log('Configuration:');
console.log(`  API URL: ${TEABLE_API_URL}`);
console.log(`  Table ID: ${TEABLE_TABLE_ID}`);
console.log(`  API Token: ${TEABLE_API_TOKEN ? '***' + TEABLE_API_TOKEN.slice(-12) : 'MISSING'}\n`);

if (!TEABLE_API_TOKEN || !TEABLE_TABLE_ID) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
}

// Test GET records
async function testGetRecords() {
    console.log('📊 Test: GET /api/table/{tableId}/record...');

    return new Promise((resolve) => {
        const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record?take=3`;
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
                console.log(`Response Status: ${res.statusCode}\n`);

                try {
                    const result = JSON.parse(data);

                    if (res.statusCode === 200) {
                        console.log('✅ SUCCESS! Connection is working!\n');
                        console.log('Response Summary:');
                        console.log(`  • Total records: ${result.total || 0}`);
                        console.log(`  • Records returned: ${result.records?.length || 0}`);

                        if (result.records && result.records.length > 0) {
                            console.log('\nSample Record:');
                            const sample = result.records[0];
                            console.log(`  • Record ID: ${sample.id}`);
                            console.log(`  • Fields: ${Object.keys(sample.fields || {}).length}`);
                            if (sample.fields) {
                                console.log('  • Field names:', Object.keys(sample.fields).join(', '));
                            }
                        }

                        console.log('\n' + '='.repeat(60));
                        console.log('🎉 TEABLE API CONNECTION SUCCESSFUL!');
                        console.log('='.repeat(60));
                        console.log('\n✅ Your backend can now communicate with Teable!');
                        console.log('✅ API Token is valid and working');
                        console.log('✅ Table ID is correct\n');

                        resolve({ success: true, data: result });
                    } else {
                        console.log('❌ FAILED\n');
                        console.log('Error Details:');
                        console.log(`  Status: ${res.statusCode}`);
                        console.log(`  Message: ${result.message || 'Unknown error'}`);
                        console.log(`  Code: ${result.code || 'N/A'}`);

                        if (res.statusCode === 401 || res.statusCode === 403) {
                            console.log('\n⚠️  Authentication/Authorization issue:');
                            console.log('   • Token may be invalid or expired');
                            console.log('   • Token may not have required permissions');
                            console.log('   • Generate a new token from Teable UI');
                        } else if (res.statusCode === 500) {
                            console.log('\n⚠️  Server error - check Teable logs:');
                            console.log('   docker logs auto_acct_teable --tail 20');
                        }

                        resolve({ success: false, status: res.statusCode, error: result });
                    }
                } catch (error) {
                    console.log('❌ Invalid JSON response');
                    console.log(`Raw response: ${data.substring(0, 300)}\n`);
                    resolve({ success: false, error: 'Invalid JSON' });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ Network error: ${error.message}\n`);
            resolve({ success: false, error: error.message });
        });

        req.on('timeout', () => {
            console.log('❌ Request timeout\n');
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });

        req.end();
    });
}

testGetRecords();
