import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '@config/env';
import logger from '@loaders/logger';

/**
 * Thai Accounting Categories (Chart of Accounts)
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
    confidence: number; // 0.0 to 1.0
    reasoning: string;
}

export class GeminiClassificationService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        if (config.GOOGLE_API_KEY) {
            this.genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);
            // Use full model path for v1beta API
            this.model = this.genAI.getGenerativeModel({
                model: 'models/gemini-1.5-flash-latest'
            });
            logger.info('Gemini AI initialized for accounting classification');
        } else {
            logger.warn('GOOGLE_API_KEY not configured - Gemini classification unavailable');
        }
    }

    /**
     * Classify a journal entry into accounting category
     */
    async classifyEntry(entry: {
        vendor: string;
        amount: number; // in satang (integer)
        description?: string;
        date?: Date;
    }): Promise<ClassificationResult> {
        if (!this.model) {
            throw new Error('Gemini API not configured. Please set GOOGLE_API_KEY in .env');
        }

        try {
            const prompt = this.buildPrompt(entry);
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            return this.parseResponse(response);
        } catch (error) {
            logger.error('Gemini classification failed', { error, entry });
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
     * Parse Gemini response
     */
    private parseResponse(response: string): ClassificationResult {
        try {
            // Remove markdown code blocks if present
            const cleaned = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const parsed = JSON.parse(cleaned);

            // Validate category exists
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
            logger.error('Failed to parse Gemini response', { response, error });

            // Fallback to MISCELLANEOUS with low confidence
            return {
                category: ACCOUNTING_CATEGORIES.MISCELLANEOUS,
                confidence: 0.3,
                reasoning: 'Failed to parse AI response - defaulted to miscellaneous',
            };
        }
    }

    /**
     * Batch classify multiple entries
     */
    async batchClassify(entries: Array<{
        vendor: string;
        amount: number;
        description?: string;
        date?: Date;
    }>): Promise<ClassificationResult[]> {
        // Rate limit: 15 requests/minute on free tier
        const results: ClassificationResult[] = [];

        for (const entry of entries) {
            const result = await this.classifyEntry(entry);
            results.push(result);

            // Wait to avoid rate limiting (4 seconds between requests = 15/min)
            if (entries.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 4000));
            }
        }

        return results;
    }
}

// Singleton instance
export const geminiService = new GeminiClassificationService();
