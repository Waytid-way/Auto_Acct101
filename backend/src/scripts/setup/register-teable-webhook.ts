import axios from 'axios';
import config from '../../config/env';

async function registerWebhook() {
    console.log('๐”— Registering Teable Webhook...');

    // Backend URL (Where Teable sends events)
    // NOTE: If using Docker, use host.docker.internal. Since local (bun run dev), localhost:4000 is fine IF Teable can reach it.
    const BACKEND_WEBHOOK_URL = `http://localhost:${config.PORT}/webhooks/teable`;

    // Teable API URL (Target)
    const TEABLE_API_WEBHOOK_URL = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}/webhook`;

    console.log(`> Target Backend URL: ${BACKEND_WEBHOOK_URL}`);
    console.log(`> Teable API Endpoint: ${TEABLE_API_WEBHOOK_URL}`);

    try {
        // 1. Check existing webhooks to avoid duplicates
        const getRes = await axios.get(TEABLE_API_WEBHOOK_URL, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });

        const existing = getRes.data.find((w: any) => w.url === BACKEND_WEBHOOK_URL);
        if (existing) {
            console.log('โ… Webhook already registered!');
            console.log('ID:', existing.webhookId);
            return;
        }

        // 2. Register
        const res = await axios.post(TEABLE_API_WEBHOOK_URL, {
            url: BACKEND_WEBHOOK_URL,
            events: ["record.update"],
            status: "active"
        }, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });

        console.log('โ… Webhook Registered Successfully!');
        console.log('Webhook ID:', res.data.webhookId);

    } catch (error: any) {
        console.error('โ Registration Failed:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

registerWebhook();
