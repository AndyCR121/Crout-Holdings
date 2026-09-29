## Why

Filling in a client's Custom Form today requires being logged into the Crout Automations portal as the account holder, but the person who actually has the answers (e.g. a client's ops team member) usually isn't that account holder. There is no way to hand out access to "just fill in this one form" without sharing full login credentials. This change adds a purpose-built, revocable share link so a portal user can let someone without a Crout Automations account fill in one specific Custom Form.

## What Changes

- **BREAKING (security posture)**: introduces the app's first unauthenticated, internet-facing endpoint. **Originally shipped behind a `CUSTOM_FORM_SHARE_LINKS_ENABLED` flag defaulting off everywhere (including production) until the R12 security review was done — that flag and its code-level check were removed entirely per explicit instruction during local testing (see design.md's note). The feature is now unconditionally live in every environment, including production, with no runtime gate. The R12 review is still owed but is now a process gate only** — see design.md and tasks.md 8.1/8.2 for the full account of this reversal and its risk.
- Add a "Share" action on the portal services list and service details page, shown only for services with a confirmed Custom Form trigger add-on (reusing the existing `IsCustomFormName`/`HasConfirmedCustomFormTrigger` matching).
- Add share-link generation: creates one new opaque, server-validated, hashed token per Custom Form, replacing any prior active link for that form (single active link per form).
- Add revoke and regenerate actions on the same Share panel, independent of the owner's own login/session/`token_version`.
- Share method chosen at generation: **URL** (copy-link, today's behavior) or **Email** (app sends the link via the existing SMTP `EmailService`, to one or more validated recipient email chips, using a new client-facing HTML template).
- Link validity chosen at generation: a custom day count (1–365) or a "1 Year" preset (365 days) — no true indefinite option, preserving the original decision to avoid one; expired links must be regenerated.
- The link auto-revokes (no owner action) the moment its service's `UserService.Active` flips to `false` (disable, delete, or manual unpaid-marking) — the owner must generate a fresh link once the service is active again.
- Only the portal user who generated the link can view, revoke, or regenerate it (narrower than the existing company-wide `CompanyOwnerUserId` ownership check used elsewhere in the app — a deliberate scoping choice for this feature, not a platform-wide change).
- Add a new unguarded Angular route (e.g. `/forms/:token`) that renders only the one form the token resolves to, with light branding (company + service name only, no other account context), using the same field rendering/validation as the authenticated in-portal renderer.
- Add a new unauthenticated API surface (separate controller, no `[Authorize]`) that resolves a token to a form's published schema and executes submissions through the same `ExecuteCustomFormAsync`/webhook path the authenticated flow already uses.
- Only ever serves `PublishedSchemaJson`; a form with no published schema has no working share link.
- Uniform, generic "this link is no longer available" response for tokens that never existed, expired, or were revoked — no enumeration or information disclosure.
- Rate limiting (per token and/or per source IP) on the new public read/submit endpoints.
- Audit trail: who generated a link and when; each public view/submission is recorded (reusing `ServiceTriggerExecution`'s shape for submissions where practical) and surfaced to the owner in the Share panel (at minimum last-used time and/or submission count).

## Capabilities

### New Capabilities
- `custom-form-share-links`: portal-side lifecycle of a Custom Form share link — eligibility gating, generation, expiry, revoke/regenerate, ownership scoping, and audit-trail visibility to the owner.
- `custom-form-public-access`: the unauthenticated public surface — token-scoped read/submit endpoints, the public form page, published-only enforcement, uniform invalid-token responses, and rate limiting.

### Modified Capabilities
(none — no existing spec files exist yet for the authenticated Custom Form flow; this change is additive and does not alter it)

## Impact

- **Frontend (`crout-automations`)**: `portal-services.component` (card actions), `portal-service-details.component` (detail actions), new Share panel component, new unguarded `/forms/:token` route + public form page component reusing `service-trigger-renderer`'s field/validation logic, `app.routes.ts`.
- **Backend (`crout-automations-api`)**: new share-link entity/table (token hash, form/`userServiceId` reference, owner user id, created/expires/revoked timestamps, share method, recipient list), new unauthenticated controller + service for token resolution and public submission, reuse of `ServiceTriggerService.ExecuteCustomFormAsync`'s webhook-calling logic, new audit read path off `ServiceTriggerExecution` (or an extension of it) for the owner-facing usage view, rate limiting middleware/config for the new public routes, a new `Templates/FormShareLinkNotification.html` + `IEmailService` method for share-link emails, and an auto-revoke side effect wired into `UserServiceRepository.AdminDeactivateAsync`/`AdminUpdateAsync`.
- **Security**: first unauthenticated internet-facing endpoint in the app. The R12 security review is still required, but **no longer code-enforced** — the `CUSTOM_FORM_SHARE_LINKS_ENABLED` flag was removed (see above), so nothing in the codebase stops this from being reachable in production before that review happens. CORS scoped narrowly for the public route; token never logged.
- **No change** to the existing authenticated in-portal Custom Form rendering/execution path (`ServiceTriggerRendererComponent`, `ServiceTriggerService.ExecuteAsync`) — this is additive.
