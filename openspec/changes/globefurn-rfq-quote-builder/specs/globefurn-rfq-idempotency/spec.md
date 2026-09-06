## Purpose

Prevents a retried or duplicate-delivered RFQ submission from producing a second Drive folder and quote copy for the same request, using a durable record of previously processed submissions.

## ADDED Requirements

### Requirement: Duplicate submission is detected before Drive creation
The system SHALL check whether the RFQ's unique identifier (`submission_id` for website RFQs, the email-derived identifier for email RFQs) has already been recorded as processed, before `Create folder` runs, and SHALL NOT create a new folder or copy the quote template when a match is found.

#### Scenario: A retried website submission produces no second folder
- **GIVEN** an RFQ with `submission_id = "web-20260901-0001"` was already processed and recorded
- **WHEN** a new webhook request arrives with the same `submission_id`
- **THEN** no new Drive folder or quote file copy is created for that submission

#### Scenario: A retried email produces no second folder
- **GIVEN** an RFQ with a given email-derived identifier was already processed and recorded
- **WHEN** the same email is re-delivered or re-processed and normalizes to the same identifier
- **THEN** no new Drive folder or quote file copy is created for that identifier

#### Scenario: A genuinely new submission is not blocked
- **GIVEN** an RFQ with a `submission_id` that has no prior record
- **WHEN** the idempotency check runs
- **THEN** `Create folder` proceeds normally

### Requirement: Processed submissions are durably recorded
The system SHALL record each newly processed RFQ's unique identifier, source, and resulting Drive destination reference at or before folder creation, so later executions can detect it as a duplicate.

#### Scenario: A first-time submission is recorded after its folder is created
- **GIVEN** a new RFQ with no prior idempotency record
- **WHEN** its Drive folder and quote copy are successfully created
- **THEN** a record is stored containing at least its unique identifier, source, and the created folder's reference

### Requirement: Idempotency check runs after intake validation
The system SHALL perform the duplicate check only for RFQs that have already passed structured-output and schema validation, so a malformed submission is rejected on its own terms rather than being recorded or treated as a duplicate.

#### Scenario: A malformed submission never reaches the idempotency check
- **GIVEN** an RFQ that fails schema validation (for example, `products` is not an array)
- **WHEN** the workflow processes it
- **THEN** it is rejected before the idempotency check runs, and no idempotency record is created for it
