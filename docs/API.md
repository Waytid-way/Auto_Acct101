# API Documentation

## Base URL
`http://localhost:4000/api`

## Endpoints

### Health Check
- **GET** `/health`
  - Returns system status, uptime, and database connectivity.
  - **Response**:
    ```json
    {
      "status": "ok",
      "uptime": 123,
      "mongodb": "connected"
    }
    ```

### Accounting (Phase 3)
- **POST** `/accounting/entries` (Draft Journal Entry)
- **POST** `/accounting/approve` (Approve Entry)

### FlowAccount Integration (Phase 2)
- **GET** `/flowaccount/authorize`
  - Initiates the OAuth 2.0 flow.
  - **Query Params**: `clientId` (string, required)
  - **Redirects**: To FlowAccount login page.

- **GET** `/flowaccount/callback`
  - OAuth callback URL. Handles code exchange.
  - **Query Params**: `code`, `state`

- **POST** `/flowaccount/revoke`
  - Revokes access for a client.
  - **Body**: `{ "clientId": "string" }`

### Export (Phase 2)
- **GET** `/export/csv`
  - Downloads approved journal entries as Express-compatible CSV.
  - **Query Params**:
    - `clientId`: string (required)
    - `startDate`: string (YYYY-MM-DD, required)
    - `endDate`: string (YYYY-MM-DD, required)
  - **Response**: `.csv` file download (UTF-8 BOM).

### Files
- **POST** `/files/upload` (Upload receipt/doc)

### Webhooks
- **POST** `/webhooks/teable`
  - Handles Teable events (e.g., record approval).
