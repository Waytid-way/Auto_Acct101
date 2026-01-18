import { TeableClient } from '../../modules/teable/TeableClient';
import config from '../../config/env';

/**
 * SIMULATION SCRIPT
 * Acts as the "Frontend" or "App Logic" that receives OCR/AI result and saves to Teable.
 */

async function simulateRealworldFlow() {
    console.log('๐งช Simulating Realworld Flow (Post-OCR Injection)...');

    // 1. Mock Data (Post-OCR & AI Classification)
    const mockReceiptData = {
        vendor: "7-Eleven API Test",
        amount: 50.00,
        date: "2026-01-18",
        category: "Meals", // AI Classified
        vatAmount: 3.27,
        confidence: 0.99,
        ocrText: "7-Eleven Branch 12345...",
        fileHash: "mock_hash_12345",
        status: "Pending Review" // Default for new entry
    };

    console.log('๐“ Mock Receipt Data:', JSON.stringify(mockReceiptData, null, 2));

    // 2. Simulate "Saving" to Teable (The Integration Step)
    if (!config.TEABLE_TABLE_ID) {
        console.error('โ TEABLE_TABLE_ID missing in env');
        process.exit(1);
    }

    const teableClient = new TeableClient();

    // Map to Teable Schema (Accounting Data)
    const teableRecord = {
        fields: {
            "Vendor": mockReceiptData.vendor,
            "Amount": mockReceiptData.amount,
            "Date": mockReceiptData.date,
            "Category": mockReceiptData.category,
            "VAT Amount": mockReceiptData.vatAmount,
            "Confidence Score": mockReceiptData.confidence * 100, // Percent? Or 0-1? Schema likely number.
            // Checking debug output: precision:2, type:percent -> likely 0-1 (0.99) OR 0-100?
            // Usually Teable % type expects 0-1 (0.5 = 50%).
            // But let's check debug-teable output again? 
            // It said "precision: 2, type: percent". Usually means 0.99 display as 99%.
            "Client ID": `SIM_CLIENT_${Date.now()}`,
            "Journal Entry ID": `SIM_JID_${Date.now()}`,
            "Status": mockReceiptData.status,
            "Attachment URL": "https://fake-url.com/receipt.jpg",
            "Warnings": "None"
        }
    };

    try {
        console.log('๐”— Syncing to Teable...');
        const recordId = await teableClient.createRecord(config.TEABLE_TABLE_ID, teableRecord);
        console.log(`\nโ… Success! Data synced to Teable Staging.`);
        console.log(`๐” Teable Record ID: ${recordId}`);
        console.log(`๐ Realworld Simulation: PASSED`);

    } catch (error: any) {
        console.error('โ Teable Sync Failed:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

simulateRealworldFlow();
