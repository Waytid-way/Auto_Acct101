# FlowAccount Integration Guide

## Overview
Auto-Acct-001 integrates with FlowAccount using OAuth 2.0 to automatically sync accounting documents. This integration ensures that your accounting data is always up-to-date and correctly mapped to your internal Chart of Accounts.

## OAuth Setup

### Step 1: Register Application
1. Login to **FlowAccount Developer Portal**.
2. Create a new OAuth application.
3. Set the **Redirect URI** to: `http://localhost:4000/api/flowaccount/callback`
4. Copy the **Client ID** and **Client Secret**.

### Step 2: Configure Environment
Add the following credentials to your `.env` file (do NOT commit this file):

```bash
FLOWACCOUNT_CLIENT_ID=your_client_id
FLOWACCOUNT_CLIENT_SECRET=your_client_secret
FLOWACCOUNT_REDIRECT_URI=http://localhost:4000/api/flowaccount/callback
```

### Step 3: Connect Client
1. To initiate the connection, visit:
   `http://localhost:4000/api/flowaccount/authorize?clientId=CLIENT_001`
   *(Replace `CLIENT_001` with your unique identifier for this client)*
2. You will be redirected to FlowAccount to log in and approve permissions.
3. Upon success, you will be redirected back to the application with a success message.
4. The access and refresh tokens are securely encrypted (AES-256-GCM) and stored in the database.

## Data Sync Flow

### Nightly Sync (Automated)
- **Schedule**:Runs every night (configurable via cron).
- **Scope**: Syncs all active clients with valid tokens.
- **Process**: Fetches documents for the current day, validates them, and pushes them to Teable for review.
- **Alerts**: Any errors (e.g., validation failures) are sent to the Discord channel.

### Manual Sync (API)
You can trigger a sync manually for a specific date:

```bash
# Example using curl (coming in Phase 3)
curl -X POST http://localhost:4000/api/flowaccount/sync \
  -H "Content-Type: application/json" \
  -d '{"clientId":"CLIENT_001", "date":"2026-01-16"}'
```

*(Note: Manual sync API endpoint is part of the `FlowAccountSyncService` but exposed via script currently. Use `bun run scripts/sync-flowaccount-cron.ts` for testing)*

## Validation Rules

The synchronization process enforces strict accounting rules:

1.  **VAT Calculation**:
    - Checks if `Tax Amount` matches `7%` of the `Base Amount`.
    - Tolerance: ±1.00 THB.
    - Mismatches log a warning but proceed with the sync (flagged in Teable).

2.  **Attachment Requirement**:
    - **Required** if the document Grand Total > **1,000 THB**.
    - If missing, the sync for that document fails to ensure compliance.

3.  **Category Mapping**:
    - Automatically maps Expenses/Revenue using keyword detection (e.g., "Electricity" -> "5110 Utilities").
    - Usage of `config/chart-of-accounts.json` for consistent code mapping.

## Troubleshooting

### Token Expired
- The system automatically refreshes tokens 5 minutes before they expire.
- If refresh fails (e.g., revoked by user), the token status becomes `inactive`.
- **Fix**: Re-run the Authorization step (Step 3).

### Sync Errors
- Check **Discord alerts** for immediate error notifications.
- Review **logs**: `backend/logs/error.log`.
- Common issues:
    - **Missing attachments**: Upload attachment to FlowAccount and retry.
    - **VAT mismatches**: Correct the tax amount in FlowAccount.

## Security

### Token Storage
- **Encryption**: AES-256-GCM.
- **Key**: Stored in `ENCRYPTION_KEY` env var.
- **Database**: Stored in `flowaccount_tokens` collection in MongoDB Replica Set.

### PII Protection
- Sensitive data (Contact Names, Tax IDs) is **sanitized** in logs.
- Discord alerts do **not** contain PII.
