## Purpose

Defines how the Globefurn RFQ intake normalization step accepts and identifies a custom-form-sourced submission now that the form no longer supplies its own submission identifier, while keeping the existing duplicate-submission protection working correctly.

## ADDED Requirements

### Requirement: Custom-form submissions accepted without a client-supplied identifier
The system SHALL accept a custom-form-sourced RFQ submission that carries no client-supplied submission identifier, without rejecting it for that reason.

#### Scenario: Submission without an identifier succeeds
- **WHEN** a custom-form-sourced RFQ submission arrives with no client-supplied submission identifier
- **THEN** the normalization step does not reject the submission for missing that identifier, and produces a normalized RFQ record carrying a non-empty submission identifier

### Requirement: Synthetic submission identifier derived from content
The system SHALL derive a submission identifier for a custom-form-sourced RFQ from the submission's own client and product content when no client-supplied identifier is present, such that identical content always derives the same identifier and different content derives a different identifier, and SHALL remain compatible with the existing duplicate-submission protection that keys on this identifier.

#### Scenario: Identical resubmission is recognized as a duplicate
- **WHEN** two custom-form-sourced submissions arrive with identical client and product content and neither supplies an identifier
- **THEN** both derive the same submission identifier, and the existing duplicate-submission protection treats the second as a duplicate

#### Scenario: Different submissions never collide
- **WHEN** two custom-form-sourced submissions arrive with different client or product content
- **THEN** they derive different submission identifiers

### Requirement: Case-insensitive request-type normalization
The system SHALL accept a product line's request type regardless of letter case (e.g. `"standard"`, `"Standard"`, `"STANDARD"`) and normalize it to the canonical `Standard`/`Custom`/`Flagged` value, rejecting only a value that does not match any of the three in any case.

#### Scenario: Lowercase request type is accepted and normalized
- **WHEN** a product line specifies its request type as a differently-cased variant of `Standard`, `Custom`, or `Flagged` (e.g. `"standard"`)
- **THEN** the normalization step accepts it and stores the canonical-cased value

#### Scenario: An unrecognized request type is still rejected
- **WHEN** a product line specifies a request type that does not match `Standard`, `Custom`, or `Flagged` in any case
- **THEN** the normalization step rejects the submission with an error identifying the invalid request type

### Requirement: Per-line quantity requirement enforced for custom-form submissions
The system SHALL reject a custom-form-sourced RFQ product line that has no quantity specified, consistent with the intake's existing quantity requirement for a submitted product line.

#### Scenario: Missing quantity on a custom-form line is rejected
- **WHEN** a custom-form-sourced RFQ product line has no quantity specified
- **THEN** the normalization step rejects the submission with an error identifying the missing quantity
