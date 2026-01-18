import axios from 'axios';
import config from '../../config/env';

// Define the required schema for Accounting Data
const REQUIRED_FIELDS = [
    { name: 'Client ID', type: 'singleLineText' },
    { name: 'Journal Entry ID', type: 'singleLineText' },
    { name: 'Date', type: 'date' },
    { name: 'Vendor', type: 'singleLineText' },
    { name: 'Amount', type: 'number', options: { formatting: { precision: 2, type: 'currency', symbol: 'เธฟ' } } },
    { name: 'Category', type: 'singleSelect', options: { choices: [{ name: 'Office Supplies' }, { name: 'Meals' }, { name: 'Transport' }] } },
    { name: 'VAT Amount', type: 'number', options: { formatting: { precision: 2, type: 'currency', symbol: 'เธฟ' } } },
    { name: 'Confidence Score', type: 'number', options: { formatting: { precision: 2, type: 'percent' } } },
    { name: 'Warnings', type: 'longText' }, // Or multipleSelect
    { name: 'Attachment URL', type: 'singleLineText' }
];

// Status field usually exists, we might need to check options
// 'Status' -> choices: 'Pending Review', 'Approved', 'Rejected'

async function setupTeableSchema() {
    console.log('๐—๏ธ Setting up Teable Schema...');
    const baseUrl = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}`;

    try {
        // 1. Get Existing Fields
        console.log('๐” Checking existing fields...');
        const existingRes = await axios.get(`${baseUrl}/field`, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });
        const existingFields: { id: string; name: string; type: string }[] = existingRes.data;
        const existingNames = new Set(existingFields.map((f) => f.name));

        console.log(`> Found ${existingFields.length} fields: ${Array.from(existingNames).join(', ')}`);

        // 2. Create Missing Fields
        for (const field of REQUIRED_FIELDS) {
            if (existingNames.has(field.name)) {
                console.log(`โ… Field "${field.name}" already exists.`);
                continue;
            }

            console.log(`โ• Creating field "${field.name}" (${field.type})...`);
            try {
                // Note: Teable API uses 'number' type for both integers and floats.
                // We specify precision=2 to imply money/decimal handling.
                // ideally, we should use integer and handle satang manually if consistency is critical.
                await axios.post(`${baseUrl}/field`, {
                    name: field.name,
                    type: field.type,
                    options: field.options
                }, {
                    headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
                });
                console.log(`   โจ Created "${field.name}"`);
            } catch (createError) {
                const message = axios.isAxiosError(createError)
                    ? createError.response?.data?.message || createError.message
                    : (createError as Error).message;
                console.error(`   โ Failed to create "${field.name}":`, message);
            }
        }

        console.log('\nโ… Schema Setup Complete!');

    } catch (error: any) {
        const msg = (error as Error).message || "Unknown error";
        console.error('โ Schema Setup Failed:', msg);
        if (axios.isAxiosError(error) && error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

setupTeableSchema();
