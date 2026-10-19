VS1 — Create Ticket

Goal:
Allow a customer to submit a support ticket and have it successfully persisted in the system.

User outcome:
A customer can enter a subject and description, submit the issue, and receive confirmation with the newly created ticket.

Scope

Frontend

Customer "Create Ticket" page/form
Subject field
Description field
Client-side validation
Submit/loading state
Success state showing ticket number/ID
Error state

Backend

POST /tickets
Request DTO:
subject
description
customer_id / customer identity according to the approved ERD/auth approach
DTO validation
Ticket creation service/use case
Persist ticket through TypeORM
Default ticket state:
status = OPEN
priority = MEDIUM — only if this is part of the approved domain model
Return created ticket information
Swagger documentation
Unit/API tests

Database

Use the already-approved Ticket entity/schema
Create required migration if not already done
Maintain the Customer → Ticket relationship

AI

None.
No classification
No LLM call
No routing
No AI analysis
End-to-end flow
Customer
   ↓
Create Ticket Form
   ↓
POST /tickets
   ↓
NestJS Controller
   ↓
Ticket Service
   ↓
PostgreSQL
   ↓
Created Ticket
   ↓
Frontend Success State
Acceptance criteria
Customer can submit a valid subject and description.
Backend validates the request.
Valid ticket is persisted in PostgreSQL.
Ticket is associated with the correct customer.
Ticket receives the correct initial status/defaults.
API returns the created ticket information.
Frontend displays successful creation.
Invalid input produces appropriate validation errors.
Backend tests cover the creation behavior and important failure cases.
No AI or unrelated functionality is introduced.
Explicitly out of scope
Ticket listing
Ticket details
Ticket tracking
Agent dashboard
Phone lookup
AI analysis
AI routing
AI response generation
Notifications
Authentication implementation