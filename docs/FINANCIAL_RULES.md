# Financial Integrity & Accounting Rules (THE GOLDEN RULES)

## 1. Integer-Only Money ("Satang Strategy")
To prevent floating-point precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`), ALL monetary values are stored as **Integers** representing the smallest unit (Satang/Cents).

- **Rule**: `100.00 THB` stored as `10000`
- **Rule**: `Type MoneyInt = number;` (TS Alias)
- **Forbidden**: `float`, `double` for money
- **Utils**: Use `parseMoneyFromString()` and `formatMoney()` helpers.

## 2. The Plug Method (Allocation)
When splitting an amount into parts where division is not exact (e.g., 100 / 3), we MUST ensure the sum of parts equals the original total.

- **Algorithm**:
  1. Calculate `floor(total / N)` for base amount.
  2. Calculate `remainder = total - (base * N)`.
  3. Add remainder to the first item (or largest item).
- **Example**: `splitMoney(100, 3)` -> `[34, 33, 33]` (Sum: 100)

## 3. ACID Compliance
Accounting data MUST be consistent. Partial failures are unacceptable.

- **Requirement**: Use MongoDB Multi-Document Transactions (`session.withTransaction`).
- **Dependency**: Requires MongoDB Replica Set enabled.
- **Fail-Safe**: If DB is not in Replica Set mode, the application will refuse to start.

## 4. Immutability
- **Rule**: Posted transactions (`posted: true`) can NEVER be deleted or modified.
- **Correction**: To fix an error, create a Reversal Entry (Void) and a new Correct Entry.

## 5. Trial Balance Check
Before committing any transaction group:
- **Rule**: `Sum(Debits) == Sum(Credits)`
- **Action**: If mismatch, rollback entire transaction.
