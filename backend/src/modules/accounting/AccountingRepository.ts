import mongoose from 'mongoose';
import { CreateJournalEntryDTO } from './dtos/CreateJournalEntry.dto';

import { JournalEntryModel } from './models/JournalEntry.model';

export class AccountingRepository {
    async create(entry: CreateJournalEntryDTO, session?: mongoose.ClientSession) {
        const doc = new JournalEntryModel(entry);
        return await doc.save({ session });
    }

    async findByReference(referenceId: string) {
        return await JournalEntryModel.findOne({ 'metadata.flowAccountRecordId': referenceId });
    }

    async findByClientId(clientId: string, filter: { status?: string, startDate?: Date, endDate?: Date } = {}) {
        const query: any = { clientId };

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.startDate || filter.endDate) {
            query.date = {};
            if (filter.startDate) query.date.$gte = filter.startDate;
            if (filter.endDate) query.date.$lte = filter.endDate;
        }

        return await JournalEntryModel.find(query).sort({ date: 1 });
    }
}
