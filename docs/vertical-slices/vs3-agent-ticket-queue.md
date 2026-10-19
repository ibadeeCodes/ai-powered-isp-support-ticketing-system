# Agent Dashboard & Ticket Prioritization Rules

## Purpose

Define the implementation rules for **VS3 — Agent Ticket Queue & AI Prioritization**.

VS3 builds on the ticket creation and AI analysis capability implemented in VS1.

The goal is to provide support agents with a ticket queue that allows them to:

* View relevant tickets
* Filter and paginate tickets
* See persisted AI insights
* Understand why tickets require attention
* Prioritize tickets using deterministic backend rules

The AI analysis generated in VS1 is an **input to prioritization**, not the authority responsible for determining business priority.

---

## Applicable Rules

@global
@backend
@database
@testing
@ai-integration

---

# 1. Scope

## In Scope

VS3 includes:

### Backend

* Agent ticket queue API
* Ticket retrieval
* Pagination
* Filtering
* Sorting
* AI analysis retrieval
* Deterministic priority scoring
* Dashboard-specific response DTO
* Appropriate database indexes
* Unit tests for prioritization
* API/integration tests for ticket retrieval

### Frontend

* Agent dashboard
* Ticket queue/table
* Ticket summary information
* AI insight display
* Priority display
* Filters
* Pagination
* Loading state
* Empty state
* Error state

---

## Out of Scope

Do not implement the following in VS3:

* Ticket assignment
* Ticket status mutation
* Ticket resolution
* Agent notes
* Customer responses
* AI-generated customer responses
* RAG
* Vector database
* Knowledge base
* AI agents
* Autonomous ticket actions
* Real-time notifications
* WebSockets
* Complex analytics/reporting
* New LLM calls

These may be implemented in future vertical slices.

---

# 2. Core Architectural Principle

The system follows:

> **AI interprets. Backend decides.**

The AI analysis produced by VS1 provides signals such as:

* category
* issue type
* severity
* sentiment
* intent
* technician requirement
* suggested team
* confidence

The backend must use deterministic business rules to convert these signals into an operational priority.

The LLM must NOT directly determine:

* dashboard ordering
* priority score
* SLA status
* ticket assignment
* business decisions

---

# 3. Architecture

The dashboard should follow the existing NestJS modular architecture.

Conceptually:

```text
Agent Dashboard
      ↓
Agent Ticket Controller
      ↓
Agent Ticket Query / Use Case
      ↓
Ticket Repository
      ↓
Ticket + AI Analysis
      ↓
Priority Calculation
      ↓
Dashboard Response DTO
```

Recommended separation:

```text
Agent Controller
        ↓
GetAgentTicketsUseCase
        ↓
TicketQueryService
        ↓
PriorityService
        ↓
Ticket Repository
```

The exact class names may be adapted to the existing codebase, but responsibilities must remain separated.

---

# 4. Responsibility Boundaries

## Controller

Responsible only for HTTP concerns:

* Query parameters
* Request validation
* Authentication/authorization integration
* Calling the application service/use case
* Returning the response

The controller must not:

* calculate priority
* construct database queries directly
* contain business rules
* manipulate AI analysis

---

## Application Service / Use Case

Responsible for orchestrating the dashboard request.

It should:

1. Validate/receive filter criteria
2. Retrieve the required ticket data
3. Apply or invoke prioritization logic
4. Construct the dashboard response
5. Return paginated results

---

## Ticket Query / Repository Layer

Responsible for efficient database access.

It should:

* retrieve tickets
* retrieve required AI analysis
* apply supported filters
* apply pagination
* avoid N+1 queries
* use appropriate indexes

Do not fetch tickets and then execute a separate database query for AI analysis for every ticket.

---

## Priority Service

The priority calculation must be deterministic.

It should receive structured ticket/AI information and return:

```ts
{
  priorityScore: number;
  priority: Priority;
}
```

The service must not call the LLM.

The same input must produce the same result.

---

# 5. AI Analysis as Input

VS3 consumes the AI analysis persisted by VS1.

Example:

```json
{
  "category": "CONNECTIVITY",
  "issueType": "FIBER_SIGNAL_LOSS",
  "severity": "HIGH",
  "sentiment": "FRUSTRATED",
  "intent": "RESTORE_INTERNET",
  "requiresTechnician": true,
  "suggestedTeam": "NETWORK_OPERATIONS",
  "confidence": 0.96
}
```

AI analysis must be treated as untrusted application data.

Do not assume that an AI value is correct merely because it passed schema validation.

Business rules must determine how the value affects prioritization.

---

# 6. Priority Calculation

VS3 should introduce a deterministic priority scoring mechanism.

The score should be calculated from defined business factors.

Example:

```text
Priority Score =
    Severity Weight
  + Technician Requirement Weight
  + Waiting Time Weight
  + SLA Risk Weight
  + Sentiment Weight
```

The exact weights should be explicitly defined in the implementation plan or configuration.

Do not allow the LLM to dynamically generate weights.

---

# 7. Example Priority Factors

The initial implementation may use factors such as:

### Severity

```text
CRITICAL → 40
HIGH     → 25
MEDIUM   → 15
LOW      → 5
```

### Technician Required

```text
true  → +15
false → +0
```

### Customer Waiting Time

Example:

```text
< 30 minutes → +0
30–120 min   → +5
> 120 min    → +10
```

### Sentiment

Example:

```text
FRUSTRATED → +5
NEUTRAL    → +0
SATISFIED  → +0
```

These values are example business rules for the practice project.

They must be centralized rather than scattered throughout controllers or queries.

---

# 8. Priority vs AI Severity

Do not treat these as the same concept.

**AI severity:**

> How severe does the AI believe the reported issue is?

**Operational priority:**

> How urgently should the support organization handle this ticket?

For example:

```text
AI Severity: HIGH
Technician Required: true
Waiting Time: 3 hours

                ↓

Operational Priority Score: 50
```

This distinction should remain explicit in the domain model and API.

---

# 9. Priority Ordering

The default dashboard ordering should prioritize tickets requiring the most attention.

The ordering must be deterministic.

Recommended ordering:

```text
priorityScore DESC
createdAt ASC
id ASC
```

The final `id` ordering provides deterministic ordering when other values are identical.

Do not rely on database default ordering.

---

# 10. Filtering

The dashboard API should support filters required by the UI.

Potential filters:

```text
status
category
priority
severity
suggestedTeam
requiresTechnician
```

Example:

```http
GET /agent/tickets?
status=OPEN&
category=CONNECTIVITY&
priority=HIGH&
page=1&
limit=20
```

All query parameters must be validated using DTOs.

Do not accept arbitrary database column names for sorting or filtering.

---

# 11. Pagination

The API must use pagination.

Example:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

The implementation must:

* enforce a maximum page size
* provide sensible defaults
* avoid loading the entire ticket collection into memory
* use database-level pagination

Do not retrieve every ticket and sort/filter everything in application memory.

---

# 12. Dashboard Response DTO

The API should expose a dashboard-specific response rather than exposing database entities directly.

Example:

```json
{
  "items": [
    {
      "id": "T-1042",
      "subject": "Internet completely down",
      "status": "OPEN",
      "priority": "HIGH",
      "priorityScore": 65,
      "createdAt": "2026-09-19T10:30:00Z",

      "ai": {
        "category": "CONNECTIVITY",
        "issueType": "FIBER_SIGNAL_LOSS",
        "severity": "HIGH",
        "sentiment": "FRUSTRATED",
        "requiresTechnician": true,
        "suggestedTeam": "NETWORK_OPERATIONS",
        "confidence": 0.96
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Do not expose unnecessary internal database fields.

---

# 13. Missing AI Analysis

The system must explicitly handle tickets where AI analysis is missing.

Do not crash the dashboard.

Possible behavior:

```text
AI analysis unavailable
        ↓
priority calculation uses available deterministic factors
        ↓
ticket remains visible
```

The implementation should clearly distinguish:

```text
AI analysis available
AI analysis unavailable
```

Do not fabricate AI values.

---

# 14. Low AI Confidence

AI confidence is informational in VS3.

Do not automatically assume:

```text
confidence < X → ticket is low priority
```

unless such a rule has explicitly been defined as a business requirement.

The dashboard may display confidence so that agents understand the reliability of the AI-generated interpretation.

---

# 15. Database Performance

The dashboard is a read-heavy workflow.

The implementation must consider indexes for fields used frequently in:

* status filtering
* category filtering
* priority filtering
* creation-time ordering
* team filtering

Before adding indexes, inspect the existing schema and migrations.

Do not blindly create indexes on every column.

Avoid N+1 queries.

The query should efficiently retrieve the ticket and its associated AI analysis.

---

# 16. Frontend Dashboard

The dashboard should provide:

### Ticket Queue

Display:

* Ticket ID
* Subject
* Category
* Issue type
* Priority
* AI severity
* Sentiment
* Technician required
* Suggested team
* Created time
* Priority score

### Filters

Provide filters for relevant fields.

### Priority Visualization

The UI should make higher-priority tickets easy to identify.

Do not rely exclusively on color.

Use textual labels and/or icons where appropriate.

---

# 17. Loading / Empty / Error States

The frontend must explicitly handle:

### Loading

Show an appropriate loading state while tickets are being fetched.

### Empty

Show a useful message when no tickets match the filters.

### Error

Show an actionable error state when the API request fails.

Do not silently fail.

---

# 18. API Contract

The API contract should be documented through Swagger/OpenAPI.

Document:

* endpoint
* query parameters
* response structure
* pagination
* possible errors
* filter values

Frontend implementation should consume the API contract rather than duplicating backend business logic.

---

# 19. Testing

## Priority Service Tests

Test deterministic behavior for:

* each severity
* technician required / not required
* waiting-time boundaries
* sentiment
* combinations of factors
* identical inputs producing identical outputs

Example:

```text
Input A → score 65
Input A → score 65
```

---

## Repository / Query Tests

Verify:

* filters
* pagination
* ordering
* AI analysis retrieval
* no unintended N+1 behavior

---

## API Tests

Verify:

* valid requests
* invalid query parameters
* pagination
* filtering
* sorting
* empty results
* missing AI analysis

---

## Frontend Tests

Test important dashboard behavior:

* tickets render
* filters work
* pagination works
* loading state
* empty state
* error state
* AI insights display correctly

---

# 20. Security and Authorization

The dashboard is an agent-facing capability.

Do not assume that anyone who can call the endpoint is allowed to view all tickets.

Use the existing authentication/authorization architecture if already implemented.

Do not introduce a parallel authentication mechanism inside this slice.

Agents should only receive data they are authorized to access.

---

# 21. Observability

For the dashboard API, capture useful operational metrics such as:

* request latency
* error rate
* ticket query duration
* pagination/filter usage where useful

Do not log unnecessary customer-sensitive information.

Since VS3 does not introduce a new LLM call, there should be no additional LLM cost or model invocation from the dashboard.

---

# 22. Important Architectural Constraint

Do not duplicate AI analysis logic in the dashboard.

The dashboard must consume the persisted analysis created by VS1.

Do not do:

```text
Agent Dashboard
      ↓
LLM
      ↓
"Tell me which ticket is important"
```

Instead:

```text
Ticket
   ↓
Persisted AI Analysis
   ↓
Deterministic Priority Engine
   ↓
Agent Queue
```

This ensures:

* predictable behavior
* reproducible prioritization
* lower cost
* lower latency
* easier testing
* easier auditing

---

# 23. Implementation Guidance for the Coding Agent

Before modifying code:

1. Inspect the existing ticket creation implementation.
2. Inspect the existing AI module and persisted AI analysis model.
3. Inspect ticket entities and relationships.
4. Inspect existing authentication/authorization.
5. Inspect existing frontend structure.
6. Inspect existing migrations and indexes.
7. Identify reusable query/pagination patterns already present.
8. Do not duplicate existing functionality.

Before implementation, produce a concise implementation plan identifying:

* files/modules to change
* API contract
* database/query strategy
* priority calculation strategy
* frontend components
* tests
* any required migrations

Do not implement until the plan is consistent with this specification and the existing architecture.

---

# 24. Change-Scope Rule

Implement only VS3.

Do not perform unrelated refactoring.

If an existing implementation prevents VS3 from being implemented cleanly:

1. Identify the problem.
2. Explain the architectural impact.
3. Propose the smallest appropriate change.
4. Wait for approval if the change alters an existing architectural boundary.

Do not silently redesign VS1.

---

# 25. Definition of Done

VS3 is complete when:

* [ ] Agent dashboard exists.
* [ ] Agent can retrieve tickets through a dedicated API.
* [ ] Tickets are paginated.
* [ ] Required filters work.
* [ ] Tickets are deterministically prioritized.
* [ ] Priority score is explainable from defined factors.
* [ ] Persisted AI insights are displayed.
* [ ] Dashboard does not invoke the LLM.
* [ ] Missing AI analysis is handled safely.
* [ ] API uses DTOs and documented contracts.
* [ ] Database query avoids N+1 behavior.
* [ ] Appropriate indexes are present.
* [ ] Priority logic has unit tests.
* [ ] API/query behavior has tests.
* [ ] Frontend loading, empty, and error states exist.
* [ ] Authorization follows the existing security architecture.
* [ ] No unrelated functionality was introduced.
* [ ] Existing VS1 functionality remains working.
* [ ] The implementation has been reviewed against this specification.

---

# Core Mental Model

```text
VS1

Customer
   ↓
Ticket
   ↓
AI Analysis
   ↓
Persist


VS3

Persisted Ticket
      +
Persisted AI Analysis
      ↓
Deterministic Priority Engine
      ↓
Agent Ticket Queue
      ↓
Agent understands:
"What should I look at first, and why?"
```

The fundamental boundary remains:

> **AI interprets. Backend decides. Agent acts.**
