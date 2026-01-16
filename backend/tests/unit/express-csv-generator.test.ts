import { describe, test, expect } from 'bun:test';
import { ExpressCSVGenerator } from '@modules/export/ExpressCSVGenerator';

describe('Express CSV Generator', () => {
    // Use a relative path or mock loading? 
    // For unit test simplicity, we should mock or ensure the config file exists.
    // The generator reads from FS in constructor.
    // We can point to the real config file for this test since we created it.
    const configPath = './config/chart-of-accounts.json';

    test('generates CSV with UTF-8 BOM and correct mapping', () => {
        const generator = new ExpressCSVGenerator(configPath);

        const mockEntries = [
            {
                _id: '507f1f77bcf86cd799439011',
                date: new Date('2026-01-16'),
                accountCode: '5110', // Electricity
                description: 'ค่าไฟฟ้า ม.ค. 2026',
                amount: 150000, // 1500 THB in satang
                type: 'debit',
                approvedBy: 'admin',
            },
            {
                _id: '507f1f77bcf86cd799439012',
                date: new Date('2026-01-16'),
                accountCode: '4100', // Sales Revenue
                description: 'ขายสินค้า A',
                amount: 500000, // 5000 THB
                type: 'credit',
                createdBy: 'sales',
            }
        ];

        // Cast partial mock to IJournalEntry
        const csv = generator.generate(mockEntries as any);

        // Check BOM
        expect(csv.startsWith('\uFEFF')).toBe(true);

        // Check Header
        expect(csv).toContain('วันที่,เลขที่เอกสาร,คำอธิบาย,รหัสบัญชี,ชื่อบัญชี,เดบิต,เครดิต,ผู้บันทึก');

        // Check Row 1 (Expense / Debit)
        expect(csv).toContain('2026-01-16');
        expect(csv).toContain('"ค่าไฟฟ้า ม.ค. 2026"');
        expect(csv).toContain('5110'); // Express Code
        expect(csv).toContain('"ค่าไฟฟ้า"'); // Express Name
        expect(csv).toContain('1500.00'); // Debit
        expect(csv).toContain('0.00'); // Credit (should appear in debit or credit col?)
        // Our logic: 
        // const debit = type === 'debit' ? format(amount) : '0.00';
        // const credit = type === 'credit' ? format(amount) : '0.00';
        // Row: ..., debit, credit, ...
        // So 1500.00,0.00

        // Check Row 2 (Revenue / Credit)
        expect(csv).toContain('4100');
        expect(csv).toContain('"รายได้จากการขาย"');
        // 0.00,5000.00
        expect(csv).toContain('0.00,5000.00');
    });

    test('throws error for missing account mapping', () => {
        const generator = new ExpressCSVGenerator(configPath);
        const mockEntries = [{ accountCode: '9999', amount: 0, type: 'debit', date: new Date(), description: '', _id: '1', createdBy: 'me' }];
        expect(() => generator.generate(mockEntries as any)).toThrow();
    });
});
