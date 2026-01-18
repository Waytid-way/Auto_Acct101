import axios from 'axios';
import config from "../../config/env";
import logger from "../../loaders/logger";

async function setupTeable() {
    if (!config.TEABLE_API_TOKEN) {
        console.error('โ TEABLE_API_TOKEN is missing in .env');
        process.exit(1);
    }

    const client = axios.create({
        baseURL: config.TEABLE_API_URL || 'http://localhost:3000/api',
        headers: {
            Authorization: `Bearer ${config.TEABLE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });

    try {
        console.log('๐” Connecting to Teable...');

        // 1 & 2. Use Hardcoded Space and Base (Created via UI)
        const spaceId = 'spcmL7ztz5OPHKm4vFd';
        const baseId = 'bseI4ENer6KleVeAdTn';
        console.log(`Using existing Space: ${spaceId}`);
        console.log(`Using existing Base: ${baseId}`);

        // 3. Use Hardcoded Table (Created via UI)
        const tableId = 'tblnGkVbSOBX9HCp74H';
        console.log(`Using existing Table: ${tableId}`);

        // Verifying table access
        try {
            await client.get(`/table/${tableId}`);
            console.log(`โ… Table Access Verified: ${tableId}`);
        } catch (e: any) {
            console.error(`โ ๏ธ Could not verify table access. Check token scopes: ${e.message}`);
        }

        console.log('\n๐ Setup Complete!');
        console.log('Please add the following to your .env file:');
        console.log('----------------------------------------');
        console.log(`TEABLE_TABLE_ID=${tableId}`);
        console.log('----------------------------------------');

    } catch (error: any) {
        console.error('โ Setup failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

setupTeable();
