
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';
import { ExportQueueModel } from '../../modules/export/models/ExportQueue';
import { JournalEntryModel } from '../../modules/accounting/models/JournalEntry.model';
import { TeableClient } from '../../modules/teable/TeableClient';
import config from '../../config/env';

async function debugSystemStatus() {
    console.log('๐” Inspecting System Status...\n');

    await connectMongoDB();
    const teable = new TeableClient();

    try {
        // 1. Check Export Queue
        const queue = await ExportQueueModel.find().sort({ createdAt: -1 });
        console.log('๐“ [MongoDB] Export Queue:');
        if (queue.length === 0) console.log('   (Empty)');
        queue.forEach(q => {
            console.log(`   - ID: ${q._id} | Status: ${q.status} | Path: ${q.exportPath} | Entry: ${q.entryId}`);
        });

        // 2. Check Journal Entries
        const entries = await JournalEntryModel.find().sort({ date: -1 }).limit(10);
        console.log('\n๐“’ [MongoDB] Recent Journal Entries (Last 10):');
        if (entries.length === 0) console.log('   (Empty)');
        entries.forEach(e => {
            console.log(`   - ID: ${e._id} | Date: ${e.date.toISOString().split('T')[0]} | Desc: ${e.description.substring(0, 30)}... | Status: ${e.status} | Amount: ${(e.amount / 100).toFixed(2)}`);
        });

        // 3. Check Teable Records
        if (!config.TEABLE_TABLE_ID) {
            console.log('\nโ [Teable] Skipped (No Table ID configured)');
        } else {
            console.log('\n๐“ [Teable] Recent Records (Pending/Approved):');

            // Use direct Axios for Debugging to bypass private class members
            const axios = require('axios');
            try {
                const response = await axios.get(`${config.TEABLE_API_URL}/table/${config.TEABLE_TABLE_ID}/record`, {
                    headers: {
                        Authorization: `Bearer ${config.TEABLE_API_TOKEN}`
                    },
                    params: {
                        limit: 10,
                        // projection: ['Date', 'Description', 'Status', 'Journal Entry ID', 'Amount'] // Optional: Teable API specific
                    }
                });

                const records = response.data.records;

                if (records.length === 0) console.log('   (Empty)');
                records.forEach((r: any) => {
                    const f = r.fields;
                    console.log(`   - ID: ${r.id} | Date: ${f.Date} | Desc: ${f.Description} | Status: ${f.Status} | LinkedID: ${f['Journal Entry ID'] || '-'} | Amount: ${f.Amount}`);
                });
            } catch (err: any) {
                console.log(`   โ Failed to fetch Teable: ${err.message}`);
            }
        }

    } catch (error: any) {
        console.error('โ Error:', error.message);
        if (error.response) console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    } finally {
        await disconnectMongoDB();
    }
}

debugSystemStatus();
