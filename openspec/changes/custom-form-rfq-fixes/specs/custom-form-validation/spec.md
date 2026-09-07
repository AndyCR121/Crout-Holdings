## Purpose

Defines the custom-form renderer's field-level validation contract for phone-formatted fields and required item lists, so a form builder's configured rules are actually enforced at submission time rather than silently ignored.

## ADDED Requirements

### Requirement: Phone-formatted field default validation
The system SHALL validate a field configured with a "phone" formatter and no builder-authored validation pattern against the South African mobile number format (spaces, hyphens, and parentheses stripped before matching; optionally prefixed `+27` or a leading `0`, followed by a digit `6`-`8` and 8 further digits).

#### Scenario: Invalid phone number is rejected
- **WHEN** a submitter enters a value that does not match the South African mobile format into a phone-formatted field with no builder-authored validation pattern
- **THEN** validation fails for that field and the submission is not sent

#### Scenario: Valid South African mobile number is accepted
- **WHEN** a submitter enters a value matching the South African mobile format, with or without spaces, and with either a `+27` or a leading `0` prefix
- **THEN** validation passes for that field

### Requirement: Builder-authored pattern overrides the phone default
The system SHALL validate a phone-formatted field against the form builder's own explicitly configured validation pattern instead of the South African default, whenever both are present on that field.

#### Scenario: Custom pattern takes precedence
- **WHEN** a phone-formatted field has an explicitly configured validation pattern and a submitter enters a value that matches that pattern but not the South African default format
- **THEN** validation passes for that field

### Requirement: Required item list enforces a minimum item count
The system SHALL fail validation for a list-type form element configured with a minimum item count of 1 or greater when the number of submitted items is below that minimum, in addition to validating each submitted item's own fields.

#### Scenario: Empty required list blocks submission
- **WHEN** a submitter attempts to submit a form whose list element is configured with a minimum of at least 1 item and zero items have been added
- **THEN** validation fails and the submission is not sent

#### Scenario: List without a configured minimum stays optional
- **WHEN** a submitter submits a form whose list element has no minimum item count configured, or a configured minimum of zero, and zero items have been added
- **THEN** validation passes
