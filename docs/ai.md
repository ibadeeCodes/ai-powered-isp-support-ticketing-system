# AI Integration

## Purpose

AI is used to assist ISP support operations by interpreting unstructured customer messages and generating useful recommendations and response suggestions.

The AI layer is an application capability, not the owner of business logic.

## Initial AI Capabilities

The initial system will support:

1. Ticket classification
2. Issue identification
3. Severity/priority suggestion
4. Sentiment detection
5. Customer intent detection
6. Technician requirement detection
7. Support-team recommendation
8. AI-generated response suggestions

## Ticket Analysis

The ticket analysis workflow is:

```text
Subject + Description
        ↓
AI Service
        ↓
LLM
        ↓
Structured Output
        ↓
Schema Validation
        ↓
Application Validation
        ↓
Business Rules
        ↓
Persist AI Analysis
```

An initial AI analysis may contain:

```text
category
issue_type
severity
sentiment
intent
confidence
requires_technician
suggested_team
```

## Example

Customer ticket:

```text
Subject:
Internet disconnecting

Description:
My internet has been disconnecting since last night.
The LOS light on my device is blinking red.
I restarted the router several times but the problem
is still there.
```

Potential AI analysis:

```json
{
  "category": "CONNECTIVITY",
  "issue_type": "FIBER_SIGNAL_LOSS",
  "severity": "HIGH",
  "sentiment": "FRUSTRATED",
  "intent": "RESTORE_INTERNET",
  "requires_technician": true,
  "suggested_team": "NETWORK_OPERATIONS",
  "confidence": 0.96
}
```

The values above are examples and should not be treated as guaranteed model output.

## LLM as an Untrusted Dependency

LLM responses are probabilistic and must be treated as untrusted external input.

The application must not assume that an LLM response is:

* Correct
* Factual
* Complete
* Valid
* Safe
* Consistent

All machine-consumed AI output must be validated before use.

## Structured Outputs

AI operations that are consumed programmatically should use structured outputs where supported.

The expected output schema should be explicitly defined.

The application must validate the response against the expected schema.

```text
LLM
 ↓
Structured Output
 ↓
Schema Validation
 ↓
Application Validation
 ↓
Business Rules
```

Invalid output must never silently enter the business workflow.

## Business Rules vs AI

The system follows this principle:

> AI interprets. Backend decides.

For example:

```text
AI:
issue_type = FIBER_SIGNAL_LOSS

Backend:
FIBER_SIGNAL_LOSS → NETWORK_OPERATIONS
```

AI may recommend a team, but deterministic backend rules should enforce the final routing behavior where appropriate.

## AI Response Generation

The support-agent response workflow is:

```text
Ticket
  +
Relevant Customer/Service Context
        ↓
       LLM
        ↓
Suggested Response
        ↓
Support Agent
        ↓
Edit / Approve
        ↓
Customer
```

AI-generated responses require human review before being sent to the customer in the initial version.

## Prompt Management

Prompts should be:

* Explicit
* Focused
* Versioned
* Testable
* Separated from core business logic where practical

Each important AI analysis should record the prompt version used.

Prompt changes should be traceable.

## Model Selection

Different AI tasks may use different models.

Model selection should consider:

* Accuracy
* Latency
* Cost
* Task complexity

Simple classification should not automatically use the most expensive model.

## Token and Cost Tracking

For important AI operations, track:

* Model
* Input tokens
* Output tokens
* Total tokens
* Estimated cost
* Latency

This allows the system to evaluate AI operating costs and performance.

## Error Handling

The AI integration should explicitly handle:

* Provider errors
* Timeouts
* Rate limits
* Invalid responses
* Schema validation failures
* Context/token limits
* Temporary provider failures

A failed AI operation must not corrupt the underlying ticket workflow.

If AI analysis cannot be reliably completed, the ticket should remain available for human handling.

## Streaming

Streaming should be used where progressive output provides value, particularly for AI-generated support responses.

Streaming is not required for simple classification where the complete structured result is needed before proceeding.

## Human Oversight

Support agents must be able to:

* Review AI analysis.
* Override AI suggestions.
* Edit AI-generated responses.
* Approve or reject generated responses.

AI recommendations must not prevent normal human support workflows.

## Data Minimization

Only information necessary for an AI task should be sent to the LLM.

Do not send:

* Passwords
* Authentication tokens
* API keys
* Internal secrets
* Unrelated customer information
* Internal infrastructure information

unless a future, explicitly justified requirement requires it.

## AI Observability

Important AI operations should be traceable.

The system should be able to answer:

* Which model was used?
* Which prompt version was used?
* How many tokens were consumed?
* How long did the request take?
* Did validation succeed?
* What result was produced?
* Was the AI result overridden by a human?

## Future Evaluation

The project should eventually maintain a representative dataset of ISP support tickets.

The dataset can be used to evaluate:

* Classification accuracy
* Priority accuracy
* Intent accuracy
* Response quality
* Prompt changes
* Model changes
* Regression

AI changes should be evaluated against representative examples before being considered production-ready.
