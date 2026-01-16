/**
 * Teable API Test Script v2
 * ทดสอบการอ่าน/เขียนข้อมูลจาก Teable
 * 
 * Using proper Teable API endpoints
 */

// ตั้งค่าจาก .env
const TEABLE_BASE_URL = 'http://localhost:3000';
const TEABLE_API_TOKEN = 'teable_accziQ1XR2FXHythfq6_1LZHQ+NrX7ssDMgkDMujirAsVHI';
const TEABLE_TABLE_ID = 'tblnGkVbSOBX9HCp74H';

// ฟังก์ชันสำหรับเรียก Teable API
async function teableRequest(endpoint, options = {}) {
    const url = `${TEABLE_BASE_URL}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${TEABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    console.log(`\n📡 Request: ${options.method || 'GET'} ${url}`);
    if (options.body) {
        console.log(`   Body:`, JSON.stringify(JSON.parse(options.body), null, 2).split('\n').map((l, i) => i === 0 ? l : `        ${l}`).join('\n'));
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            console.error(`❌ Error ${response.status}: ${response.statusText}`);
            console.error('   Response:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
            return { success: false, status: response.status, data };
        }

        console.log(`✅ Success ${response.status}`);
        return { success: true, status: response.status, data };
    } catch (error) {
        console.error(`❌ Request failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// 1. ทดสอบการอ่านข้อมูลจากตาราง (GET Records)
async function testReadRecords() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TEST 1: อ่านข้อมูลจากตาราง');
    console.log('='.repeat(60));

    // Try different endpoint patterns
    const endpoints = [
        `/api/table/${TEABLE_TABLE_ID}/record`,
        `/api/v1/table/${TEABLE_TABLE_ID}/record`,
        `/api/table/${TEABLE_TABLE_ID}/records`,
    ];

    for (const endpoint of endpoints) {
        console.log(`\n🔄 ลอง endpoint: ${endpoint}`);
        const result = await teableRequest(endpoint);

        if (result.success) {
            console.log('\n📊 ข้อมูลที่อ่านได้:');
            if (result.data.records && Array.isArray(result.data.records)) {
                console.log(`   จำนวนแถว: ${result.data.records.length} แถว`);
                if (result.data.records.length > 0) {
                    console.log('\n   ตัวอย่าง 2 แถวแรก:');
                    result.data.records.slice(0, 2).forEach((record, index) => {
                        console.log(`   [${index + 1}]`, JSON.stringify(record, null, 2).split('\n').map((l, i) => i === 0 ? l : `      ${l}`).join('\n'));
                    });
                }
            } else {
                console.log('   Data:', JSON.stringify(result.data, null, 2));
            }
            return result;
        }
    }

    return { success: false, error: 'All endpoints failed' };
}

// 2. ทดสอบการเขียนข้อมูลลงในตาราง (POST Record)
async function testCreateRecord() {
    console.log('\n' + '='.repeat(60));
    console.log('✏️  TEST 2: เพิ่มข้อมูลทดสอบลงในตาราง');
    console.log('='.repeat(60));

    // สร้างข้อมูลทดสอบในรูปแบบต่างๆ
    const testDataFormats = [
        {
            name: 'Format 1: records array',
            data: {
                records: [{
                    fields: {
                        'clientId': 'TEST-001',
                        'journalEntryId': `TEST-${Date.now()}`,
                        'date': new Date().toISOString().split('T')[0],
                        'vendor': 'ร้านทดสอบ',
                        'amount': 10000,
                        'category': 'office_supplies',
                        'status': 'pending'
                    }
                }]
            }
        },
        {
            name: 'Format 2: single record',
            data: {
                fields: {
                    'clientId': 'TEST-002',
                    'journalEntryId': `TEST-${Date.now() + 1}`,
                    'date': new Date().toISOString().split('T')[0],
                    'vendor': 'ร้านทดสอบ 2',
                    'amount': 20000,
                    'category': 'utilities',
                    'status': 'pending'
                }
            }
        }
    ];

    const endpoints = [
        `/api/table/${TEABLE_TABLE_ID}/record`,
        `/api/v1/table/${TEABLE_TABLE_ID}/record`
    ];

    for (const endpoint of endpoints) {
        for (const format of testDataFormats) {
            console.log(`\n🔄 ลอง ${format.name} กับ endpoint: ${endpoint}`);

            const result = await teableRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(format.data)
            });

            if (result.success) {
                console.log('\n✅ เพิ่มข้อมูลสำเร็จ!');
                console.log('   Response:', JSON.stringify(result.data, null, 2));
                return result;
            }
        }
    }

    return { success: false, error: 'All create attempts failed' };
}

// 3. ทดสอบการดึงข้อมูล Table Schema
async function testGetTableSchema() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 3: ดึงข้อมูล Schema ของตาราง');
    console.log('='.repeat(60));

    const endpoints = [
        `/api/table/${TEABLE_TABLE_ID}`,
        `/api/v1/table/${TEABLE_TABLE_ID}`,
    ];

    for (const endpoint of endpoints) {
        console.log(`\n🔄 ลอง endpoint: ${endpoint}`);
        const result = await teableRequest(endpoint);

        if (result.success) {
            console.log('\n📐 ข้อมูล Schema:');
            if (result.data.fields && Array.isArray(result.data.fields)) {
                console.log(`   จำนวน Fields: ${result.data.fields.length}`);
                console.log('\n   รายการ Fields:');
                result.data.fields.forEach((field, index) => {
                    console.log(`   [${index + 1}] ${field.name} (Type: ${field.type})`);
                });
            } else {
                console.log('   Data:', JSON.stringify(result.data, null, 2));
            }
            return result;
        }
    }

    return { success: false, error: 'All endpoints failed' };
}

// รันการทดสอบทั้งหมด
async function runAllTests() {
    console.log('\n🚀 เริ่มการทดสอบ Teable API');
    console.log('⏰ เวลา:', new Date().toLocaleString('th-TH'));
    console.log('🔗 Base URL:', TEABLE_BASE_URL);
    console.log('📊 Table ID:', TEABLE_TABLE_ID);
    console.log('🔑 Token:', `${TEABLE_API_TOKEN.substring(0, 20)}...`);

    const results = {
        schema: await testGetTableSchema(),
        read: await testReadRecords(),
        write: await testCreateRecord()
    };

    // สรุปผลการทดสอบ
    console.log('\n' + '='.repeat(60));
    console.log('📊 สรุปผลการทดสอบ');
    console.log('='.repeat(60));
    console.log(`${results.schema.success ? '✅' : '❌'} อ่าน Schema: ${results.schema.success ? 'สำเร็จ' : 'ล้มเหลว'}`);
    console.log(`${results.read.success ? '✅' : '❌'} อ่านข้อมูล: ${results.read.success ? 'สำเร็จ' : 'ล้มเหลว'}`);
    console.log(`${results.write.success ? '✅' : '❌'} เขียนข้อมูล: ${results.write.success ? 'สำเร็จ' : 'ล้มเหลว'}`);

    const allSuccess = results.schema.success && results.read.success && results.write.success;

    console.log('\n' + '='.repeat(60));
    if (allSuccess) {
        console.log('🎉 ผลการทดสอบ: ผ่านทุกข้อ!');
    } else {
        console.log('⚠️  ผลการทดสอบ: มีข้อทดสอบล้มเหลว');
        console.log('\n💡 แนะนำ:');
        console.log('   1. ตรวจสอบว่า Teable service รันอยู่ที่ localhost:3000');
        console.log('   2. ตรวจสอบ API Token ว่ายังใช้งานได้');
        console.log('   3. ตรวจสอบ Table ID ว่าถูกต้อง');
        console.log('   4. ดูเอกสาร Teable API ที่ https://help.teable.io/developer/api');
    }
    console.log('='.repeat(60) + '\n');
}

// เรียกใช้งาน
runAllTests().catch(console.error);
