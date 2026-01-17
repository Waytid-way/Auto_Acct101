import mongoose from 'mongoose';
import { AccountingRepository } from './AccountingRepository';
import { CreateJournalEntryDTO } from './dtos/CreateJournalEntry.dto';

export class AccountingService {
    constructor(private repository: AccountingRepository) { }

    async createEntry(dto: CreateJournalEntryDTO, session?: mongoose.ClientSession) {
        // Business logic could go here
        return await this.repository.create(dto, session);
    }

    async findByReference(referenceId: string) {
        return await this.repository.findByReference(referenceId);
    }
}
