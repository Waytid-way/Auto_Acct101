import axios from 'axios';
import config from '../../config/env';

async function addExportPathColumn() {
    console.log('๐—๏ธ Adding "Export Path" Column to Teable...');
    const url = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}/field`;

    try {
        const res = await axios.post(url, {
            name: "Export Path",
            type: "singleSelect",
            options: {
                choices: [
                    { name: "Scheduled", color: "blue" },
                    { name: "Immediate", color: "red" }
                ]
            }
        }, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });

        console.log('โ… "Export Path" Column Created Successfully!');
        console.log('ID:', res.data.id);

    } catch (error: any) {
        // If it exists, we might get 400. We can try to check first, but let's see.
        console.error('โ Creation Failed:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

addExportPathColumn();
