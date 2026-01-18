import axios from 'axios';
import config from '../../config/env';

async function clearTeableTable() {
    console.log('๐งน Clearing Teable Table...');
    const url = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}`;
    const token = config.TEABLE_API_TOKEN;

    try {
        // 1. Fetch All Records (just IDs)
        console.log('๐” Fetching records to delete...');
        const res = await axios.get(`${url}/record`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { projection: ['id'] } // Only need IDs
        });

        const records = res.data.records;
        if (!records || records.length === 0) {
            console.log('โ… Table is already empty.');
            return;
        }

        const ids = records.map((r: any) => r.id);
        console.log(`> Found ${ids.length} records.`);

        // 2. Delete in batches (Teable might support bulk delete)
        // Check API: DELETE /table/{tableId}/record?recordIds=...

        console.log(`๐—‘๏ธ Deleting ${ids.length} records...`);

        // Batch size safe limit (e.g. 50)
        const batchSize = 50;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            await axios.delete(`${url}/record`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { recordIds: batch } // params serializer might be needed for arrays
            });
            console.log(`   Deleted batch ${i / batchSize + 1}...`);
        }

        console.log('โ… All records cleared successfully!');

    } catch (error: any) {
        console.error('โ Clear Failed:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

clearTeableTable();
