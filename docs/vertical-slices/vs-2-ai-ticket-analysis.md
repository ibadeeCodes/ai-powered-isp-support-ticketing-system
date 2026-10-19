VS2 — AI Ticket Analysis
Goal

When a customer submits a ticket, the system analyzes the ticket's subject and description using an LLM and stores the resulting structured analysis.

User outcome

Customer submits:

Subject: Internet completely stopped
Description: My fiber internet has been down since this morning. The ONT is showing a red LOS light.

The system produces something like:

{
  "category": "CONNECTIVITY",
  "issue_type": "FIBER_SIGNAL_LOSS",
  "severity": "HIGH",
  "sentiment": "FRUSTRATED",
  "intent": "RESTORE_INTERNET",
  "requires_technician": true,
  "confidence": 0.96
}

The customer does not need to see this in this slice. This is an internal AI capability.

Scope
Backend

Add an AI analysis workflow that:

Receives a newly created ticket.
Sends relevant ticket information to the LLM.
Requests a strict structured response.
Validates the LLM response.
Stores the analysis in ai_analyses.
Records useful AI metadata such as:
model
prompt version
confidence
token usage if available
latency if available
Handles LLM failures gracefully.
AI classification

The LLM should determine:

category
issue_type
severity
sentiment
intent
requires_technician
confidence

Use the categories and issue types already defined in docs/domain.md.

The model must not invent new categories or issue types.

Use structured output/schema rather than asking the model to return arbitrary JSON. Gemini supports structured outputs with JSON Schema and recommends application-level validation even when the output conforms to the schema.

Important architecture

Do not do this:

POST /tickets
      ↓
LLM
      ↓
AI analysis
      ↓
Save ticket
      ↓
Response

Because now an LLM outage can prevent ticket creation.

Instead:

POST /tickets
      ↓
Save Ticket
      ↓
Return success
      │
      └────→ AI Analysis
                 ↓
              LLM
                 ↓
          Validate output
                 ↓
          Save AI Analysis

The ticket is the core business operation.

AI analysis is an enrichment operation.

For this slice, the simplest implementation can trigger analysis after ticket creation without introducing a full queue/event infrastructure unless the existing architecture already has one.

AI mental model in this slice
Ticket
  ↓
AI Service
  ↓
Prompt + Ticket Data
  ↓
Gemini
  ↓
Structured AI Output
  ↓
Schema Validation
  ↓
Domain Validation
  ↓
AI Analysis

And remember:

LLM interprets. Backend validates and decides.

The LLM should not assign the support team yet.

For example:

LLM:
FIBER_SIGNAL_LOSS

Backend:
FIBER_SIGNAL_LOSS → NETWORK_OPERATIONS

Deterministic routing belongs to the later routing slice.

Database

Create/use:

ai_analyses

Suggested information:

id
ticket_id
category
issue_type
severity
sentiment
intent
requires_technician
confidence
model
prompt_version
input_tokens
output_tokens
latency_ms
created_at

One thing to explicitly review before implementation:

Your current ERD had Ticket 1:1 AiAnalysis, but AI systems naturally evolve toward re-analysis/versioning.

For this slice, don't let the agent silently change that relationship. Make the relationship decision explicit before implementation.

Out of scope

Do not implement:

deterministic team routing
AI-generated responses
RAG
vector database
agents
function calling
customer-facing AI
ticket conversation/chat
notifications
AI evaluation system
human approval workflow
automatic technician dispatch

This slice is simply:

Ticket → LLM analysis → validated structured result → persistence

Acceptance Criteria
Existing ticket can be analyzed.
Subject + description are sent to the LLM.
LLM receives a well-defined classification prompt.
LLM returns structured output.
Output is schema-validated.
Invalid/unknown classification values are rejected.
Valid analysis is persisted.
Model and prompt version are recorded.
Token/latency metadata is recorded when available.
LLM failure does not cause the original ticket creation to fail.
LLM timeout/error is handled gracefully.
LLM calls are mocked in automated tests.
No routing or customer-facing AI is implemented.
Recommended model

Use:

Gemini 2.5 Flash

Why:

Free tier currently available.
Good fit for classification/extraction.
Fast enough for this use case.
Structured JSON output support.
Cheap to continue with after the free tier if you eventually need paid usage.