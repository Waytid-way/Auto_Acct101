const https = require('http');

const TEABLE_API_URL = 'http://localhost:3000/api';
const TEABLE_TABLE_ID = 'tblnGkVbSOBX9HCp74H';
const TEABLE_API_TOKEN = 'teable_accziQ1XR2FXHythfq6_1LZHQ+NrX7ssDMgkDMujirAsVHI';

console.log('🧪 Testing Teable Connection...\n');
console.log('Configuration:');
console.log(`  API URL: ${TEABLE_API_URL}`);
console.log(`  Table ID: ${TEABLE_TABLE_ID}`);
console.log(`  API Token: ***${TEABLE_API_TOKEN.slice(-8)}\n`);

const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}`;
const options = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${TEABLE_API_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 10000
};

console.log(`📋 Fetching table information from: ${url}\n`);

// Parse URL
const urlObj = new URL(url);
const httpOptions = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname,
    method: options.method,
    headers: options.headers,
    timeout: options.timeout
};

const req = https.request(httpOptions, (res) => {
    let data = '';

    console.log(`Response Status: ${res.statusCode}\n`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);

            if (res.statusCode === 200) {
                console.log('✅ Table fetched successfully!');
                console.log(`  Table Name: ${result.name || 'N/A'}`);
                console.log(`  Table ID: ${result.id || 'N/A'}`);
                console.log(`  Fields: ${result.fields?.length || 0}`);

                if (result.fields && result.fields.length > 0) {
                    console.log('\n  Available Fields:');
                    result.fields.forEach((field) => {
                        console.log(`    - ${field.name} (${field.type})`);
                    });
                }

                console.log('\n✅ Test passed! Teable connection is working correctly.');
                console.log('🎉 Your configuration is correct!\n');
            } else {
                console.error('❌ Test failed!');
                console.error(`  HTTP ${res.statusCode}`);
                console.error(`  Response: ${JSON.stringify(result, null, 2)}\n`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Failed to parse response!');
            console.error(`  Error: ${error.message}`);
            console.error(`  Raw response: ${data}\n`);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Request failed!');
    console.error(`  ${error.message}\n`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('\n❌ Request timed out!\n');
    req.destroy();
    process.exit(1);
});

req.end();
