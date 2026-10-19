# ISP AI Support Ticketing System — Backend

Backend API and background processing service built with **[NestJS](https://nestjs.com/)**, **TypeScript**, **[TypeORM](https://typeorm.io/)**, **PostgreSQL**, **BullMQ (Redis)**, and **Google Gemini AI**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration](#3-environment-configuration)
4. [Project Setup & Startup](#4-project-setup--startup)
5. [Database Migrations](#5-database-migrations)
6. [Database Seeding & Default Accounts](#6-database-seeding--default-accounts)
7. [Production Release & Backfill Scripts](#7-production-release--backfill-scripts)
8. [Running Tests](#8-running-tests)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

- **REST API**: NestJS controllers secured with JWT authentication (`JwtAuthGuard`) and role-based access control (`RolesGuard`).
- **Database**: PostgreSQL managed via TypeORM with explicit schema migrations (`DB_SYNCHRONIZE=false` recommended for production).
- **Background Queue (`BullMQ` + `Redis`)**: Asynchronous ticket triage worker (`ticket-processing` queue) that runs AI analysis, resolves the target support team, and assigns the least-loaded eligible agent.
- **AI Analysis Engine**: Integrates with Google Gemini (`@google/genai` / REST API) to classify ticket category, issue type, severity, sentiment, intent, extracted entities, and suggested support team routing.
- **Team & Agent Access Control**:
  - **Queue Visibility**: Agents view all tickets assigned to their `SupportTeam`.
  - **Write Ownership**: Only the specifically assigned agent (`assigned_agent_id`) can update a ticket's status.

---

## 2. Prerequisites

- **Node.js**: `v18+` or `v20+` (v22 supported)
- **npm**: `v9+`
- **PostgreSQL**: `v16+` (local instance or via Docker)
- **Redis**: `v7+` (local instance via Docker or cloud Redis such as Upstash)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/apikey)

---

## 3. Environment Configuration

Navigate to the `backend` directory and create a `.env` file based on `.env.example`:

```bash
cd backend
cp .env.example .env
```

### `.env` Variables Reference

```env
PORT=3000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=isp_ticketing_db
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT Authentication
JWT_SECRET=isp_super_secure_jwt_secret_key_2026_dev
JWT_EXPIRES_IN=7d

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-3.1-flash-lite
AI_TIMEOUT_MS=15000
AI_MAX_RETRIES=1
AI_RETRY_DELAY_MS=2000
AI_ENABLED=true

# Redis / BullMQ Configuration
# For local Docker Redis: REDIS_HOST=localhost, REDIS_PORT=6379, REDIS_TLS=false
# For Upstash / Cloud Redis: set host, password, and REDIS_TLS=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

---

## 4. Project Setup & Startup

> **Important**: All backend commands below must be executed from inside the **`backend/`** directory unless noted otherwise.

### Step 1: Start Infrastructure (PostgreSQL & Redis)

From the **project root** directory, start the Docker containers:

```bash
docker compose up -d
```

Verify containers are healthy:

```bash
docker compose ps
```

### Step 2: Install Dependencies

Move into the `backend` directory and install packages:

```bash
cd backend
npm install
```

### Step 3: Run Migrations & Seed Database

Initialize the schema and populate baseline/development data:

```bash
# Run pending migrations
npm run typeorm:run

# Seed baseline teams, users, and mock development data
npm run seed:dev
```

*(Alternatively, run `npm run db:fresh` to drop the schema, re-run all migrations, and seed from scratch).*

### Step 4: Start the Backend Server

```bash
# Development mode (with file watching & hot-reload)
npm run start:dev

# Debug mode (with inspector & file watching)
npm run start:debug

# Production build & start
npm run build
npm run start:prod
```

Once started, the API listens on `http://localhost:3000`.

---

## 5. Database Migrations

TypeORM CLI commands are pre-configured in `package.json` using `./src/data-source.ts`.

| Action | Command |
| :--- | :--- |
| **Run pending migrations** | `npm run typeorm:run` |
| **Revert the last migration** | `npm run typeorm:revert` |
| **Generate a new migration** | `npm run typeorm:generate -- src/migrations/<MigrationName>` |
| **Drop entire database schema** | `npm run typeorm:drop` |

### Existing Migrations

1. `1725540000000-InitialCreateTicketSchema.ts` — Creates `customers` and `tickets` tables.
2. `1725540000001-CreateUsersTable.ts` — Creates `users` table with role enum (`CUSTOMER`, `AGENT`, `ADMIN`).
3. `1725540000002-CreateAiAnalysesTable.ts` — Creates `ticket_ai_analyses` table for AI classification results.
4. `1725540000003-AddAgentQueueIndexes.ts` — Adds composite indexes for queue sorting and filtering.
5. `1725540000004-AddTicketAssignmentSchema.ts` — Creates `support_teams` table and adds `support_team_id`, `assigned_team_id`, and `assigned_agent_id` foreign keys and indexes.

---

## 6. Database Seeding & Default Accounts

### Seeding Commands

| Command | Description |
| :--- | :--- |
| `npm run seed:dev` | Runs `DevelopmentSeeder` (seeds baseline teams, baseline users, mock customers, and mock agents). Idempotent (`upsert`). |
| `npm run db:fresh` | **Destructive**: Drops schema (`typeorm:drop`), runs all migrations (`typeorm:run`), and runs `seed:dev`. |

### Seeded Support Teams

| Team Name | Code | UUID |
| :--- | :--- | :--- |
| **Tier 1 Support** | `TIER_1` | `44444444-4444-4444-4444-444444444444` |
| **Network Operations** | `NETWORK_OPERATIONS` | `55555555-5555-4555-8555-555555555555` |
| **Technical Support** | `TECHNICAL_SUPPORT` | `66666666-6666-4666-8666-666666666666` |
| **Billing** | `BILLING` | `77777777-7777-4777-8777-777777777777` |
| **Installation** | `INSTALLATION` | `88888888-8888-4888-8888-888888888888` |

### Default Seeded User Credentials

| Name | Email | Password | Role | Support Team |
| :--- | :--- | :--- | :--- | :--- |
| **Ali Ahmed** | `ali@example.com` | `customer123` | `CUSTOMER` | — |
| **Haris** | `haris@example.com` | `agent123` | `AGENT` | Tier 1 Support (`TIER_1`) |
| **Tariq Network** | `tariq.net@example.com` | `agent123` | `AGENT` | Network Operations (`NETWORK_OPERATIONS`) |
| **Bilal Tech** | `bilal.tech@example.com` | `agent123` | `AGENT` | Technical Support (`TECHNICAL_SUPPORT`) |
| **Sara Billing** | `sara.billing@example.com` | `agent123` | `AGENT` | Billing (`BILLING`) |
| **Usman Field** | `usman.install@example.com` | `agent123` | `AGENT` | Installation (`INSTALLATION`) |

---

## 7. Production Release & Backfill Scripts

One-time release and data backfill scripts live in `src/scripts/release/`. They are designed to be **idempotent** and safe for production pipelines.

> **Note**: Always run these commands from inside the **`backend/`** folder.

### 1. `v1.0` — Essential Baseline Data & Unassigned Agent Backfill
Ensures baseline `SupportTeam` records exist, creates baseline accounts if missing, and maps any legacy `AGENT` users with `support_team_id IS NULL` to `TIER_1`.

```bash
# Via npm script
npm run release:v1.0

# Or directly via ts-node
npx ts-node -r tsconfig-paths/register src/scripts/release/v1.0-essential-and-backfill-data.ts
```

### 2. `v1.1` — Backfill Legacy `OPEN` Tickets
Verifies the target `Technical Support` team and agent exist, then assigns all legacy `OPEN` tickets (`assigned_team_id IS NULL AND status = 'OPEN'`) to Technical Support and the designated agent.

```bash
# Via npm script
npm run release:v1.1

# Or directly via ts-node
npx ts-node -r tsconfig-paths/register src/scripts/release/v1.1-backfill-legacy-open-tickets.ts
```

---

## 8. Running Tests

```bash
# Run all unit tests
npm test

# Run tests sequentially in-band (Recommended on Windows to prevent Jest V8 out-of-memory errors)
npx jest --runInBand

# Run a specific test suite
npx jest --runInBand src/agent-tickets/agent-tickets.service.spec.ts
```

### Type Checking & Formatting

```bash
# TypeScript compiler check (no output files)
npx tsc --noEmit

# Format codebase with Prettier
npm run format
```

---

## 9. API Endpoints Reference

| Method | Endpoint | Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Service health check |
| `POST` | `/auth/register` | Public | Register a new customer account |
| `POST` | `/auth/login` | Public | Authenticate user and receive JWT token |
| `GET` | `/auth/me` | Authenticated | Retrieve current authenticated user profile |
| `POST` | `/tickets` | `CUSTOMER`, `AGENT`, `ADMIN` | Create a new support ticket & enqueue AI triage |
| `GET` | `/tickets` | `CUSTOMER`, `AGENT`, `ADMIN` | List tickets (customers see only their own) |
| `GET` | `/tickets/:id` | `CUSTOMER`, `AGENT`, `ADMIN` | Get ticket details (includes `assignedTeam` & `assignedAgent`) |
| `GET` | `/agent/tickets` | `AGENT` | Paginated agent ticket queue (filtered by agent's `support_team_id`) |
| `GET` | `/agent/tickets/:id` | `AGENT` | Agent ticket detail view (requires team match; includes AI analysis & assignment) |
| `PATCH` | `/agent/tickets/:id/status` | `AGENT` | Update ticket status (requires team match **and** `assigned_agent_id` ownership) |
| `GET` | `/agent/customers` | `AGENT`, `ADMIN` | Search/list customers by phone number |
| `GET` | `/agent/customers/:id` | `AGENT`, `ADMIN` | View customer profile and ticket summary |
| `GET` | `/agent/customers/:id/tickets` | `AGENT`, `ADMIN` | Paginated list of a customer's tickets |

---

## 10. Troubleshooting

1. **`Error: Cannot find module './v1.1-backfill-legacy-open-tickets.ts'`**
   - **Cause**: Command was run from the repository root instead of the `backend/` folder.
   - **Fix**: Run `cd backend` first before executing `npm run` or `npx ts-node` commands.

2. **PowerShell Error: `running scripts is disabled on this system (npx.ps1 / npm.ps1)`**
   - **Fix**: Run commands via `cmd.exe /c "<command>"` or invoke `node` directly:
     ```powershell
     node ./node_modules/ts-node/dist/bin.js -r tsconfig-paths/register src/scripts/release/v1.1-backfill-legacy-open-tickets.ts
     ```

3. **Jest Error: `Fatal process out of memory: Zone`**
   - **Cause**: Parallel worker threads on Windows Node.js v22.
   - **Fix**: Always pass `--runInBand`:
     ```bash
     node ./node_modules/jest/bin/jest.js --runInBand
     ```
