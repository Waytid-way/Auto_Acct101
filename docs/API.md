# API Documentation

## Base URL
`http://localhost:4000/api`

## Endpoints

### Health Check
- **GET** `/health`
- **Response**:
```json
{
  "status": "ok",
  "uptime": 123,
  "mongodb": "connected"
}
```

### Accounting
- **POST** `/accounting/entries` (Draft Journal Entry)
- **POST** `/accounting/approve` (Approve Entry)

### FlowAccount
- **GET** `/flowaccount/auth` (Start OAuth)
- **GET** `/flowaccount/sync` (Trigger Sync)

### Files
- **POST** `/files/upload` (Upload receipt/doc)

### Export
- **GET** `/export/express-csv` (Generate Express-compatible CSV)

## Webhooks
- **POST** `/webhooks/teable` (Handle Teable events)
