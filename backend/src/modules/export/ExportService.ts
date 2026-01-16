import { AccountingRepository } from '@modules/accounting/AccountingRepository';
import { ExpressCSVGenerator } from './ExpressCSVGenerator';
import config from '@config/env';
import logger from '@loaders/logger';

export class ExportService {
    private repository = new AccountingRepository();
    private csvGenerator = new ExpressCSVGenerator(
        config.EXPRESS_CHART_OF_ACCOUNTS_PATH
    );

    /**
     * Export approved entries for a client as Express CSV
     */
    async exportClientEntries(
        clientId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Buffer> {
        const entries = await this.repository.findByClientId(clientId, {
            status: 'approved',
            startDate,
            endDate,
        });

        if (entries.length === 0) {
            throw new Error('No approved entries found for export');
        }

        logger.info('Exporting entries to Express CSV', {
            clientId,
            count: entries.length,
            dateRange: { startDate, endDate },
        });

        return this.csvGenerator.generateBuffer(entries);
    }
}
