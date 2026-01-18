# Synthetic Data Requirements: Auto-Acct101 Full Loop Test

**To:** Data Generation Team
**From:** Antigravity (QA/Dev)
**Date:** 2026-01-18
**Purpose:** Create realistic mock financial data to stress-test the Daily Export & Journal Entry system.

---

## 1. Specifications

### 1.1 Volume & Scope
- **Total Entries:** 50 Transactions
- **Date Range:** Single Day (Simulating "Today's" export batch)
- **Format:** JSON Array (file: `synthetic_batch_001.json`)

### 1.2 Data Schema (JSON)
Each object in the array must match this interface:

```typescript
interface SyntheticEntry {
  date: string;          // ISO Date "YYYY-MM-DD" e.g. "2026-01-18"
  description: string;   // Clear business description
  accountCode: string;   // 4-5 digit code
  accountName: string;   // e.g. "Sales Revenue", "Office Supplies"
  amount: number;        // Positive value
  type: 'debit' | 'credit';
  category: 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY';
  referenceNo: string;   // Unique Ref e.g. "INV-2024-001"
}
```

## 2. Scenarios to Cover (Distribution)

Please ensure the 50 entries cover these specific scenarios:

| Category | Count | Description | Examples |
| :--- | :--- | :--- | :--- |
| **Revenue** | 20 | Routine sales, diverse amounts | "Consulting Service", "Software License" |
| **OpEx** | 15 | Daily operational expenses | "Grab Taxi", "AWS Bill", "Office Rental" |
| **Assets** | 5 | High-value items (Checking formatting) | "MacBook Pro M3", "Office Furniture" |
| **Edge Cases** | 5 | Complex characters, Long text | Desc with quotes ("), Commas (,), Thai Text |
| **Micro Tx** | 5 | Very small amounts | "Interest 0.01", "Adjustment 0.50" |

## 3. Example JSON Output

```json
[
  {
    "date": "2026-01-18",
    "description": "Consulting Service for Client A",
    "accountCode": "4001",
    "accountName": "Service Revenue",
    "amount": 15000.00,
    "type": "credit",
    "category": "REVENUE",
    "referenceNo": "INV-001"
  },
  {
    "date": "2026-01-18",
    "description": "Grab Taxi to Client Meeting (Sukhumvit)",
    "accountCode": "5003",
    "accountName": "Travel Expense",
    "amount": 250.00,
    "type": "debit",
    "category": "EXPENSE",
    "referenceNo": "EXP-042"
  }
]
```

## 4. Delivery
- Please provide the file as `backend/data/synthetic_batch_001.json`.
