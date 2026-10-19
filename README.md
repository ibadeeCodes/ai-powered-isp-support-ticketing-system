# Internet Service Provider (ISP) AI Support Ticketing System

An AI-native operational support and network diagnostics platform for modern Internet Service Providers. Designed to automate subscriber issue triage, correlate optical network telemetry, and streamline Network Operations Center (NOC) workflows.

---

## 🏗️ System Architecture

```
Internet Service Provider AI Support Ticketing System/
├── backend/                  # NestJS 10 API, TypeScript, TypeORM, PostgreSQL
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── tickets/          # Ticket entity, service, controller, and DTOs
│   │   ├── data-source.ts    # TypeORM migration data source
│   │   └── main.ts           # Application bootstrap (Port 3000)
│   └── package.json
│
├── frontend/                 # Next.js 14 App Router, React 18, Tailwind CSS
│   ├── src/
│   │   ├── app/              # App router pages & layouts (Port 3001)
│   │   ├── lib/              # API client and utility helpers
│   │   └── types/            # Shared TypeScript interfaces
│   └── package.json
│
├── docs/                     # Technical & Domain Documentation
│   ├── architecture.md       # High-level architecture & sequence flows
│   ├── domain.md             # ISP business concepts, ticket lifecycle & SLAs
│   └── ai.md                 # AI triage pipelines, prompt design & guardrails
│
├── rules/                    # Project Conventions & AI Assistant Guidelines
│   ├── global.mdc            # Global coding and environment standards
│   ├── backend.mdc           # NestJS modular architecture & DTO validation
│   ├── database.mdc          # TypeORM schema rules & migration workflow
│   ├── ai-integration.mdc    # LLM structured outputs & telemetry fusion
│   └── testing.mdc           # Unit, integration, and E2E testing rules
│
├── docker-compose.yml        # Local PostgreSQL 16 & Redis 7 services
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18.x or v20.x)
- **Docker & Docker Compose** (for local PostgreSQL and Redis)
- **npm**

### 2. Start Infrastructure Services
Launch PostgreSQL and Redis using Docker Compose:
```bash
docker compose up -d
```
- **PostgreSQL**: `localhost:5432` (`user: postgres`, `password: postgres`, `db: isp_ticketing_db`)
- **Redis**: `localhost:6379`

### 3. Start the Backend (Port 3000)
```bash
cd backend
npm install
npm run start:dev
```
Health Check: [http://localhost:3000/health](http://localhost:3000/health)

### 4. Start the Frontend (Port 3001)
```bash
cd frontend
npm install
npm run dev
```
Open Dashboard: [http://localhost:3001](http://localhost:3001)

---

## 📚 Documentation

For in-depth guides, consult the `docs/` directory:
- [Architecture & Communication Flow](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/docs/architecture.md)
- [ISP Domain Model & Priority Matrix](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/docs/domain.md)
- [AI Triage & Telemetry Strategy](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/docs/ai.md)

---

## 📏 Engineering & AI Rules

Guidelines located in `rules/` ensure consistency across AI pair programming and developer workflows:
- [`global.mdc`](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/rules/global.mdc): General coding conventions, TypeScript standards, error handling.
- [`backend.mdc`](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/rules/backend.mdc): NestJS module patterns, DTO validation, service decoupling.
- [`database.mdc`](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/rules/database.mdc): TypeORM entities, migration workflows, indexing.
- [`ai-integration.mdc`](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/rules/ai-integration.mdc): Structured LLM outputs, telemetry fusion, guardrails.
- [`testing.mdc`](file:///d:/Development/AI-Native%20Development/Internet%20Service%20Provider%20AI%20Support%20Ticketing%20System/rules/testing.mdc): Unit, integration, and mock conventions.

