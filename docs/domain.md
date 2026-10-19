# Domain

## Product

The ISP Support AI platform is an AI-assisted customer support system designed for Internet Service Providers.

The platform helps support teams understand customer tickets, classify issues, prioritize requests, route tickets, and generate suggested responses.

AI assists support agents but does not replace deterministic business rules or human approval where required.

## Actors

### Customer

A customer uses the system to:

* Create support tickets.
* Describe problems in natural language.
* View their tickets.
* View ticket status.
* Communicate with support agents.

### Support Agent

A support agent uses the system to:

* View assigned tickets.
* Review customer information.
* Review AI analysis.
* Override AI classifications when necessary.
* Review and edit AI-generated responses.
* Send responses.
* Update ticket status.
* Resolve tickets.

### Admin

An administrator manages the support system and AI configuration.

Potential responsibilities include:

* Managing support teams.
* Managing ticket categories.
* Managing AI configuration.
* Managing prompt versions.
* Reviewing AI usage and costs.
* Reviewing AI performance and evaluation results.

## Core Domain Concepts

### Customer

Represents an ISP customer.

Example attributes:

```text
id
name
email
phone
created_at
```

### Service

Represents an ISP service belonging to a customer.

A customer may have one or more services.

Relevant information may include:

* Package
* Connection type
* Installation date
* Router/ONT information
* Service status

### Ticket

A customer support request.

A ticket initially contains:

* Subject
* Description
* Customer
* Status
* Priority
* Assigned team
* Assigned agent
* Timestamps

### Ticket Message

Represents communication associated with a ticket.

A message can originate from:

* Customer
* Support Agent
* AI-generated suggestion

AI-generated content is a suggestion and should not automatically be treated as a customer-facing message.

### Support Team

Represents a group responsible for handling a specific class of support issues.

Examples:

* Network Operations
* Technical Support
* Billing
* Installation
* Customer Support

## Ticket Lifecycle

The initial ticket lifecycle is:

```text
OPEN
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

The exact transition rules should be enforced by the backend.

## Initial Ticket Categories

The initial category set includes:

### Connectivity

Examples:

* No Internet
* Frequent Disconnection
* Slow Internet
* High Latency
* Intermittent Connection
* Fiber Signal Loss

### Hardware

Examples:

* Router Issue
* ONT Issue
* WiFi Issue
* Device Configuration

### Billing

Examples:

* Payment Issue
* Incorrect Bill
* Duplicate Charge
* Package/Subscription Issue

### Installation

Examples:

* New Installation
* Installation Delay
* Relocation

### Package

Examples:

* Upgrade
* Downgrade
* Package Information
* Add-ons

### Account

Examples:

* Login Issue
* Password Reset
* Account Information

### Other

Issues that do not fit into the defined categories.

## Ticket Priority

The initial priority levels are:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Priority may be suggested by AI but final business behavior must be governed by backend rules.

## Domain Workflow

A typical ticket workflow is:

```text
Customer creates ticket
        ↓
Ticket stored
        ↓
AI analyzes ticket
        ↓
AI result validated
        ↓
Backend business rules applied
        ↓
Ticket prioritized/routed
        ↓
Support agent reviews ticket
        ↓
AI suggests response
        ↓
Agent reviews/edits response
        ↓
Response sent to customer
        ↓
Ticket resolved
```

## Important Domain Rule

AI provides interpretation and recommendations.

The backend remains responsible for enforcing business rules.

For example:

```text
AI:
category = CONNECTIVITY
issue_type = FIBER_SIGNAL_LOSS

Backend:
FIBER_SIGNAL_LOSS → NETWORK_OPERATIONS
```

The AI should not directly assign agents, modify billing information, perform refunds, or execute other critical business operations.

## Domain Evolution

This document describes the initial domain model.

New domain concepts should be added only when required by an actual product capability or business requirement.
