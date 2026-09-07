## Purpose

Serves a single Custom Form to an unauthenticated external visitor via a share-link token, reproducing the authenticated in-portal form's rendering, validation, and submission behavior while remaining unable to authenticate, disclose information about, or reach anything beyond that one form.

## ADDED Requirements

### Requirement: Public form page requires no login
The system SHALL serve a public, unauthenticated page at the share URL that renders only the Custom Form identified by the link's token — using the same field rendering, validation, and dynamic-form behavior as the authenticated in-portal renderer — with no Crout Automations login, portal chrome, or account context. The page MAY show the owning company and service name as light branding, and SHALL NOT show any other account context.

#### Scenario: Recipient opens a valid link
- **WHEN** a visitor with no session opens a valid, unexpired, unrevoked share URL
- **THEN** the visitor sees the rendered Custom Form, optionally with the company/service name, and is not redirected to any login page

#### Scenario: Recipient opens an invalid, expired, or revoked link
- **WHEN** a visitor opens a share URL whose token does not resolve to any active share link (never existed, expired, or revoked)
- **THEN** the visitor sees a generic "this link is no longer available" state with no information about why or what it used to point to

### Requirement: Public submission executes the real workflow
The system SHALL, when a visitor submits the public form, execute the same underlying n8n webhook call that an authenticated in-portal submission of that Custom Form would make, including the same field validation rules already enforced by the shared renderer, and record the execution for the owner's audit trail.

#### Scenario: Valid submission is delivered
- **WHEN** a visitor fills in all required fields correctly on the public form and submits
- **THEN** the submission reaches the same n8n webhook the authenticated flow would call, and the visitor sees the form's configured response

#### Scenario: Invalid submission is blocked client-side
- **WHEN** a visitor leaves a required field empty or enters an invalid value and attempts to submit
- **THEN** the same validation that blocks an authenticated submission today blocks this one, with the same inline error messaging

### Requirement: Share token is scoped to exactly one action, not a session
The system SHALL authorize the public endpoints using a distinct, purpose-built token mechanism — never a Crout Automations user JWT, session, or any credential that could also authenticate any other API route — such that possessing a share token grants only reading that one form's published schema and submitting that one form. It SHALL NOT grant access to any other service, company, credential, admin, or dev endpoint, regardless of the token holder's or the link owner's other permissions.

#### Scenario: Share token cannot reach unrelated endpoints
- **WHEN** a valid share token for Form A is presented, by any means, to any endpoint other than that form's public read/submit endpoints
- **THEN** the request is rejected

#### Scenario: Share token cannot reach a different form
- **WHEN** a valid share token for Form A is used to try to read or submit Form B's public endpoint
- **THEN** the request is rejected

### Requirement: Only the published form is ever served publicly
The system SHALL serve the form's published schema (never its draft schema) to the public endpoint, matching the same published-vs-draft distinction the authenticated flow already respects. If a form has never been published, its share link SHALL NOT resolve to a fillable form.

#### Scenario: Unpublished form has no working share link
- **WHEN** the public share URL is requested for a Custom Form that has only a draft schema and has never been published
- **THEN** the visitor sees an unavailable state, not the draft content

### Requirement: No enumeration or information disclosure on invalid tokens
The system SHALL respond identically (same status code, same generic message, same timing characteristics within reason) whether a presented token never existed, has expired, or has been revoked, and SHALL NOT leak the associated company name, service name, form title, or owner identity in that response.

#### Scenario: Guessed token reveals nothing
- **WHEN** the public endpoint processes a syntactically plausible but non-existent token
- **THEN** the response is indistinguishable from an expired/revoked token response

### Requirement: Rate limiting on public endpoints
The system SHALL apply rate limiting to the public read and submit endpoints (per token and/or per source IP) to constrain token-guessing and submission-flooding, independent of any rate limiting that may or may not already apply to authenticated endpoints.

#### Scenario: Excessive requests are throttled
- **WHEN** a client sends requests to a public share endpoint far above normal single-user usage and the threshold is exceeded
- **THEN** further requests are rejected/throttled rather than processed
