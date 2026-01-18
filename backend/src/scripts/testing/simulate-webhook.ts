import axios from 'axios';
import config from '../../config/env';

async function simulateWebhook() {
    console.log('๐“ก Simulating Incoming Teable Webhook (Immediate Export)...');

    const webhookUrl = `http://localhost:${config.PORT}/webhooks/teable`;

    // Payload to match TeableWebhookSchema
    // KEY FIX: Use REAL Mongo ID from Bulk Injection Step
    const payload = {
        event: "record.updated",
        data: {
            recordId: "rec_REAL_FROM_BULK_001",
            tableId: config.TEABLE_TABLE_ID || "tblnGkVbSOBX9HCp74H",
            fields: {
                status: "approved",
                exportPath: "immediate",
                entryId: "696cb47e98a065479619665a" // REAL Mongo ID
            }
        },
        timestamp: Date.now()
    };

    try {
        console.log(`> POST to ${webhookUrl}`);
        console.log(`> Payload:`, JSON.stringify(payload, null, 2));

        const res = await axios.post(webhookUrl, payload, {
            headers: {
                'X-Teable-Signature': 'mock_signature_bypass_if_dev'
            }
        });
        console.log('โ… Webhook Accepted:', res.status);
        console.log('Response:', JSON.stringify(res.data, null, 2));

    } catch (error: any) {
        console.error('โ Webhook Rejected:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

simulateWebhook();
