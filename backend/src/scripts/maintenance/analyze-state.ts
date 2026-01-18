
import { connectMongoDB, disconnectMongoDB } from '../../loaders/mongoose';
import { JournalEntryModel } from '../../modules/accounting/models/JournalEntry.model';
import { ExportQueueModel } from '../../modules/export/models/ExportQueue';

async function analyzeState() {
    console.log('๐” Analyzing System State...');

    await connectMongoDB();

    try {
        // 1. Journal Entry Analysis
        const totalEntries = await JournalEntryModel.countDocuments({});
        const entriesBySource = await JournalEntryModel.aggregate([
            { $group: { _id: "$source", count: { $sum: 1 } } }
        ]);

        console.log(`\n๐“ Journal Entries: ${totalEntries}`);
        console.log('   By Source:', entriesBySource);

        // 2. Export Queue Analysis
        const totalQueue = await ExportQueueModel.countDocuments({});

        // Group by Status and ExportPath
        const queueStats = await ExportQueueModel.aggregate([
            {
                $group: {
                    _id: { status: "$status", exportPath: "$exportPath" },
                    count: { $sum: 1 },
                    examples: { $push: "$entryId" }
                }
            }
        ]);

        console.log(`\n๐“ฌ Export Queue: ${totalQueue}`);
        queueStats.forEach(stat => {
            console.log(`   [${stat._id.status.toUpperCase()}] Path: ${stat._id.exportPath} | Count: ${stat.count}`);
        });

        // 3. Detailed look at "Completed" items
        const completed = await ExportQueueModel.find({ status: 'completed' }).limit(5);
        if (completed.length > 0) {
            console.log('\nโ… Recent Completed Examples:');
            completed.forEach(q => {
                console.log(`   - ID: ${q._id} | Path: ${q.exportPath} | Metadata: ${JSON.stringify(q.metadata)}`);
            });
        }

        // 4. Detailed look at "Queued" items (Why weren't they picked up?)
        const queued = await ExportQueueModel.find({ status: 'queued' }).limit(10);
        if (queued.length > 0) {
            console.log('\nโณ Pending Queued items details:');
            queued.forEach(q => {
                console.log(`   - ID: ${q._id} | Path: ${q.exportPath} | ScheduledFor: ${q.scheduledFor}`);
            });
        } else {
            console.log('\nโณ No items currently in "queued" status.');
        }

    } catch (error) {
        console.error('โ Analysis failed:', error);
    } finally {
        await disconnectMongoDB();
    }
}

analyzeState();
