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
}
