# System Architecture

## Overview
Auto-Acct-001 is a modular monolith application built on the Bun runtime, designed for high-performance automated accounting.

## Components

### 1. Backend Service
- **Runtime**: Bun v1.x
- **Framework**: Express.js
- **Language**: TypeScript (Strict)
- **Architecture**: Modular Monolith (Controller-Service-Repository)

### 2. Database
- **Primary DB**: MongoDB v7.0
- **Configuration**: Replica Set (Required for Listings/Transactions)
- **CDM (Common Data Model)**:
  - `JournalEntry`: Double-entry accounting records (Medici)
  - `Client`: Customer profiles
  - `FileMetadata`: Tracking uploaded documents

### 3. External Integrations
- **FlowAccount**: Revenue data ingestion (OAuth2)
- **Teable**: No-code Admin UI for accountants (Webhooks)
- **Discord**: Critical system alerts
- **Google Drive**: File storage (Service Account)

## Data Flow

1. **Ingestion**: 
   - Cron jobs fetch data from FlowAccount API.
   - Files uploaded via API are stored in Google Drive (encrypted if sensitive).

2. **Processing**:
   - Data is normalized into DTOs.
   - Double-entry logic applied via `medici`.
   - Transactions are committed to MongoDB within ACID sessions.

3. **Approval**:
   - Accountants review data in Teable.
   - Approval triggers webhook to Backend.
   - Backend finalizes transactions.

## Security
- **Network**: All internal services behind VPN/Firewall (Tailscale in prod).
- **Encryption**: AES-256-GCM for sensitive files (Payroll, Bank Statements).
- **Compliance**: PDPA-aware logging (PII sanitization).
