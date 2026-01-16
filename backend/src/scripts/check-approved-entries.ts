/**
 * Quick script to check approved journal entries count
 */
import mongoose from 'mongoose';
import config from '../config/env.js';

const JournalEntrySchema = new mongoose.Schema({
    status: String,
    // ... other fields not needed for count
}, { collection: 'journal_entries' });

const JournalEntry = mongoose.model('JournalEntry', JournalEntrySchema);

async function checkApprovedEntries() {
    try {
        console.log('🔍 Checking approved journal entries...\n');

        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const count = await JournalEntry.countDocuments({
            status: { $in: ['approved', 'posted'] },
        });

        console.log('📊 Results:');
        console.log(`  Total approved entries: ${count}`);
        console.log(`  Required for ML: 100`);
        console.log(`  Status: ${count >= 100 ? '✅ SUFFICIENT' : '⚠️  INSUFFICIENT'}\n`);

        if (count < 100) {
            console.log(`⚠️  Warning: Need ${100 - count} more approved entries for optimal ML training\n`);
        } else {
            console.log('🎉 System has enough approved entries for Phase 3 ML training!\n');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', (error as Error).message);
        process.exit(1);
    }
}

checkApprovedEntries();
