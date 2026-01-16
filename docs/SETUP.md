# Auto-Acct-001 Setup Guide

## Prerequisites
- [Bun](https://bun.sh) v1.0.0+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for MongoDB & Teable)
- [Git](https://git-scm.com/)

## 1. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```
Update `.env` with your local configuration if needed (defautls work for local dev).

## 2. Start Infrastructure

Start MongoDB and Teable using Docker Compose:
```bash
docker-compose up -d
```
Wait for containers to be healthy.

## 3. Backend Setup

Navigate to backend directory and install dependencies:
```bash
cd backend
bun install
```

## 4. Running the Application

### Development Mode
```bash
bun dev
```
Server will start on http://localhost:4000

### Production Build
```bash
bun run build
bun start
```

## 5. Verification

Check the health endpoint:
```bash
curl http://localhost:4000/api/health
```
Response:
```json
{
  "status": "ok",
  "mongodb": "connected",
  ...
}
```
