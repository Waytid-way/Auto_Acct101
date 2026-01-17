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
                                text: '📝 ขอความร่วมมือจากทีมบัญชี',
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
                            new TextRun({ text: 'วันที่: ', bold: true }),
                            new TextRun({ text: '17 มกราคม 2569' }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เรื่อง: ', bold: true }),
                            new TextRun({ text: 'ขอตัวอย่างเอกสารสำหรับพัฒนาระบบอ่านใบเสร็จอัตโนมัติ' }),
                        ],
                    }),

                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [new TextRun({ text: '─'.repeat(50) })],
                    }),
                    new Paragraph({ text: '' }),

                    // Greeting
                    new Paragraph({
                        children: [new TextRun({ text: 'สวัสดีครับ/ค่ะ ทีมบัญชี 🙏' })],
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ขณะนี้ทีมพัฒนากำลังสร้างระบบที่ช่วย ',
                            }),
                            new TextRun({
                                text: 'อ่านใบเสร็จอัตโนมัติ',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' เพื่อลดภาระงานคีย์ข้อมูล',
                            }),
                        ],
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'เพื่อให้ระบบทำงานได้แม่นยำ',
                                bold: true,
                            }),
                            new TextRun({ text: ' รบกวนขอความช่วยเหลือดังนี้ครับ:' }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Section 1
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '✅ สิ่งที่ต้องการ',
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
                                text: '1. ตัวอย่างใบเสร็จ / ใบกำกับภาษี จำนวน 10-20 ใบ',
                                bold: true,
                                size: 24,
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'รูปแบบที่รับได้:', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: '• ไฟล์ PDF' })],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: '• รูปถ่าย (JPG, PNG)' })],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: '• ไฟล์สแกน' })],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'ประเภทใบเสร็จที่ต้องการ:', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '• ใบเสร็จจากร้านสะดวกซื้อ (เช่น 7-Eleven, Lotus\'s)',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: '• ใบเสร็จค่าอาหาร/เครื่องดื่ม' })],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '• ใบเสร็จค่าน้ำ ค่าไฟ ค่าอินเทอร์เน็ต' }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '• ใบเสร็จค่าเดินทาง (น้ำมัน, ที่จอดรถ, ทางด่วน)',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '• ใบเสร็จซื้ออุปกรณ์สำนักงาน' }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: '• ใบกำกับภาษี VAT 7%' })],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: '⚠️ หมายเหตุ:', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '• ขอใบเสร็จจากการทำงานจริง (ไม่ใช่ตัวอย่างจากอินเทอร์เน็ต)',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '• ถ้ามีข้อมูลส่วนบุคคลที่ไม่อยากเปิดเผย สามารถขีดฆ่าออกได้ครับ',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '• ไม่ต้องกังวลเรื่องความสวยงาม — ใบเสร็จที่พับ ยับ หรือเบลอเล็กน้อยก็ใช้ได้',
                            }),
                        ],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '2. รายชื่อร้านค้า/บริษัทที่ใช้บ่อย',
                                bold: true,
                                size: 24,
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ช่วยลิสต์ชื่อร้านค้าหรือบริษัทที่เห็นบ่อยๆ ในใบเสร็จ เช่น:',
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
                                                    new TextRun({ text: 'ประเภท', bold: true }),
                                                ],
                                            }),
                                        ],
                                        width: { size: 30, type: WidthType.PERCENTAGE },
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({ text: 'ตัวอย่างชื่อร้าน', bold: true }),
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
                                        children: [new Paragraph({ text: 'ร้านสะดวกซื้อ' })],
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
                                        children: [new Paragraph({ text: 'ซูเปอร์มาร์เก็ต' })],
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
                                        children: [new Paragraph({ text: 'ค่าสาธารณูปโภค' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                text: 'การไฟฟ้านครหลวง, TOT, AIS, True',
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'ปั๊มน้ำมัน' })],
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
                                        children: [new Paragraph({ text: 'ร้านเครื่องเขียน' })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: 'OfficeMate, B2S' })],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'ร้านอาหาร' })],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({ text: '(ใส่ชื่อร้านที่ใช้ประจำ)' }),
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
                                text: 'เป้าหมาย:',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' อยากได้ประมาณ 20-30 ชื่อร้านที่เจอบ่อยที่สุด',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Section 2 - How to send
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '📤 วิธีส่งเอกสาร',
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_2,
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [new TextRun({ text: 'สามารถส่งได้หลายทาง:' })],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '1. อัปโหลดลง Google Drive แล้วแชร์ลิงก์มา',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '2. ส่งทาง LINE / Email ของทีมพัฒนา' }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '3. วางไว้ในโฟลเดอร์ที่ตกลงกัน' }),
                        ],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),

                    // FAQ Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '❓ คำถามที่อาจสงสัย',
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
                                text: 'ถาม: ทำไมต้องใช้ใบเสร็จจริง?',
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ตอบ: ระบบต้องเรียนรู้รูปแบบใบเสร็จจริงที่บริษัทได้รับ เพื่อให้อ่านได้แม่นยำ',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ถาม: ข้อมูลจะถูกเก็บเป็นความลับไหม?',
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ตอบ: ใช่ครับ ข้อมูลจะใช้เฉพาะทดสอบระบบภายในเท่านั้น ไม่เผยแพร่ที่ไหน',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ถาม: ต้องส่งภายในเมื่อไหร่?',
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ตอบ: ถ้าสะดวกส่งภายใน ',
                            }),
                            new TextRun({
                                text: '1 สัปดาห์',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' จะดีมากครับ',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    // Benefits Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '🎯 ประโยชน์ที่จะได้รับ',
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_2,
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: 'เมื่อระบบพัฒนาเสร็จแล้ว:' }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '✅ ลดเวลาคีย์ข้อมูล',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' — ระบบอ่านใบเสร็จแล้วกรอกให้อัตโนมัติ',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '✅ ลดความผิดพลาด',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' — ไม่ต้องพิมพ์ตัวเลขเอง',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '✅ จัดหมวดหมู่อัตโนมัติ',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' — AI ช่วยเลือกประเภทค่าใช้จ่าย',
                            }),
                        ],
                        indent: { left: 360 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '✅ ประหยัดเวลา',
                                bold: true,
                            }),
                            new TextRun({
                                text: ' — จาก 100+ ชม./เดือน เหลือ 20 ชม./เดือน',
                            }),
                        ],
                        indent: { left: 360 },
                    }),

                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [new TextRun({ text: '─'.repeat(50) })],
                    }),
                    new Paragraph({ text: '' }),

                    // Closing
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'ขอบคุณมากครับ/ค่ะ 🙏' }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'หากมีข้อสงสัยสามารถสอบถามได้ตลอดเวลา',
                            }),
                        ],
                    }),

                    new Paragraph({ text: '' }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'ทีมพัฒนา Auto-Acct',
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
    console.log(`✅ Document created: ${outputPath}`);
}

generateDocument().catch(console.error);
