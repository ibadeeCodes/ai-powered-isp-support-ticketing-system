# Project Agent Rules & Architectural Decisions

This file defines mandatory project-level architectural rules and links all domain rule files so that AI agents automatically follow established engineering decisions without needing re-discussion.

## Included Rule Modules

### Global & Foundational Rules
- @[Global Engineering Rules](./rules/global.mdc)
- @[AI Integration Rules](./rules/ai-integration.mdc)
- @[Testing Rules](./rules/testing.mdc)

### Application & Core Architecture (`rules/core/`)
- @[Modular Structure & Layer Responsibilities](./rules/core/module-structure-and-layers.mdc)
- @[Dependency Injection & Async Concurrency](./rules/core/dependency-injection-and-async.mdc)

### API Layer Architecture (`rules/api/`)
- @[REST Conventions & HTTP Verbs](./rules/api/rest-conventions.mdc)
- @[DTOs, Input Validation & Entity Isolation](./rules/api/dto-and-validation.mdc)
- @[Responses, Error Handling & API Docs](./rules/api/responses-and-errors.mdc)

### Asynchronous Processing & Queues (`rules/queues/`)
- @[Queue Architecture & Job Design](./rules/queues/job-design-and-queues.mdc)
- @[Worker Idempotency & Retries](./rules/queues/idempotency-and-retries.mdc)

### Database Architecture (`rules/database/`)
- @[Database Schema, Entities & Indexing](./rules/database/schema-and-entities.mdc)
- @[Migrations, Seeders & Production Release Scripts](./rules/database/migrations-seeders-scripts.mdc)
- @[Database Transactions & Concurrency](./rules/database/transactions.mdc)
- @[Database Queries & Performance](./rules/database/queries.mdc)

### Security & Access Control (`rules/security/`)
- @[Authentication & Identity Context](./rules/security/auth-and-identity.mdc)
- @[Authorization, RBAC & Resource Ownership](./rules/security/rbac-and-ownership.mdc)
- @[Data Sanitization & Leak Prevention](./rules/security/data-sanitization.mdc)
- @[Transport Security & Rate Limiting](./rules/security/transport-and-rate-limiting.mdc)
