import { IJournalEntry } from '@modules/accounting/models/JournalEntry.model';
import { formatMoney } from '../../types/money';
import fs from 'fs';
import path from 'path';

export interface ChartOfAccountsMapping {
    [internalCode: string]: {
        expressCode: string;
        expressName: string;
    };
}

export class ExpressCSVGenerator {
    private chartOfAccounts: ChartOfAccountsMapping;

    constructor(chartOfAccountsPath: string) {
        // Load chart of accounts mapping from JSON file
        // Handle relative path from cwd or absolute
        try {
            const resolvedPath = path.isAbsolute(chartOfAccountsPath)
                ? chartOfAccountsPath
                : path.resolve(process.cwd(), chartOfAccountsPath);

            const content = fs.readFileSync(resolvedPath, 'utf8');
            this.chartOfAccounts = JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to load Chart of Accounts from ${chartOfAccountsPath}: ${(error as Error).message}`);
        }
    }

    /**
     * Generate Express-compatible CSV from journal entries
     */
    generate(entries: IJournalEntry[]): string {
        const header = [
            'วันที่',           // Date
            'เลขที่เอกสาร',     // Document No
            'คำอธิบาย',         // Description
            'รหัสบัญชี',        // Account Code (Express format)
            'ชื่อบัญชี',        // Account Name
            'เดบิต',            // Debit
            'เครดิต',           // Credit
            'ผู้บันทึก',        // Created By
        ];

        const rows = entries.map((entry) => {
            const mapping = this.chartOfAccounts[entry.accountCode];

            if (!mapping) {
                // Fallback or Error? 
                // For now throw to ensure data integrity, user must update config.
                throw new Error(`No Express mapping for account code: ${entry.accountCode}`);
            }

            // Format formatMoney returns string "100.00"
            const debit = entry.type === 'debit' ? formatMoney(entry.amount) : '0.00';
            const credit = entry.type === 'credit' ? formatMoney(entry.amount) : '0.00';

            return [
                entry.date.toISOString().split('T')[0], // YYYY-MM-DD
                entry._id.toString().substring(0, 10), // Short ID as Doc No (Temporary)
                `"${entry.description.replace(/"/g, '""')}"`, // Escape quotes
                mapping.expressCode,
                `"${mapping.expressName}"`,
                debit,
                credit,
                entry.approvedBy || entry.createdBy,
            ];
        });

        // Add UTF-8 BOM for Thai language support in Excel
        const BOM = '\uFEFF';
        const csvContent = [header, ...rows]
            .map((row) => row.join(','))
            .join('\n');

        return BOM + csvContent;
    }

    /**
     * Generate CSV and return as Buffer (for download)
     */
    generateBuffer(entries: IJournalEntry[]): Buffer {
        const csv = this.generate(entries);
        return Buffer.from(csv, 'utf-8');
    }
}
