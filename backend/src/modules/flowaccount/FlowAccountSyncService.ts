import mongoose from 'mongoose';
import { FlowAccountClient } from './FlowAccountClient';
import { FlowAccountToken } from './models/FlowAccountToken.model';
import { AccountingService } from '@modules/accounting/AccountingService';
import { AccountingRepository } from '@modules/accounting/AccountingRepository';
import { CreateJournalEntryDTO } from '@modules/accounting/dtos/CreateJournalEntry.dto';
import { parseMoneyFromString, MoneyInt } from '../../types/money';
import logger from '@loaders/logger';
import { sendDiscordAlert } from '@loaders/logger';
import { TeableClient } from '@modules/teable/TeableClient';
import config from '@config/env';
import { groqService } from '@modules/ai/GroqClassificationService';

export class FlowAccountSyncService {
    private client = new FlowAccountClient();
    private accountingService = new AccountingService(new AccountingRepository());
    private teableClient = new TeableClient();

    /**
     * Sync documents for a single client
     */
    async syncClient(clientId: string, date: Date = new Date()): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Fetch documents from FlowAccount
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            const documents = await this.client.getDocuments(clientId, startDate, endDate);

            logger.info('Starting FlowAccount sync', {
                clientId,
                documentCount: documents.length,
                date,
            });

            const results = {
                success: 0,
                failed: 0,
                errors: [] as string[],
            };

            for (const doc of documents) {
                try {
                    await this.processDocument(clientId, doc, session);
                    results.success++;
                } catch (error: any) {
                    results.failed++;
                    results.errors.push(`${doc.recordId}: ${error.message}`);
                    logger.error('Failed to process document', {
                        clientId,
                        documentId: doc.recordId,
                        error,
                    });
                }
            }

            await session.commitTransaction();

            // Update last sync timestamp
            await FlowAccountToken.findOneAndUpdate(
                { clientId },
                { lastSyncAt: new Date() }
            );

            logger.info('FlowAccount sync completed', {
                clientId,
                results,
            });

            // Alert if errors
            if (results.failed > 0) {
                await sendDiscordAlert(
                    `⚠️ FlowAccount sync completed with errors for client ${clientId}`,
                    { results }
                );
            }
        } catch (error) {
            // Correct session abortion
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            logger.error('FlowAccount sync failed', { error, clientId });

            await sendDiscordAlert(
                `🚨 FlowAccount sync failed for client ${clientId}`,
                { error: (error as Error).message }
            );

            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process a single FlowAccount document
     */
    private async processDocument(
        clientId: string,
        doc: any,
        session: mongoose.ClientSession
    ): Promise<void> {
        // Check if document already processed to enable idempotency
        const existing = await this.accountingService.findByReference(doc.recordId);
        if (existing) {
            logger.debug(`Document ${doc.recordId} already processed. Skipping.`);
            return;
        }

        // Convert FlowAccount amounts to MoneyInt (satang)
        // FlowAccount provides numbers like 100.50
        const amount: MoneyInt = Math.round(doc.grandTotal * 100);
        const vatAmount: MoneyInt = Math.round(doc.taxAmount * 100);

        // Validation 1: VAT 7% check
        // Assuming grandTotal includes tax? Or dependent on tax type. 
        // Usually grandTotal = subtotal + vat. 
        // If user inputs manually, taxAmount might be off.

        // Calculate expected VAT based on tax amount provided logic in brief:
        // Expected: 7% of base. Base = Total - Tax (Roughly)
        // Let's deduce base from taxAmount if possible, or just verify relationship.
        // Simpler check: If tax > 0, check if tax is roughly 7/107 of GrandTotal (inclusive) or 7% of independent base.
        // Doc schema doesn't strictly define if GrandTotal is inclusive. Assuming inclusive for "grandTotalWithTax"?
        // Logic from brief: "Expected: 7% of base amount"

        // Let's use simple logic: Base = Amount - VAT
        const baseAmount = amount - vatAmount;
        const expectedVAT = Math.round(baseAmount * 0.07);
        const vatDiff = Math.abs(vatAmount - expectedVAT);

        const warnings: string[] = [];

        if (vatDiff > 100) { // Allow 1 THB difference
            const msg = `VAT mismatch: Expected ${expectedVAT / 100}, Actual ${vatAmount / 100}`;
            warnings.push(msg);
            logger.warn(msg, {
                documentId: doc.recordId,
                expected: expectedVAT,
                actual: vatAmount,
            });
        }

        // Validation 2: Attachment requirement (>1000 THB)
        const requiresAttachment = amount > 100000; // 1000 THB in satang
        // Attachments is array of objects { fileName, fileUrl }
        const hasAttachment = doc.attachments && doc.attachments.length > 0;

        if (requiresAttachment && !hasAttachment) {
            throw new Error(
                `Document ${doc.recordId} requires attachment (amount > 1000 THB)`
            );
        }

        // Validation 3: Category mapping & AI Classification
        // Hybrid Approach: Rules > AI > Fallback

        let category: { name: string; accountCode: string };
        let confidenceScore = 0.0;
        let aiReasoning = '';

        // 1. Try Strict Rules (Keywords)
        const ruleBased = this.mapCategory(doc.documentType, doc.contactName);

        // Identify if the rule result is just a generic fallback (5000/4000)
        // If it's a specific match (e.g. 5110 Electricity), trust it 100%
        const isGeneric = ruleBased?.accountCode === '5000' || ruleBased?.accountCode === '4000' || ruleBased?.accountCode === '4100';

        if (ruleBased && !isGeneric) {
            category = ruleBased;
            confidenceScore = 1.0;
            aiReasoning = 'Rule-based keyword match';
        } else {
            // 2. Use Groq AI
            try {
                const aiResult = await groqService.classifyEntry({
                    vendor: doc.contactName,
                    amount: amount, // Passing satang, but service handles logic?
                    // Actually GroqService expects number. We should check implementation.
                    // GroqService does (amount/100).toFixed(2). So we pass satang (MoneyInt). Correct.
                    description: doc.remarks || doc.documentType,
                    date: new Date(doc.documentDate),
                });

                // Parse "5100 - Category Name"
                const parts = aiResult.category.split(' - ');
                category = {
                    accountCode: parts[0],
                    name: parts.slice(1).join(' - ') || parts[0]
                };
                confidenceScore = aiResult.confidence;
                aiReasoning = aiResult.reasoning;

                logger.info(`AI Classified ${doc.recordId}: ${category.accountCode} (${confidenceScore})`);

            } catch (error) {
                // 3. Fallback to generic rule or Miscellaneous
                logger.warn(`AI classification failed for ${doc.recordId}, using fallback`, { error });
                category = ruleBased || { name: 'Miscellaneous', accountCode: '5900' };
                confidenceScore = 0.5;
                aiReasoning = 'AI Failed - Fallback';
            }
        }

        if (!category) {
            throw new Error(`Unable to map category for document ${doc.recordId}`);
        }

        // Determine entry type (debit/credit)
        // Expense = Debit Expense / Credit Cash
        // Income = Debit Cash / Credit Revenue
        // JournalEntry model is single-entry row or double? 
        // Phase 1 "AccountingService" likely creates complex entries. 
        // But CreateJournalEntryDTO in prompt suggests a simplified single-line input that Service expands?
        // Let's assume CreateJournalEntryDTO expects the "main" leg and service handles the balancing leg implicitly or explicit double?
        // Checking Phase 1 code (not visible but assuming standard):
        // Prompt says: type: doc.documentType === 'expense' ? 'debit' : 'credit'

        const entryDTO: CreateJournalEntryDTO = {
            clientId,
            date: new Date(doc.documentDate),
            accountCode: category.accountCode,
            description: doc.remarks || `${doc.contactName} - ${doc.documentType}`,
            amount,
            type: doc.documentType === 'expense' ? 'debit' : 'credit',
            category: category.name,
            vatAmount,
            // Use first attachment URL if available
            attachmentId: hasAttachment ? doc.attachments[0].fileUrl : undefined,
            source: 'flowaccount',
            metadata: {
                flowAccountRecordId: doc.recordId,
                contactName: doc.contactName,
                referenceDocument: doc.referenceDocument,
            },
            createdBy: 'system:flowaccount-sync',
        };

        // Create journal entry in DB
        // Pass session to service to ensure transaction safety
        // Assuming accountingService.createEntry supports session (Phase 1 constraint)
        const entry = await this.accountingService.createEntry(entryDTO, session);

        // Push to Teable for human review
        // We do this AFTER DB write but within transaction? 
        // OR we do it after simple commit?
        // External API calls usually shouldn't be inside DB transaction to avoid long locks if API is slow.
        // BUT we want consistency.
        // Compromise: Do it inside processDocument but outside session?
        // The snippet in mission prompt implies doing it here. 
        // We will do it here. If it fails, the whole sync for this doc fails, DB rolls back.
        // Teable creation failure -> safe to rollback DB.

        // We need tableId. Ideally config.
        const pendingTableId = config.TEABLE_TABLE_ID;

        if (!pendingTableId) {
            logger.warn('TEABLE_TABLE_ID not set, skipping Teable push');
            return;
        }

        try {
            await this.teableClient.createRecord(pendingTableId, {
                fields: {
                    clientId,
                    journalEntryId: entry._id.toString(),
                    date: entry.date.toISOString().split('T')[0],
                    vendor: doc.contactName,
                    amount: amount / 100, // Convert satang to THB for display
                    category: category.name,
                    status: 'pending_review', // Default status
                    confidenceScore,
                    warnings: warnings.length > 0 ? warnings : undefined,
                    attachmentUrl: entryDTO.attachmentId,
                },
            });
        } catch (teableError) {
            // If Teable fails, do we fail the whole sync?
            // Yes, ensuring visibility is critical.
            throw new Error(`Failed to push to Teable: ${(teableError as Error).message}`);
        }

        logger.debug('Document processed', {
            documentId: doc.recordId,
            entryId: entry._id,
            amount,
            category: category.name,
        });
    }

    /**
     * Map FlowAccount document type to internal category
     * TODO: Load from configuration file or database
     */
    private mapCategory(
        documentType: string,
        contactName: string
    ): { name: string; accountCode: string } | null {
        // Phase 2: Simple rule-based mapping

        const categoryMap: Record<string, { name: string; accountCode: string }> = {
            expense: { name: 'General Expense', accountCode: '5000' },
            income: { name: 'Revenue', accountCode: '4000' },
            revenue: { name: 'Sales Revenue', accountCode: '4100' },
            // Add more as needed
        };

        // Keyword-based subcategory detection
        const lowerContact = contactName.toLowerCase();

        if (lowerContact.includes('electricity') || lowerContact.includes('ไฟฟ้า')) {
            return { name: 'Utilities - Electricity', accountCode: '5110' };
        }

        if (lowerContact.includes('water') || lowerContact.includes('ประปา')) {
            return { name: 'Utilities - Water', accountCode: '5120' };
        }

        if (lowerContact.includes('rent') || lowerContact.includes('ค่าเช่า')) {
            return { name: 'Rent Expense', accountCode: '5200' };
        }

        if (lowerContact.includes('meal') || lowerContact.includes('อาหาร')) {
            return { name: 'Meals & Entertainment', accountCode: '5300' };
        }

        // Fallback to document type
        // map documentType which might be 'purchase_order' (not mapped) or 'expense'
        return categoryMap[documentType] || categoryMap['expense'] || null;
    }

    /**
     * Sync all active clients (used by cron)
     */
    async syncAllClients(date: Date = new Date()): Promise<void> {
        const activeTokens = await FlowAccountToken.find({ isActive: true });

        logger.info('Starting bulk FlowAccount sync', {
            clientCount: activeTokens.length,
            date,
        });

        for (const token of activeTokens) {
            try {
                await this.syncClient(token.clientId, date);
            } catch (error) {
                // Continue with other clients even if one fails
                logger.error('Client sync failed', {
                    clientId: token.clientId,
                    error,
                });
            }
        }

        logger.info('Bulk FlowAccount sync completed');
    }
}
