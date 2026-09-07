# PRD: External Shareable Links for Custom Forms

| | |
|---|---|
| **System / component** | Crout Automations portal (`crout-automations` — `src/app/pages/portal/services/`, `src/app/components/service-trigger-renderer/`); Crout Automations API (`crout-automations-api` — `Controllers/ServiceTriggersController.cs`, `Services/ServiceTriggerService.cs`, `Helpers/JwtHelper.cs`, auth stack) |
| **Status** | Draft |
| **Author** | Andrew (AndyCR121) |
| **Date** | 2026-09-07 |
| **Related OpenSpec change** | none yet |

## 1. Summary

Let a portal user generate a secure, shareable external URL for any service where they have a confirmed **Custom Form** ("Website Form") trigger add-on, so people without Crout Automations login credentials — most often the client's own internal team — can open that link and fill in the form on the client's behalf, with no account required. The link is backed by a new, narrowly-scoped, long-lived credential purpose-built for exactly one action (view and submit that one form), not a cut-down version of the normal login session, is revocable by the owner at any time independently of their own login, and does not ship to production until it has passed a dedicated security review — this is the first unauthenticated, internet-facing endpoint the app will expose.

## 2. Problem / opportunity

Today, filling in a client's custom form (rendered by `ca-service-trigger-renderer` from a `formSchema`) requires being logged into the Crout Automations portal as the account holder who owns that service. Every relevant route is authenticated end to end: `client/services/**` sits behind `authGuard` (`app.routes.ts`), and `ServiceTriggersController`'s `GetConfigs`/`Execute` endpoints carry `[Authorize]` plus an explicit ownership check (`context.CompanyOwnerUserId == userId` in `ServiceTriggerService`). There is no path today for anyone other than the logged-in account holder to see or submit a form.

In practice, the person who actually has the information needed to fill in the form is usually *not* the Crout Automations account holder — e.g. a client's sales/ops team member gathering RFQ line items (the Globefurn use case). Today the account holder either fills it in themselves second-hand, or would have to hand out their own login credentials — which the app has no way to scope down, and which would expose everything else in their account (other services, credentials, billing). There is no way to hand out access to "just fill in this one form."

## 3. Goals

- A portal user can, per service that has a confirmed Custom Form trigger, generate a URL that opens just that form for someone without a Crout Automations login to fill in.
- Submitting the form via that URL reaches the same n8n webhook with the same fidelity and validation as an authenticated in-portal submission.
- The credential behind the link is scoped so tightly that even if it leaked, it could be used for nothing beyond viewing and submitting that one form — never to browse the account, other services, or any other API route.
- The owner can revoke or regenerate the link at any time, independent of their own login/password.
- The feature does not go live until a dedicated security review of this new unauthenticated surface has been completed and its findings addressed.

## 4. Non-goals

- A general-purpose API-key or OAuth system for the platform — this is scoped to Custom Form share links only, not a reusable public-auth mechanism for other endpoints.
- Identity verification of the person filling in the shared form (e.g. requiring an email/OTP step before the form is shown) — not requested; may be revisited if the security review in R12 calls for it.
- Sharing links for any trigger type other than Custom Form (`triggerType === 'form'`) — `webhook`, `email_mockup`, `file_upload`, and `custom` triggers are out of scope, per the request.
- Any change to how the existing authenticated, in-portal form-filling flow behaves for logged-in users.
- An admin/dev-side (`/admin`, `/dev`) equivalent of this action — the request is specifically about the client-facing portal services page (`client/services`).

## 5. User story

> As a portal user (service owner) with a Custom Form trigger confirmed on one of my services,
> I want to click "Share" on that service and get a secure link,
> So that I can hand it to someone on my internal team who doesn't have Crout Automations login credentials, and they can fill in the form for me.

> As the internal team member receiving the shared link,
> I want to open the URL and see just that one form, with no login prompt,
> So that I can fill it in and submit it without needing an account.

> As the portal user, at some point after sharing the link,
> I want to revoke or regenerate it,
> So that I can cut off access — e.g. the wrong person received it, or the process changed — without touching my own account.

> As Crout Automations (site operator),
> I want this new externally-reachable, unauthenticated surface reviewed for security before it goes live,
> So that a leaked or guessed link can be used for nothing beyond filling in the one form it was issued for.

## 6. Requirements

### R1. "Share" action appears only where eligible

The system SHALL show a "Share" action for a service row/detail view only when that service has a confirmed trigger add-on identified as a Custom Form ("Custom Form"/"Website Form", matching the same normalization `ServiceTriggerService.IsCustomFormName` already uses), on both the portal services list (`portal-services.component`) card actions and the service details page (`portal-service-details.component`).

**Scenario: Share action hidden for services without a confirmed Custom Form**
- GIVEN a service has no confirmed trigger add-on named "Custom Form"/"Website Form"
- WHEN the user views that service on their services page
- THEN no "Share" action is shown

**Scenario: Share action shown for an eligible service**
- GIVEN a service has a confirmed Custom Form trigger add-on (`HasConfirmedCustomFormTrigger` true)
- WHEN the user views that service
- THEN a "Share" action is available in the card/detail actions

### R2. Generating a share link

The system SHALL let the service owner generate a share link for an eligible service's Custom Form from the "Share" action, returning a full URL the user can copy, without requiring the user to know or handle the underlying token separately from the URL.

**Assumption:** each Custom Form (one per `userServiceId`, per the existing single-integration model in `CustomFormAccessContextDto`) has at most one *active* share link at a time; generating a new one while one exists replaces it (see R7). Supporting multiple concurrent active links per form is left open — see §10.

**Scenario: First-time link generation**
- GIVEN an eligible service has no existing share link
- WHEN the user clicks "Share" and confirms generation
- THEN the system creates a new share credential scoped to that service's Custom Form and returns a full shareable URL

### R3. Public form page requires no login

The system SHALL serve a public, unauthenticated page at the share URL that renders only the Custom Form identified by the link's token — using the same field rendering, validation, and dynamic-form behavior as the authenticated in-portal renderer (list/tabs/datetime/checkbox/etc. per `CustomFormSchema`) — with no Crout Automations login, portal chrome, or account context.

**Assumption:** the URL is a new, unguarded top-level Angular route (e.g. `/forms/:token`) served outside the `client` route tree's `authGuard`, backed by a new unauthenticated API endpoint that resolves the token to that one form's schema.

**Scenario: Recipient opens a valid link**
- GIVEN a valid, unexpired, unrevoked share token
- WHEN a visitor with no session opens the share URL
- THEN the visitor sees the rendered Custom Form and is not redirected to any login page

**Scenario: Recipient opens an invalid/expired/revoked link**
- GIVEN a token that does not resolve to any active share link (never existed, expired, or revoked)
- WHEN a visitor opens that URL
- THEN the visitor sees a generic "this link is no longer available" state with no information about why or what it used to point to (see R9)

### R4. Public submission executes the real workflow

The system SHALL, when a visitor submits the public form, execute the same underlying n8n webhook call that an authenticated in-portal submission of that Custom Form would make (`ExecuteCustomFormAsync`'s payload/webhook path), including the same field validation rules already enforced by the shared renderer, and record the execution for audit purposes (see R11).

**Scenario: Valid submission is delivered**
- GIVEN a visitor fills in all required fields correctly on the public form
- WHEN they submit
- THEN the submission reaches the same n8n webhook the authenticated flow would call, and the visitor sees the form's configured response (per `responseMode`)

**Scenario: Invalid submission is blocked client-side**
- GIVEN a visitor leaves a required field empty or enters an invalid value
- WHEN they attempt to submit
- THEN the same validation that blocks an authenticated submission today blocks this one, with the same inline error messaging

### R5. Share token is scoped to exactly one action — not a session

The system SHALL authorize the public endpoints using a distinct, purpose-built token mechanism — never a Crout Automations user JWT, session, or any credential that could also authenticate any other API route — such that possessing a share token grants only: (a) reading that one form's published schema, and (b) submitting that one form once per request. It SHALL NOT grant access to any other service, company, credential, admin, or dev endpoint, regardless of the token holder's or the link owner's other permissions.

**Assumption:** implemented as a new server-validated opaque token (e.g. a cryptographically random value, stored hashed, looked up directly — not a JWT bearer token processed by the existing `[Authorize]`/`JwtHelper` pipeline) checked by a dedicated, separate controller action with no `[Authorize]` attribute, so it can never be confused with or escalate into a logged-in session.

**Scenario: Share token cannot reach unrelated endpoints**
- GIVEN a valid share token for Form A
- WHEN it is presented (as a bearer token, query param, or any other means) to any endpoint other than that form's public read/submit endpoints
- THEN the request is rejected

**Scenario: Share token cannot reach a different form**
- GIVEN a valid share token for Form A
- WHEN it is used to try to read or submit Form B's public endpoint
- THEN the request is rejected

### R6. Long-lived, independent of the owner's login

The system SHALL support a share token remaining valid far longer than the existing 8-hour user session (`JwtHelper` default `expiryHours`), and SHALL keep it valid independently of the owning user's own login state — i.e. the owner logging out, their session expiring, or their `token_version` being bumped (e.g. on password change) SHALL NOT invalidate an active share link.

**Assumption:** default expiry is left as an open configuration decision (see §10) rather than assumed here, since it materially affects the security posture; a concrete default must be agreed before implementation.

**Scenario: Share link outlives the owner's session**
- GIVEN the owner generated a share link, then later logs out or their session expires
- WHEN a recipient uses the still-valid share link
- THEN the form still loads and can be submitted

### R7. Revoke or regenerate

The system SHALL let the service owner revoke an active share link at any time from the same UI surface used to generate it, immediately invalidating it for any future request, and SHALL let them generate a new link afterward (which, per R2, replaces any prior active link for that form).

**Scenario: Revoked link stops working**
- GIVEN an active share link
- WHEN the owner revokes it
- THEN any subsequent request using that token (page load or submission) is treated as invalid per R3's expired/revoked scenario

### R8. Only the published form is ever served publicly

The system SHALL serve the form's `PublishedSchemaJson` (never `DraftSchemaJson`) to the public endpoint, matching the same published-vs-draft distinction the authenticated flow already respects (`ServiceTriggerService.BuildCustomFormTriggerConfig`). If a form has never been published, its share link SHALL NOT resolve to a fillable form.

**Scenario: Unpublished form has no working share link**
- GIVEN a Custom Form has only a draft schema and has never been published
- WHEN the public share URL for it is requested
- THEN the visitor sees an unavailable state, not the draft content

### R9. No enumeration or information disclosure on invalid tokens

The system SHALL respond identically (same status code, same generic message, same timing characteristics within reason) whether a presented token never existed, has expired, or has been revoked, and SHALL NOT leak the associated company name, service name, form title, or owner identity in that response.

**Scenario: Guessed token reveals nothing**
- GIVEN an attacker submits a syntactically plausible but non-existent token
- WHEN the public endpoint processes it
- THEN the response is indistinguishable from an expired/revoked token response

### R10. Rate limiting / abuse protection on public endpoints

The system SHALL apply rate limiting to the new public read and submit endpoints (per token and/or per source IP) to constrain token-guessing and submission-flooding, independent of any rate limiting that may or may not already apply to authenticated endpoints.

**Assumption:** concrete thresholds are an implementation/security-review detail, not fixed here — see §10.

**Scenario: Excessive requests are throttled**
- GIVEN a client sends requests to a public share endpoint far above normal single-user usage
- WHEN the threshold is exceeded
- THEN further requests are rejected/throttled rather than processed

### R11. Audit trail

The system SHALL record, for each share link: who created it and when, and for each use: that the public endpoint was used to view or submit the form and when — reusing the existing `ServiceTriggerExecution` record shape for submissions where practical — so the owner (and Crout Automations operators) can see that the link was used without exposing that history to the public endpoint itself.

**Scenario: Owner can see link activity**
- GIVEN a share link has been used to submit the form at least once
- WHEN the owner views the service's Share management UI
- THEN they can see that the link has been used (at minimum: last-used time and/or submission count)

### R12. Mandatory security review before production release

The system's rollout SHALL include a dedicated security review of the new unauthenticated surface (public routes, new token mechanism, rate limiting, and information-disclosure behavior) before this feature is enabled in production, and known findings from that review SHALL be resolved or explicitly accepted before release.

**Scenario: Release is gated on review**
- GIVEN implementation of R1–R11 is complete
- WHEN release is considered
- THEN a security review (e.g. via this repo's `security-review`/`pentest` skills or an equivalent manual review) has been performed and its findings addressed first

### Non-functional requirements

- **Performance**: negligible added load — one token lookup per public request, no different in shape from existing `ServiceTriggerConfig` lookups.
- **Security / access**: this is the core concern of the feature — see R5, R8–R10, R12 above. In particular: the share token must never be logged in a way that lets it leak (application logs, error tracking, analytics); the public endpoints must be served over HTTPS only; CORS on the new public endpoints should be scoped no wider than necessary for the public form page itself.
- **Data / audit**: see R11. No existing table's schema changes meaning; a new share-link record type is additive.
- **Compatibility**: no change to the authenticated in-portal Custom Form rendering/execution path (`ServiceTriggerRendererComponent`, `ServiceTriggerService.ExecuteAsync`/`ExecuteCustomFormAsync`) — the public path is additive and reuses the same webhook-calling logic rather than forking it.

## 7. UX flow & wireframe

On the portal services page, a user with an eligible service sees a new "Share" action alongside the existing "Request Config Change"/"Update Credentials"/"View Details" actions. Clicking it opens a small panel: if no link exists yet, a "Generate link" button; once generated, the full URL with a copy button, when it was created, when/whether it's been used, and "Revoke" and "Regenerate" actions. The same panel is reachable from the service details page.

A recipient who opens the URL lands directly on a plain, branded (but not portal-chrome) page showing just that one form — same fields, tabs, and validation as the in-portal renderer — with a clear submit action and the form's configured response state on success. An invalid, expired, or revoked link shows a generic "this link isn't available anymore" state with no further detail.

See wireframe: `custom-form-share-links-wireframe.html`

## 8. References

No screenshots, docs, or external links were supplied with this request — it was described directly by the requester in prose (see the input at the top of this PRD). This PRD's technical grounding instead comes from reading the current source during this session:

| Source | What it contributed |
|---|---|
| `crout-automations/src/app/pages/portal/services/portal-services.component.html` (+ `.ts`) | Confirmed the existing card action layout ("Request Config Change" / "Update Credentials" / "View Details") the new "Share" action would sit alongside, and the side-panel pattern already used for in-portal form rendering |
| `crout-automations/src/app/pages/portal/services/service-details/portal-service-details.component.ts` (+ `.html`) | Confirmed the service-details page's equivalent surface and its existing ownership/loading flow |
| `crout-automations/src/app/components/service-trigger-renderer/service-trigger-renderer.component.ts` | Confirmed the exact field types, validation, and payload-building the public form page must reproduce unauthenticated |
| `crout-automations/src/app/interfaces/i-custom-form-builder.interface.ts`, `i-service-trigger.interface.ts` | Confirmed the `CustomFormSchema`/`ServiceTriggerConfig` shapes the public endpoint needs to serve |
| `crout-automations/src/app/app.routes.ts` | Confirmed all `client/**` routes sit behind `authGuard`, establishing that the public form page needs a new, separate unguarded route |
| `crout-automations-api/CroutApi/Controllers/ServiceTriggersController.cs`, `Services/ServiceTriggerService.cs`, `DTOs/CustomFormDtos.cs` | Confirmed today's `[Authorize]`-gated execution path, the `CompanyOwnerUserId` ownership check, the `PublishedSchemaJson`/`DraftSchemaJson` distinction (R8), the `IsCustomFormName` add-on matching logic (R1), and the webhook-calling logic (`ExecuteCustomFormAsync`) the public path should reuse rather than fork |
| `crout-automations-api/CroutApi/Helpers/JwtHelper.cs` | Confirmed the existing session JWT's shape (8-hour default expiry, `token_version` revocation tied to the user) — the basis for R5/R6's requirement that the share token be a distinct mechanism, not a scoped-down JWT |

## 9. Out of scope

- Any share/link mechanism for trigger types other than Custom Form (`form`).
- Identity verification of link recipients (email/OTP gating before the form is shown).
- A general-purpose platform API-key system reusable beyond this feature.
- Admin/dev-side management of share links (this PRD covers the client-facing portal only).
- Changes to the authenticated in-portal Custom Form experience for logged-in users.
- Multiple concurrent active share links per form (see §10 — single active link is assumed for v1).

## 10. Open questions

- [ ] What is the intended default (and maximum) expiry for a share link — a fixed long duration (e.g. 90 days / 1 year), or valid indefinitely until manually revoked? This is a business/security-posture decision, not inferred here (R6).
- [ ] Should more than one active share link per form be supported (e.g. distinct links per recipient, so one leak doesn't require regenerating for everyone), or is a single replace-on-regenerate link (assumed in R2) sufficient for v1?
- [ ] Concrete rate-limit thresholds for the public endpoints (R10) — left to implementation/security review.
- [ ] Should the public form page carry any lightweight branding (company/service name) beyond the form itself, or stay fully generic? Affects both UX and how much context a leaked link exposes.
- [ ] Who should be able to see/manage a service's share link — only the specific portal user who generated it, or anyone with portal access to that company/service (matching today's broader `CompanyOwnerUserId` ownership check)?

## 11. Rollout / risks

This is the app's first unauthenticated, internet-facing endpoint, so it should not reach production behind anything less than a full security review (R12) — treat that review as a hard release gate, not a nice-to-have. Key risks to weigh in that review: token guessability/entropy, rate-limiting effectiveness against both enumeration and submission-flooding, whether the public form page or its error states leak any information about the company/service/form it belongs to, and whether the new public endpoints could be pivoted into reaching any authenticated route. Given the risk profile, consider shipping first to a small internal/pilot client (e.g. re-using the Globefurn relationship already active in this codebase) before general availability, and confirm the revocation path (R7) works reliably before the first real external link is handed out.

---
*This PRD is a review artifact, not an implementation plan. Once approved, hand it to OpenSpec proposal authoring (`opsx` / `openspec-propose`) to generate the actual proposal, spec deltas, and tasks — this document does not create or replace those.*
