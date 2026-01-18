import mongoose from 'mongoose';
import { JournalEntryModel } from '../../modules/accounting/models/JournalEntry.model';
import { TeableClient } from '../../modules/teable/TeableClient';
import config from '../../config/env';
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';

async function simulateBulkData() {
    console.log('๐“ฆ Simulating BULK Data Injection (Mongo + Teable)...');

    if (!config.TEABLE_TABLE_ID) {
        console.error('โ TEABLE_TABLE_ID missing');
        process.exit(1);
    }

    // 1. Connect to DB
    await connectMongoDB();

    const teableClient = new TeableClient();
    const tableId = config.TEABLE_TABLE_ID;

    const vendors = ["Office Depot", "Grab Taxi", "MK Restaurant", "Amazon AWS", "Google Cloud", "Starbucks", "7-Eleven", "Adobe Creative Cloud"];
    const categories = ["Office Supplies", "Transport", "Meals", "Software", "Hosting", "Entertainment", "Miscellaneous"];

    // Import GL Map (Simulated import as we are in script)
    const { GL_MAP, DEFAULT_GL } = require('../../config/gl-map');

    console.log(`๐€ Generating 25 Randomized Records with GL Mapping...`);

    for (let i = 0; i < 25; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const amount = Math.floor(Math.random() * 500000) + 10000; // 100 - 5000 THB (in satang)
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 10)); // Last 10 days

        // GET GL MAPPING
        const gl = GL_MAP[category] || DEFAULT_GL;

        console.log(`> [${i + 1}/25] Processing inside: ${vendor} (${category}) -> DR: ${gl.dr} / CR: ${gl.cr}`);

        try {
            // A. Create in MongoDB (Mapping DR code as primary accountCode for Expense)
            const entry = await JournalEntryModel.create({
                clientId: `SIM_CLIENT_${Date.now()}_${i}`,
                date: date,
                amount: amount,
                vendor: vendor,
                category: category,
                vatAmount: Math.floor(amount * 0.07),
                type: 'debit',
                description: `${category} Expense at ${vendor}`,
                accountCode: gl.dr, // Store Expense Code
                status: 'pending',
                confidenceScore: 0.85 + (Math.random() * 0.14),
                currency: 'THB',
                metadata: {
                    source: 'simulation_bulk_25',
                    crAccount: gl.cr // Store Offset Account in metadata
                },
                createdBy: 'SIM_SCRIPT_BUSY'
            });

            const entryId = entry._id.toString();

            // B. Push to Teable
            await teableClient.createRecord(tableId, {
                fields: {
                    "Vendor": vendor,
                    "Amount": amount / 100,
                    "Date": date.toISOString().split('T')[0],
                    "Category": category,
                    "VAT Amount": (amount * 0.07) / 100,
                    "Confidence Score": (0.85 + (Math.random() * 0.14)) * 100,
                    "Status": "Pending Review",
                    "Client ID": `BULK_C_${Date.now()}_${i}`,
                    "Journal Entry ID": entryId,
                    "Warnings": "None",

                    // NEW ACCOUNTING FIELDS
                    "DR Account": gl.dr,
                    "CR Account": gl.cr,
                    "DR Name": gl.drName,
                    "CR Name": gl.crName
                }
            });
            console.log(`  โ… Synced: ${entryId}`);

        } catch (err: any) {
            console.error('  โ Failed:', err.message);
        }

        // Small delay to prevent API rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\nโจ Injection Complete! Now you can Test "Approve" in Teable.');
    await disconnectMongoDB();
}

simulateBulkData();
