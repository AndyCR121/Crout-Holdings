## Purpose

Lets a portal user turn a service's confirmed Custom Form trigger into a revocable, shareable external link, and manage that link's lifecycle (generate, view usage, revoke, regenerate) without touching their own login credentials.

## ADDED Requirements

### Requirement: Share action appears only where eligible
The system SHALL show a "Share" action for a service row/detail view only when that service has a confirmed trigger add-on identified as a Custom Form ("Custom Form"/"Website Form", matching the same normalization already used to determine `HasConfirmedCustomFormTrigger`), on both the portal services list and the service details page.

#### Scenario: Share action hidden for services without a confirmed Custom Form
- **WHEN** a user views a service on their services page that has no confirmed trigger add-on named "Custom Form"/"Website Form"
- **THEN** no "Share" action is shown for that service

#### Scenario: Share action shown for an eligible service
- **WHEN** a user views a service that has a confirmed Custom Form trigger add-on
- **THEN** a "Share" action is available in the card/detail actions for that service

### Requirement: Generating a share link
The system SHALL let the service owner generate a share link for an eligible service's Custom Form from the "Share" action, returning a full URL the user can copy, without requiring the user to handle the underlying token separately from the URL. Each Custom Form SHALL have at most one active share link at a time; generating a new link while one exists replaces (invalidates) the prior one. The system SHALL store the token such that it cannot be recovered or redisplayed after generation — the full URL is shown to the owner only at the moment of generation.

#### Scenario: First-time link generation
- **WHEN** the user clicks "Share" on an eligible service that has no existing share link and confirms generation
- **THEN** the system creates a new share credential scoped to that service's Custom Form and returns a full shareable URL

#### Scenario: Reopening the Share panel does not reveal the URL again
- **WHEN** the owner reopens the Share panel for a service with an existing active share link, after having already seen the URL at generation time
- **THEN** the panel shows the link's metadata (created time, last-used time/usage count) but does not display or reconstruct the full URL or token; the owner must regenerate to get a new copyable URL if the original was lost

#### Scenario: Generating a new link replaces the old one
- **WHEN** the user generates a new share link for a Custom Form that already has an active share link
- **THEN** the prior link's token stops resolving to the form, and only the newly generated link is active

### Requirement: Link expiry, independent of the owner's login
The system SHALL assign each generated share link a fixed, long-lived expiry (on the order of one year) rather than making it valid indefinitely, and SHALL keep it valid independently of the owning user's own login state — the owner logging out, their session expiring, or their `token_version` being bumped (e.g. on password change) SHALL NOT invalidate an active share link.

#### Scenario: Share link outlives the owner's session
- **WHEN** a recipient uses a still-valid share link after the owner has logged out or their session has expired
- **THEN** the form still loads and can be submitted

#### Scenario: Share link expires after its fixed window
- **WHEN** a share link's fixed expiry window has elapsed
- **THEN** the link stops resolving to the form and the owner must generate a new one to restore access

### Requirement: Only the generating user can manage the link
The system SHALL restrict viewing, revoking, and regenerating a service's share link to the specific portal user who generated it (not the broader set of users with access to that service's company).

#### Scenario: A different user on the same company cannot manage the link
- **WHEN** a portal user other than the one who generated a service's active share link attempts to view, revoke, or regenerate it
- **THEN** the system denies the action

### Requirement: Revoke or regenerate
The system SHALL let the service owner revoke an active share link at any time from the same UI surface used to generate it, immediately invalidating it for any future request, and SHALL let them generate a new link afterward, which replaces any prior active link for that form.

#### Scenario: Revoked link stops working
- **WHEN** the owner revokes an active share link
- **THEN** any subsequent request using that link's token (page load or submission) is treated as invalid, identically to an expired or never-existed token

### Requirement: Owner-visible audit trail
The system SHALL record, for each share link, who created it and when, and for each use, that the public endpoint was used to view or submit the form and when, and SHALL surface this to the owner in the Share management UI (at minimum: last-used time and/or submission count) without exposing it to the public endpoint itself.

#### Scenario: Owner can see link activity
- **WHEN** a share link has been used to submit the form at least once and the owner views the service's Share management UI
- **THEN** the owner can see that the link has been used, including at minimum a last-used time and/or submission count
