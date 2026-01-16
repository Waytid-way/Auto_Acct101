import Groq from 'groq-sdk';
import config from '@config/env';
import logger from '@loaders/logger';

/**
 * Thai Accounting Categories (same as Gemini)
 */
export const ACCOUNTING_CATEGORIES = {
    // 5xxx: Expenses
    MEALS: '5100 - ค่าอาหารและเครื่องดื่ม',
    OFFICE_SUPPLIES: '5200 - ค่าเครื่องเขียนและอุปกรณ์สำนักงาน',
    UTILITIES: '5300 - ค่าสาธารณูปโภค (ไฟฟ้า น้ำ อินเทอร์เน็ต)',
    RENT: '5400 - ค่าเช่าสถานที่',
    TRANSPORTATION: '5500 - ค่าเดินทางและขนส่ง',
    MARKETING: '5600 - ค่าโฆษณาและการตลาด',
    PROFESSIONAL_FEES: '5700 - ค่าที่ปรึกษาและบริการวิชาชีพ',
    MAINTENANCE: '5800 - ค่าซ่อมบำรุง',
    MISCELLANEOUS: '5900 - ค่าใช้จ่ายอื่นๆ',

    // 4xxx: Revenue
    SERVICE_REVENUE: '4100 - รายได้จากการให้บริการ',
    PRODUCT_SALES: '4200 - รายได้จากการขายสินค้า',
    OTHER_INCOME: '4900 - รายได้อื่นๆ',
} as const;

export type AccountingCategory = (typeof ACCOUNTING_CATEGORIES)[keyof typeof ACCOUNTING_CATEGORIES];

export interface ClassificationResult {
    category: AccountingCategory;
    confidence: number;
    reasoning: string;
}

export class GroqClassificationService {
    private client: Groq | null = null;

    constructor() {
        if (config.GROQ_API_KEY) {
            this.client = new Groq({ apiKey: config.GROQ_API_KEY });
            logger.info('Groq AI initialized for accounting classification');
        } else {
            logger.warn('GROQ_API_KEY not configured - Groq classification unavailable');
        }
    }

    /**
     * Classify a journal entry into accounting category
     */
    async classifyEntry(entry: {
        vendor: string;
        amount: number;
        description?: string;
        date?: Date;
    }): Promise<ClassificationResult> {
        if (!this.client) {
            throw new Error('Groq API not configured. Please set GROQ_API_KEY in .env');
        }

        try {
            const prompt = this.buildPrompt(entry);

            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile', // Updated model (3.1 decommissioned)
                temperature: 0.3,
                max_tokens: 500,
            });

            const response = completion.choices[0]?.message?.content || '';
            return this.parseResponse(response);
        } catch (error) {
            logger.error('Groq classification failed', { error, entry });
            throw error;
        }
    }

    /**
     * Build classification prompt
     */
    private buildPrompt(entry: {
        vendor: string;
        amount: number;
        description?: string;
        date?: Date;
    }): string {
        const amountTHB = (entry.amount / 100).toFixed(2);
        const categories = Object.values(ACCOUNTING_CATEGORIES).join('\n  - ');

        return `You are an expert Thai accountant. Classify this transaction into the most appropriate accounting category.

**Transaction Details:**
- Vendor: ${entry.vendor}
- Amount: ${amountTHB} THB
${entry.description ? `- Description: ${entry.description}` : ''}
${entry.date ? `- Date: ${entry.date.toISOString().split('T')[0]}` : ''}

**Available Categories:**
  - ${categories}

**Instructions:**
1. Choose the MOST APPROPRIATE category from the list above
2. Provide a confidence score (0.0 to 1.0)
3. Explain your reasoning in 1-2 sentences

**Response Format (JSON only):**
{
  "category": "XXXX - Category Name",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}

Respond ONLY with valid JSON. No other text.`;
    }

    /**
     * Parse AI response
     */
    private parseResponse(response: string): ClassificationResult {
        try {
            const cleaned = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const parsed = JSON.parse(cleaned);

            // Validate category
            const validCategories = Object.values(ACCOUNTING_CATEGORIES);
            if (!validCategories.includes(parsed.category)) {
                throw new Error(`Invalid category: ${parsed.category}`);
            }

            // Validate confidence
            if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
                throw new Error(`Invalid confidence: ${parsed.confidence}`);
            }

            return {
                category: parsed.category,
                confidence: parsed.confidence,
                reasoning: parsed.reasoning || 'No reasoning provided',
            };
        } catch (error) {
            logger.error('Failed to parse Groq response', { response, error });

            // Fallback
            return {
                category: ACCOUNTING_CATEGORIES.MISCELLANEOUS,
                confidence: 0.3,
                reasoning: 'Failed to parse AI response - defaulted to miscellaneous',
            };
        }
    }

    /**
     * Batch classify (no rate limit on free tier!)
     */
    async batchClassify(entries: Array<{
        vendor: string;
        amount: number;
        description?: string;
        date?: Date;
    }>): Promise<ClassificationResult[]> {
        const results: ClassificationResult[] = [];

        for (const entry of entries) {
            const result = await this.classifyEntry(entry);
            results.push(result);

            // Small delay to be nice (not required)
            if (entries.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return results;
    }
}

// Singleton
export const groqService = new GroqClassificationService();
