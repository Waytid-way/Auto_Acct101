import mongoose from 'mongoose';
import { JournalEntryModel } from '../../modules/accounting/models/JournalEntry.model';
import { TeableClient } from '../../modules/teable/TeableClient';
import { GroqClassificationService } from '../../modules/ai/GroqClassificationService';
import config from '../../config/env';
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';

// Mock OCR Data (Raw Text from receipts) - Expanded to 20 Scenarios
const OCR_SAMPLES = [
    { vendor: "Grab Taxi", amount: 35000, desc: "Taxi to Client Meeting", rawText: "GRAB RECEIPT\nDate: 12 Jan 2026\nFrom: Sukhumvit\nTo: Silom\nAmount: 350.00 THB" },
    { vendor: "Office Depot", amount: 62000, desc: "Office Supplies", rawText: "OFFICE DEPOT\nA4 Paper, Pens\nTotal: 620.00 VAT Inc." },
    { vendor: "MK Restaurant", amount: 76187, desc: "Team Lunch", rawText: "MK RESTAURANT\nDuck Set\nTotal: 761.87" },
    { vendor: "AWS", amount: 207000, desc: "Cloud Hosting", rawText: "AWS INVOICE\nEC2, S3 Usage\nTotal: 2,070.00 THB" },
    { vendor: "Starbucks", amount: 23000, desc: "Coffee", rawText: "Starbucks Coffee\nLatte, Croissant\nTotal: 230.00" },
    { vendor: "Facebook Ads", amount: 500000, desc: "Ads Campaign Jan", rawText: "Meta Platforms Ireland\nFacebook Ads\nAmount: 5,000.00 THB" },
    { vendor: "Google Suite", amount: 45000, desc: "G-Suite Email", rawText: "Google Ireland\nG Suite Business\nAmount: 450.00" },
    { vendor: "PEA Electricity", amount: 412000, desc: "Electricity Bill", rawText: "Provincial Electricity Authority\nBill Jan 2026\nAmount: 4,120.00" },
    { vendor: "MWA Water", amount: 56000, desc: "Water Bill", rawText: "Metropolitan Waterworks\nWater Bill\nAmount: 560.00" },
    { vendor: "True Internet", amount: 89900, desc: "Office Internet", rawText: "True Corp\nFiber Internet\n899.00 THB" },
    { vendor: "Landlord Co", amount: 2500000, desc: "Office Rent", rawText: "Office Rental Invoice\nJan 2026\nAmount: 25,000.00" },
    { vendor: "Law Firm A", amount: 1500000, desc: "Contract Review", rawText: "Legal Services\nContract Review\nAmount: 15,000.00" },
    { vendor: "Fix It All", amount: 350000, desc: "AC Repair", rawText: "Air Con Maintenance\nCleaning 5 Units\nAmount: 3,500.00" },
    { vendor: "Apple Store", amount: 4500000, desc: "MacBook Pro", rawText: "Apple IconSiam\nMacBook Pro 14\nAmount: 45,000.00" },
    { vendor: "7-Eleven", amount: 12000, desc: "Snacks", rawText: "7-Eleven\nMilk, Bread\nTotal: 120.00" },
    { vendor: "Adobe", amount: 180000, desc: "Creative Cloud", rawText: "Adobe Systems\nCreative Cloud Subscription\nAmount: 1,800.00" },
    { vendor: "Zoom Video", amount: 50000, desc: "Zoom Pro", rawText: "Zoom Video Comm\nPro User\nAmount: 500.00" },
    { vendor: "Slack", amount: 30000, desc: "Slack Standard", rawText: "Slack Technologies\nStandard Plan\nAmount: 300.00" },
    { vendor: "Grab Food", amount: 45000, desc: "OT Meal", rawText: "Grab Food\nBurger King\nAmount: 450.00" },
    { vendor: "Lazada", amount: 150000, desc: "Monitor", rawText: "Lazada Marketplace\nDell Monitor\nAmount: 1,500.00" }
];

async function runSimulationWithAI() {
    console.log('๐ค– Simulating Real-World Flow with GROQ AI...');

    await connectMongoDB();

    const groqService = new GroqClassificationService();
    const teableClient = new TeableClient();
    const { GL_MAP, DEFAULT_GL } = require('../../config/gl-map');
    const tableId = config.TEABLE_TABLE_ID!;

    let i = 0;
    for (const sample of OCR_SAMPLES) {
        i++;
        console.log(`\n> [${i}/${OCR_SAMPLES.length}] Analyzing Receipt: ${sample.vendor}...`);

        try {
            // 1. AI Reasoning (Classify based on Raw Text)
            console.log(`  ๐ง  Asking AI to classify...`);
            const classification = await groqService.classifyEntry({
                description: sample.desc,
                amount: sample.amount,
                vendor: sample.vendor
            });

            console.log(`  ๐ค– AI Result: Category="${classification.category}" (Conf: ${(classification.confidence * 100).toFixed(1)}%)`);
            console.log(`  ๐“ Reasoning: ${classification.reasoning}`);

            // 2. GL Mapping
            const gl = GL_MAP[classification.category] || DEFAULT_GL;
            console.log(`  ๐“ Accounting: DR ${gl.dr} / CR ${gl.cr}`);

            // 3. Create Mongo Entry (SKIPPED in Simulation for Ingestion Test)
            // We want TeablePollingJob to create the entry from Teable data.
            // So we ONLY create in Teable first.
            /*
            const entry = await JournalEntryModel.create({ ... });
            */

            console.log(`  โณ Sending to Teable (Waiting for Polling Job to ingest)...`);

            // 4. Teable Sync
            await teableClient.createRecord(tableId, {
                fields: {
                    "Vendor": sample.vendor,
                    "Amount": sample.amount / 100,
                    "Date": new Date().toISOString().split('T')[0],
                    "Category": classification.category,
                    "VAT Amount": (sample.amount * 0.07) / 100,
                    "Confidence Score": classification.confidence * 100,
                    "Status": "Pending Review", // Real world: Needs human review!
                    "Client ID": `AI_C_${Date.now()}_${i}`,
                    // "Journal Entry ID": null, // Let Polling Job fill this!

                    // "Export Path": "Scheduled", // Real world: User chooses this after reviewling Job checks if `Journal Entry ID` exists in Teable to decide if it's new? No, it checks if Mongo has it.
                    // Actually, if we provide Journal Entry ID here, Polling Job might skip creation if logic "if entryId exists ...".
                    // Let's look at Polling logic.
                    // Polling: const entryId = record.fields['Journal Entry ID']; if (entryId) ...
                    // So if we set it here, Polling will find it and say "Already exists", but won't "Ingest" it as new.
                    // User wants to simulate "OCR -> Teable -> Mongo".

                    // CORRECT SIMULATION FOR INGESTION TEST:
                    "Journal Entry ID": null, // Let Polling Job fill this!
                    "Export Path": "Scheduled",

                    "Warnings": "None",
                    "DR Account": gl.dr,
                    "CR Account": gl.cr,
                    "DR Name": gl.drName,
                    "CR Name": gl.crName
                }
            });

            console.log(`  โ… Synced to Teable!`);

        } catch (error: any) {
            console.error(`  โ Failed: ${error.message}`);
        }

        // Delay for API limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\nโจ AI Simulation Complete! Check Teable for AI-Reasoned Data.');
    await disconnectMongoDB();
}

runSimulationWithAI();
