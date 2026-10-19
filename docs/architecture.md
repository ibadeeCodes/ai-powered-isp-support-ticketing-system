# System Architecture

## Overview

The ISP Support AI platform is a web application that helps Internet Service Providers automate and assist with customer support ticket handling.

The system consists of:

* Next.js frontend
* NestJS backend
* PostgreSQL database
* LLM API for AI capabilities

The frontend communicates with the backend through REST APIs. The backend owns business logic, persistence, AI orchestration, validation, and deterministic business rules.

## High-Level Architecture

```text
                    ┌─────────────────────┐
                    │      Customer       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Next.js Frontend  │
                    │                     │
                    │ Customer Portal     │
                    │ Support Dashboard   │
                    └──────────┬──────────┘
                               │
                            REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │    NestJS Backend   │
                    │                     │
                    │ Ticket Management   │
                    │ Customer Management │
                    │ Support Teams       │
                    │ AI Orchestration    │
                    │ Business Rules      │
                    └──────┬───────┬──────┘
                           │       │
                           │       ▼
                           │  ┌─────────────┐
                           │  │   LLM API   │
                           │  └─────────────┘
                           │
                           ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    └─────────────────────┘
```

## Frontend

The frontend uses Next.js and TypeScript.

The frontend is responsible for:

* Rendering the user interface.
* Collecting user input.
* Displaying tickets and ticket details.
* Displaying AI analysis.
* Displaying AI-generated response suggestions.
* Allowing support agents to review and modify AI suggestions.
* Communicating with the backend API.

The frontend must not contain core business rules or make direct database/LLM calls.

## Backend

The backend uses NestJS and TypeScript.

The backend is responsible for:

* API endpoints.
* Request validation.
* Business logic.
* Ticket management.
* Customer and service management.
* Support-team routing.
* AI orchestration.
* LLM response validation.
* Deterministic business rules.
* Database operations.
* AI usage and observability data.

The backend is the primary authority for application behavior.

## Core Backend Modules

The initial backend is organized around business domains:

```text
customers
services
tickets
support-teams
ai
common
```

The architecture should remain modular without introducing microservices unless a future requirement justifies them.

## Database

PostgreSQL is the primary database.

TypeORM is used for:

* Entities
* Repositories
* Migrations
* Database access

Core entities initially include:

* Customer
* Service
* Ticket
* Ticket Message
* Support Team
* AI Analysis
* Prompt Version

The exact schema should evolve based on actual application requirements.

## AI Integration

The backend communicates with an external LLM API.

The LLM is treated as an external, probabilistic dependency.

The general flow is:

```text
Ticket
   ↓
Backend
   ↓
AI Service
   ↓
LLM API
   ↓
Structured AI Response
   ↓
Validation
   ↓
Business Rules
   ↓
Database / Application
```

The LLM must not directly perform business-critical operations.

## Communication

Initial communication pattern:

```text
Next.js
   ↓
HTTP/REST
   ↓
NestJS
```

Streaming may be used for AI-generated responses where progressive output improves the support-agent experience.

## Architectural Principles

* Keep frontend and backend responsibilities clearly separated.
* Keep business logic in the backend.
* Treat external services as unreliable dependencies.
* Treat LLM output as untrusted input.
* Validate external input and AI output.
* Prefer deterministic backend rules for business-critical decisions.
* Keep AI-specific concerns isolated from core domain logic.
* Prefer simple architecture over premature distributed-system complexity.
* Avoid microservices, Kafka, Redis, vector databases, RAG, and agents until there is a concrete requirement for them.

## Deployment

Frontend and backend are separate applications within the same repository and may be deployed independently.

The deployment architecture should remain simple for the initial version and evolve as operational requirements become clearer.
