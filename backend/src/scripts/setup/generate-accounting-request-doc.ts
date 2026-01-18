import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
} from 'docx';
import { writeFileSync } from 'fs';

async function generateDocument() {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Header
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '๐“ เธเธญเธเธงเธฒเธกเธฃเนเธงเธกเธกเธทเธญเธเธฒเธเธ—เธตเธกเธเธฑเธเธเธต',
                                bold: true,
                                size: 36,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                    }),

                    new Paragraph({ text: '' }),

                    // Date and Subject
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เธงเธฑเธเธ—เธตเน: ', bold: true }),
                            new TextRun({ text: '17 เธกเธเธฃเธฒเธเธก 2569' }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เน€เธฃเธทเนเธญเธ: ', bold: true }),
                            new TextRun({ text: 'เธเธญเธ•เธฑเธงเธญเธขเนเธฒเธเน€เธญเธเธชเธฒเธฃเธชเธณเธซเธฃเธฑเธเธเธฑเธ’เธเธฒเธฃเธฐเธเธเธญเนเธฒเธเนเธเน€เธชเธฃเนเธเธญเธฑเธ•เนเธเธกเธฑเธ•เธด' }),
                        ],
                    }),

                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ”€'.repeat(50) })],
                    }),
                    new Paragraph({ text: '' }),

                    // Greeting
                    new Paragraph({
                        children: [new TextRun({ text: 'เธชเธงเธฑเธชเธ”เธตเธเธฃเธฑเธ/เธเนเธฐ เธ—เธตเธกเธเธฑเธเธเธต ๐' })],
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธเธ“เธฐเธเธตเนเธ—เธตเธกเธเธฑเธ’เธเธฒเธเธณเธฅเธฑเธเธชเธฃเนเธฒเธเธฃเธฐเธเธเธ—เธตเนเธเนเธงเธข ',
                            }),
                            new TextRun({
                                text: 'เธญเนเธฒเธเนเธเน€เธชเธฃเนเธเธญเธฑเธ•เนเธเธกเธฑเธ•เธด',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' เน€เธเธทเนเธญเธฅเธ”เธ เธฒเธฃเธฐเธเธฒเธเธเธตเธขเนเธเนเธญเธกเธนเธฅ',
                            }),
                        ],
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เน€เธเธทเนเธญเนเธซเนเธฃเธฐเธเธเธ—เธณเธเธฒเธเนเธ”เนเนเธกเนเธเธขเธณ',
                                bold: true,
                            }),
                            new TextRun({ text: ' เธฃเธเธเธงเธเธเธญเธเธงเธฒเธกเธเนเธงเธขเน€เธซเธฅเธทเธญเธ”เธฑเธเธเธตเนเธเธฃเธฑเธ:' }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Section 1
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ… เธชเธดเนเธเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ',
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_2,
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '1. เธ•เธฑเธงเธญเธขเนเธฒเธเนเธเน€เธชเธฃเนเธ / เนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต เธเธณเธเธงเธ 10-20 เนเธ',
                                bold: true,
                                size: 24,
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เธฃเธนเธเนเธเธเธ—เธตเนเธฃเธฑเธเนเธ”เน:', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ€ข เนเธเธฅเน PDF' })],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ€ข เธฃเธนเธเธ–เนเธฒเธข (JPG, PNG)' })],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ€ข เนเธเธฅเนเธชเนเธเธ' })],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เธเธฃเธฐเน€เธ เธ—เนเธเน€เธชเธฃเนเธเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ:', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ€ข เนเธเน€เธชเธฃเนเธเธเธฒเธเธฃเนเธฒเธเธชเธฐเธ”เธงเธเธเธทเนเธญ (เน€เธเนเธ 7-Eleven, Lotus\'s)',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ€ข เนเธเน€เธชเธฃเนเธเธเนเธฒเธญเธฒเธซเธฒเธฃ/เน€เธเธฃเธทเนเธญเธเธ”เธทเนเธก' })],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'โ€ข เนเธเน€เธชเธฃเนเธเธเนเธฒเธเนเธณ เธเนเธฒเนเธ เธเนเธฒเธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ•' }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ€ข เนเธเน€เธชเธฃเนเธเธเนเธฒเน€เธ”เธดเธเธ—เธฒเธ (เธเนเธณเธกเธฑเธ, เธ—เธตเนเธเธญเธ”เธฃเธ–, เธ—เธฒเธเธ”เนเธงเธ)',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'โ€ข เนเธเน€เธชเธฃเนเธเธเธทเนเธญเธญเธธเธเธเธฃเธ“เนเธชเธณเธเธฑเธเธเธฒเธ' }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ€ข เนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต VAT 7%' })],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'โ ๏ธ เธซเธกเธฒเธขเน€เธซเธ•เธธ:', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ€ข เธเธญเนเธเน€เธชเธฃเนเธเธเธฒเธเธเธฒเธฃเธ—เธณเธเธฒเธเธเธฃเธดเธ (เนเธกเนเนเธเนเธ•เธฑเธงเธญเธขเนเธฒเธเธเธฒเธเธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ•)',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ€ข เธ–เนเธฒเธกเธตเธเนเธญเธกเธนเธฅเธชเนเธงเธเธเธธเธเธเธฅเธ—เธตเนเนเธกเนเธญเธขเธฒเธเน€เธเธดเธ”เน€เธเธข เธชเธฒเธกเธฒเธฃเธ–เธเธตเธ”เธเนเธฒเธญเธญเธเนเธ”เนเธเธฃเธฑเธ',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ€ข เนเธกเนเธ•เนเธญเธเธเธฑเธเธงเธฅเน€เธฃเธทเนเธญเธเธเธงเธฒเธกเธชเธงเธขเธเธฒเธก โ€” เนเธเน€เธชเธฃเนเธเธ—เธตเนเธเธฑเธ เธขเธฑเธ เธซเธฃเธทเธญเน€เธเธฅเธญเน€เธฅเนเธเธเนเธญเธขเธเนเนเธเนเนเธ”เน',
                            }),
                        ],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '2. เธฃเธฒเธขเธเธทเนเธญเธฃเนเธฒเธเธเนเธฒ/เธเธฃเธดเธฉเธฑเธ—เธ—เธตเนเนเธเนเธเนเธญเธข',
                                bold: true,
                                size: 24,
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธเนเธงเธขเธฅเธดเธชเธ•เนเธเธทเนเธญเธฃเนเธฒเธเธเนเธฒเธซเธฃเธทเธญเธเธฃเธดเธฉเธฑเธ—เธ—เธตเนเน€เธซเนเธเธเนเธญเธขเน เนเธเนเธเน€เธชเธฃเนเธ เน€เธเนเธ:',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Table
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({ text: 'เธเธฃเธฐเน€เธ เธ—', bold: true }),
                                                ],
                                            }),
                                        ],
                                        width: { size: 30, type: WidthType.PERCENTAGE },
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({ text: 'เธ•เธฑเธงเธญเธขเนเธฒเธเธเธทเนเธญเธฃเนเธฒเธ', bold: true }),
                                                ],
                                            }),
                                        ],
                                        width: { size: 70, type: WidthType.PERCENTAGE },
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'เธฃเนเธฒเธเธชเธฐเธ”เธงเธเธเธทเนเธญ' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                text: '7-Eleven, FamilyMart, Lotus\'s Mini',
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'เธเธนเน€เธเธญเธฃเนเธกเธฒเธฃเนเน€เธเนเธ•' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({ text: 'Tops, Big C, Makro' }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'เธเนเธฒเธชเธฒเธเธฒเธฃเธ“เธนเธเนเธ เธ' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                text: 'เธเธฒเธฃเนเธเธเนเธฒเธเธเธฃเธซเธฅเธงเธ, TOT, AIS, True',
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'เธเธฑเนเธกเธเนเธณเธกเธฑเธ' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({ text: 'PTT, Bangchak, Shell' }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'เธฃเนเธฒเธเน€เธเธฃเธทเนเธญเธเน€เธเธตเธขเธ' })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: 'OfficeMate, B2S' })],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'เธฃเนเธฒเธเธญเธฒเธซเธฒเธฃ' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({ text: '(เนเธชเนเธเธทเนเธญเธฃเนเธฒเธเธ—เธตเนเนเธเนเธเธฃเธฐเธเธณ)' }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เน€เธเนเธฒเธซเธกเธฒเธข:',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' เธญเธขเธฒเธเนเธ”เนเธเธฃเธฐเธกเธฒเธ“ 20-30 เธเธทเนเธญเธฃเนเธฒเธเธ—เธตเนเน€เธเธญเธเนเธญเธขเธ—เธตเนเธชเธธเธ”',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Section 2 - How to send
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '๐“ค เธงเธดเธเธตเธชเนเธเน€เธญเธเธชเธฒเธฃ',
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_2,
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [new TextRun({ text: 'เธชเธฒเธกเธฒเธฃเธ–เธชเนเธเนเธ”เนเธซเธฅเธฒเธขเธ—เธฒเธ:' })],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '1. เธญเธฑเธเนเธซเธฅเธ”เธฅเธ Google Drive เนเธฅเนเธงเนเธเธฃเนเธฅเธดเธเธเนเธกเธฒ',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '2. เธชเนเธเธ—เธฒเธ LINE / Email เธเธญเธเธ—เธตเธกเธเธฑเธ’เธเธฒ' }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '3. เธงเธฒเธเนเธงเนเนเธเนเธเธฅเน€เธ”เธญเธฃเนเธ—เธตเนเธ•เธเธฅเธเธเธฑเธ' }),
                        ],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    // FAQ Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ“ เธเธณเธ–เธฒเธกเธ—เธตเนเธญเธฒเธเธชเธเธชเธฑเธข',
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_2,
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ–เธฒเธก: เธ—เธณเนเธกเธ•เนเธญเธเนเธเนเนเธเน€เธชเธฃเนเธเธเธฃเธดเธ?',
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ•เธญเธ: เธฃเธฐเธเธเธ•เนเธญเธเน€เธฃเธตเธขเธเธฃเธนเนเธฃเธนเธเนเธเธเนเธเน€เธชเธฃเนเธเธเธฃเธดเธเธ—เธตเนเธเธฃเธดเธฉเธฑเธ—เนเธ”เนเธฃเธฑเธ เน€เธเธทเนเธญเนเธซเนเธญเนเธฒเธเนเธ”เนเนเธกเนเธเธขเธณ',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ–เธฒเธก: เธเนเธญเธกเธนเธฅเธเธฐเธ–เธนเธเน€เธเนเธเน€เธเนเธเธเธงเธฒเธกเธฅเธฑเธเนเธซเธก?',
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ•เธญเธ: เนเธเนเธเธฃเธฑเธ เธเนเธญเธกเธนเธฅเธเธฐเนเธเนเน€เธเธเธฒเธฐเธ—เธ”เธชเธญเธเธฃเธฐเธเธเธ เธฒเธขเนเธเน€เธ—เนเธฒเธเธฑเนเธ เนเธกเนเน€เธเธขเนเธเธฃเนเธ—เธตเนเนเธซเธ',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ–เธฒเธก: เธ•เนเธญเธเธชเนเธเธ เธฒเธขเนเธเน€เธกเธทเนเธญเนเธซเธฃเน?',
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ•เธญเธ: เธ–เนเธฒเธชเธฐเธ”เธงเธเธชเนเธเธ เธฒเธขเนเธ ',
                            }),
                            new TextRun({
                                text: '1 เธชเธฑเธเธ”เธฒเธซเน',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' เธเธฐเธ”เธตเธกเธฒเธเธเธฃเธฑเธ',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Benefits Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '๐ฏ เธเธฃเธฐเนเธขเธเธเนเธ—เธตเนเธเธฐเนเธ”เนเธฃเธฑเธ',
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_2,
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เน€เธกเธทเนเธญเธฃเธฐเธเธเธเธฑเธ’เธเธฒเน€เธชเธฃเนเธเนเธฅเนเธง:' }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ… เธฅเธ”เน€เธงเธฅเธฒเธเธตเธขเนเธเนเธญเธกเธนเธฅ',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' โ€” เธฃเธฐเธเธเธญเนเธฒเธเนเธเน€เธชเธฃเนเธเนเธฅเนเธงเธเธฃเธญเธเนเธซเนเธญเธฑเธ•เนเธเธกเธฑเธ•เธด',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ… เธฅเธ”เธเธงเธฒเธกเธเธดเธ”เธเธฅเธฒเธ”',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' โ€” เนเธกเนเธ•เนเธญเธเธเธดเธกเธเนเธ•เธฑเธงเน€เธฅเธเน€เธญเธ',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ… เธเธฑเธ”เธซเธกเธงเธ”เธซเธกเธนเนเธญเธฑเธ•เนเธเธกเธฑเธ•เธด',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' โ€” AI เธเนเธงเธขเน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธเนเธฒเนเธเนเธเนเธฒเธข',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'โ… เธเธฃเธฐเธซเธขเธฑเธ”เน€เธงเธฅเธฒ',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' โ€” เธเธฒเธ 100+ เธเธก./เน€เธ”เธทเธญเธ เน€เธซเธฅเธทเธญ 20 เธเธก./เน€เธ”เธทเธญเธ',
                            }),
                        ],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [new TextRun({ text: 'โ”€'.repeat(50) })],
                    }),
                    new Paragraph({ text: '' }),

                    // Closing
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เธเธญเธเธเธธเธ“เธกเธฒเธเธเธฃเธฑเธ/เธเนเธฐ ๐' }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธซเธฒเธเธกเธตเธเนเธญเธชเธเธชเธฑเธขเธชเธฒเธกเธฒเธฃเธ–เธชเธญเธเธ–เธฒเธกเนเธ”เนเธ•เธฅเธญเธ”เน€เธงเธฅเธฒ',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เธ—เธตเธกเธเธฑเธ’เธเธฒ Auto-Acct',
                                bold: true,
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = './docs/REQUEST_FOR_ACCOUNTING_TEAM.docx';
    writeFileSync(outputPath, buffer);
    console.log(`โ… Document created: ${outputPath}`);
}

generateDocument().catch(console.error);
