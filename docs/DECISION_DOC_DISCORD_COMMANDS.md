# Decision Doc: Discord Interactive Commands (ADR-002)

**Status:** Approved
**Date:** 2026-01-18
**Author:** Expert Dev Team (Antigravity)

## 1. Context & Problem
Currently, the Auto-Acct101 systems uses **Webhooks** (One-way).
**The Ask:** Enable two-way communication for health checks, remote triggering, and log monitoring.

## 2. Technical Shift: "Small Elephant" Job
We will migrate from stateless Webhooks to a **Stateful Bot Client**.
-   **Dependency:** `discord.js` (Reference: User approval).
-   **Architecture:** Backend must maintain a persistent WebSocket connection.

## 3. Approved Command Set
We will implement **Slash Commands (`/`)** using best practices (Ephemeral Responses, Typed Options).

### 3.1 🟢 Operational Commands
| Command | Usage | Description | Permission |
| :--- | :--- | :--- | :--- |
| **/acct-status** | `/acct-status` | **(Healthcheck)** Check MongoDB connection, Queue depth, process uptime. | Team |
| **/acct-trigger** | `/acct-trigger [date]` | Manually trigger the daily export job. | **Admin** |
| **/acct-retry** | `/acct-retry [job_id]` | Retry a specific failed export job. | **Admin** |

### 3.2 🟡 Debugging & Monitoring (New)
| Command | Usage | Description | Safety |
| :--- | :--- | :--- | :--- |
| **/acct-logs** | `/acct-logs [lines]` | **(On-Demand)** Fetch last N lines from `combined.log`. Default 10. | **Ephemeral** (Private) |
| **/acct-ping** | `/acct-ping` | Simple latency check. | Public |

> **Note on Logs:** Real-time streaming is **REJECTED** due to rate limits. We use "On-Demand Tail" instead.

## 4. Best Practices Implementation

### 🛡️ Security & Access Control
1.  **Role-Based Access Control (RBAC):**
    - Commands like `/upgrade` or `/trigger` must check for a specific Discord Role.
2.  **Ephemeral Responses:**
    -  `/acct-logs` output must be `ephemeral: true`. Only the command caller sees it.
    - Prevents leaking sensitive data to the entire channel.

### ⚡ Technical Deployment
1.  **Singleton Client:** Initialize `DiscordClient` in `server.ts`.
2.  **Separate Service:** Logic lives in `modules/discord/DiscordBotService.ts`.
3.  **Graceful Degrade:** If Discord fails, the Cron Job must still run.

## 5. Implementation Roadmap
1.  **Install:** `npm install discord.js`.
2.  **Setup:** Create Application in Discord Portal -> Get Token.
3.  **Code:** Implement `DiscordBotService`.
4.  **Register:** Run script to register slash commands.

---
**Approved By:** User & Antigravity
