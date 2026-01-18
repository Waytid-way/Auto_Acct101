import { TeableClient } from '../../modules/teable/TeableClient';
import config from '../../config/env';

async function testTeableUpdate() {
    console.log('๐งช Testing Teable Write Operation (Full Payload)...\n');

    if (!config.TEABLE_TABLE_ID) {
        console.error('โ Missing TEABLE_TABLE_ID in config');
        process.exit(1);
    }

    const client = new TeableClient();

    // Full Accounting Data Payload
    const dummyRecord = {
        fields: {
            "Client ID": "CLIENT_TEST_FINAL",
            "Journal Entry ID": `JID_${Date.now()}`,
            "Date": new Date().toISOString().split('T')[0],
            "Vendor": "Big C Supercenter",
            "Amount": 1500.50,
            "Category": "Office Supplies",
            "VAT Amount": 105.04,
            "Confidence Score": 0.98,
            "Warnings": "None",
            "Attachment URL": "https://drive.google.com/file/d/test-id/view",
            "Status": "Pending Review" // Assuming 'Pending Review' is NOT in choices? Or is it?
            // Note: Schema setup created 'Category' choices (Office Supplies, etc.)
            // 'Status' likely has 'To do', 'In progress', 'Done' from default template.
            // I should use 'To do' if 'Pending Review' fails, or update Status choices.
            // Let's try 'To do' first to be safe, or 'In progress'.
            // User requirement: "Staging" usually implies "To do".
        }
    };

    // ADJUST STATUS: "Pending Review" should now be valid
    dummyRecord.fields["Status"] = "Pending Review";

    try {
        console.log('๐“ Attempting to create record:', JSON.stringify(dummyRecord.fields, null, 2));

        const recordId = await client.createRecord(config.TEABLE_TABLE_ID, dummyRecord);

        console.log(`\nโ… Success! Record created in Teable.`);
        console.log(`๐” Record ID: ${recordId}`);
        console.log(`๐”— Check Teable UI to confirm.`);

    } catch (error: any) {
        console.error('\nโ Create Record Failed!');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(error.message);
        }
    }
}

testTeableUpdate();
