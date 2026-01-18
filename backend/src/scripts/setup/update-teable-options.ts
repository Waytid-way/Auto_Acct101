import axios from 'axios';
import config from '../../config/env';

const FIELD_ID = 'fldUqBinbRvUYsd4W9O'; // Status Field ID found from debug

async function updateTeableOptions() {
    console.log('๐” Updating Teable Status Options...');
    const url = `${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}/field/${FIELD_ID}`;

    try {
        // 1. Get current field to preserve existing options (optional, but safer)
        const getRes = await axios.get(url, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });

        const currentChoices = getRes.data.options.choices || [];
        console.log(`> Current choices: ${currentChoices.map((c: any) => c.name).join(', ')}`);

        // 2. Define new choices
        const newChoices = [
            { name: "Pending Review", color: "yellow" },
            { name: "Approved", color: "green" },
            { name: "Rejected", color: "red" }
        ];

        // 3. Merge (avoid duplicates by name)
        const finalChoices = [...currentChoices];
        for (const nc of newChoices) {
            if (!finalChoices.find((c: any) => c.name === nc.name)) {
                finalChoices.push(nc);
            }
        }

        // 4. Update Field (Use Convert to force choice update)
        console.log(`> Updating to ${finalChoices.length} choices (using convert)...`);
        const convertUrl = `${url}/convert`;
        const updateRes = await axios.put(convertUrl, {
            type: "singleSelect",
            options: {
                choices: finalChoices
            }
        }, {
            headers: { Authorization: `Bearer ${config.TEABLE_API_TOKEN}` }
        });

        console.log(`โ… Status Options Updated Successfully! (Status: ${updateRes.status})`);
        console.log('Response:', JSON.stringify(updateRes.data, null, 2));

    } catch (error: any) {
        console.error('โ Update Failed:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

updateTeableOptions();
