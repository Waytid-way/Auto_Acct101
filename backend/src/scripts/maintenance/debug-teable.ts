import axios from 'axios';
import config from '../../config/env';

async function debugTeable() {
    console.log('๐ Debugging Teable Metadata...');
    const url = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}/field`;
    console.log(`URL: ${url}`);

    try {
        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });
        console.log('โ… Status:', res.status);
        console.log('๐“ฆ Fields:', JSON.stringify(res.data, null, 2));
    } catch (error: any) {
        console.error('โ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugTeable();
