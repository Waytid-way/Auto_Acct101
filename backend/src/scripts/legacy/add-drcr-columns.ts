import axios from 'axios';
import config from '../../config/env';

async function addAccountColumns() {
    console.log('๐—๏ธ Adding DR/CR Account Columns to Teable...');
    const url = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}/field`;
    const headers = { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` };

    const columns = [
        { name: "DR Account", type: "singleLineText" },
        { name: "CR Account", type: "singleLineText" },
        { name: "DR Name", type: "singleLineText" }, // Friendly Name
        { name: "CR Name", type: "singleLineText" }
    ];

    for (const col of columns) {
        try {
            await axios.post(url, col, { headers });
            console.log(`โ… Created Column: ${col.name}`);
        } catch (error: any) {
            console.log(`โ ๏ธ  Skipped/Failed ${col.name}: ${error.response?.data?.message || error.message}`);
        }
    }
}

addAccountColumns();
