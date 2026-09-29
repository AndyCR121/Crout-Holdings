# PRD: Finalize Custom Form External Share Links

| | |
|---|---|
| **System / component** | Crout Automations portal (`crout-automations` — `src/app/pages/portal/services/`, `src/app/components/service-trigger-renderer/`, public `/forms/:token` route) and API (`crout-automations-api` — `Controllers/ServiceTriggersController.cs`, `Controllers/PublicFormsController.cs`, `Services/ServiceTriggerService.cs`) |
| **Status** | Draft |
| **Author** | Andrew (AndyCR121) |
| **Date** | 2026-09-23 |
| **Related OpenSpec change** | `custom-form-share-links` (existing, see §2) |

## 1. Summary

An OpenSpec change (`openspec/changes/custom-form-share-links`) already exists and is almost entirely implemented and merged to `main` (commits `736745de`, `dfd1465d`): a portal user can generate a "Share" link for a service's Custom Form trigger, hand it to someone without a Crout Automations login, and that person can fill in and submit the form unauthenticated. The feature is currently disabled in production behind a `CUSTOM_FORM_SHARE_LINKS_ENABLED` flag pending its one remaining release-gate task: a dedicated security review. Separately, the requester's current description of the desired flow is broader than what shipped — a "Share" action that opens **validation settings** (how the link will be shared: email or URL; how long it stays valid: a chosen number of days, or unlimited) — whereas the implemented flow only returns a copyable URL with a fixed, non-configurable ~1-year expiry, and the original design explicitly avoided an "unlimited" option for security reasons. This PRD closes both gaps: finish the outstanding release-gate item, and extend the Share flow to the settings-driven UX now being asked for, while preserving the single-active-link-per-form behavior already built.

## 2. Problem / opportunity

Per `openspec/changes/custom-form-share-links/tasks.md`, every implementation task across data model, backend (owner-facing + public), rate limiting/CORS, and frontend (portal Share panel + public form page) is complete (sections 1–7, all checked) — including single-active-link-per-form semantics (task 2.1: "revoke-then-insert single-active-link semantics"), revoke/regenerate, audit trail, and a feature flag (task 8.1) that currently defaults `false` in all environments including production. The one remaining task is **8.2 — a dedicated security review of the new unauthenticated surface**, explicitly marked not started: *"not started; this is the one remaining item before `CUSTOM_FORM_SHARE_LINKS_ENABLED` may be set to `true` in production."* So the feature is functionally complete but not yet safe to enable per its own release gate.

Independently of that gate, the requester's current description of the intended UX doesn't match what was built. Today, generating a link produces one full URL to copy, with expiry fixed at implementation time (`design.md` describes a long fixed default and explicitly states no "valid indefinitely" option). The requester now wants the "Share" action to present validation settings at generation time — a choice of how the link will be shared (email vs. URL) and how long it's valid (a specific number of days, or unlimited) — which the current implementation has no UI or backend support for.

## 3. Goals

- Complete the outstanding release-gate item (security review, task 8.2) so the already-built feature can be safely enabled in production.
- Extend the Share flow so generating a link presents the two described validation settings: share method (email / URL) and validity (a chosen number of days, capped at 365, or a "1 Year" preset).
- When "Email" is selected, actually send the share link by email — to one or more owner-entered, validated recipient addresses — using the app's existing email infrastructure, styled as a client-facing message consistent with the app's other client-facing emails.
- Automatically invalidate a form's active share link the moment its underlying service is disabled, deleted, or marked unpaid, without waiting for owner action.
- Preserve the existing "one active link per form, generating a new one invalidates the previous one" behavior — this already matches the requester's description and must not regress.
- Confirm and, where needed, make explicit that each workflow's Custom Form has fully independent share settings from every other workflow's form (already true by construction — a share link is scoped to one `userServiceId` — but not currently surfaced to the user as a stated guarantee).

## 4. Non-goals

- Rebuilding the share-link mechanism from scratch — this PRD extends the existing, already-reviewed data model and token design (`design.md` D1–D7), it does not replace them.
- A general-purpose transactional email system for the whole platform, unless R2 below resolves to the app itself sending the email (see Open Questions — this is not assumed).
- Supporting more than one concurrent active link per form — out of scope in the original PRD and still out of scope here; the requester's description ("if they have 1 form already shared & create a new share link, the previous one is invalid") confirms single-active-link is the intended model, not a change request.
- Any change to trigger types other than Custom Form, or to the authenticated in-portal form-filling experience.

## 5. User story

> As a portal user with a confirmed Custom Form trigger on a service,
> I want to choose, when I generate a share link, how I intend to share it and how long it should stay valid,
> So that the link's exposure window matches how and to whom I'm actually distributing it.

> As that same portal user with multiple workflows, each with its own Custom Form,
> I want each form's share link and its settings to be completely independent of the others,
> So that sharing one client's form doesn't affect or reveal anything about another.

> As Crout Holdings (site operator),
> I want the feature's mandatory security review completed before the flag is ever turned on in production,
> So that the app's first unauthenticated, internet-facing surface doesn't ship with unresolved risk.

## 6. Requirements

### R1. Security review release gate — SUPERSEDED, no longer code-enforced

**Status update (2026-09-28):** this requirement, as originally written, no longer holds. `CUSTOM_FORM_SHARE_LINKS_ENABLED` — the flag this requirement was about — was removed from the codebase entirely at the requester's explicit instruction, to simplify local Docker testing. The feature is now unconditionally enabled in every environment, including production, with no runtime flag to gate it. See `openspec/changes/custom-form-share-links/design.md` D11 for the full account.

The *original* requirement (kept below for history) was: the system's rollout SHALL NOT enable `CUSTOM_FORM_SHARE_LINKS_ENABLED` in production until task 8.2's dedicated security review has been performed and its findings resolved or explicitly accepted.

**What this means now:** task 8.2's security review is still owed and still matters — the app's first unauthenticated, internet-facing surface still deserves it — but nothing in the code stops a production deploy from exposing it before that review happens. This is now a **process** commitment (don't deploy/merge this branch to production before the review), not a technical safeguard.

**Scenario: No code-level barrier remains**
- GIVEN the security review (task 8.2) has not yet been completed
- WHEN this code is deployed to any environment, including production
- THEN the public share-link surface is reachable regardless — there is no flag or code path that prevents it

### R2. Share method selection at link generation, with real email delivery

The system SHALL let the owner choose a share method — Email or URL — when generating a share link.

**Resolved (was an open question):** "Email" is app-driven delivery, not a UI label. Selecting Email reveals a recipient input that lets the owner add one or more email addresses as chips; each address is validated as a well-formed email before it's accepted as a chip (reject and show inline error otherwise). On generate, the app sends the share link to every recipient chip via the app's existing email infrastructure (`IEmailService`/`EmailService`, SMTP-based, `crout-automations-api/CroutApi/Services/EmailService.cs`), looping one send per recipient the same way `SendBookingConfirmationAsync` already sends sequentially to multiple recipients — no new bulk/batch email API is introduced. The message uses a new HTML template (`Templates/FormShareLinkNotification.html`) following the existing `RenderTemplate`/`{{token}}`-replacement pattern used by `ContactRequestNotification.html` and `BookingClientConfirmation.html`, styled to match those client-facing templates (branded, professional — not a bare link), and rendered with the owning company/service name for context. Selecting "URL" keeps today's behavior: the link is surfaced for the owner to copy/paste themselves, no email is sent.

**Scenario: Owner shares via Email**
- GIVEN an eligible service's Share panel with no active link
- WHEN the owner selects "Email", adds one or more valid recipient email chips, and generates the link
- THEN the app sends the share-link email to each recipient via the existing email service, and the persisted-link view reflects "Email" as the method (and, for the owner's own reference, the recipient list it was sent to)

**Scenario: Owner rejects an invalid recipient address**
- GIVEN the owner is entering recipient chips for Email delivery
- WHEN they type an address that isn't a valid email format
- THEN the app refuses to add it as a chip and shows an inline validation error, without blocking previously-added valid chips

**Scenario: Owner shares via URL**
- GIVEN an eligible service's Share panel with no active link
- WHEN the owner selects "URL" and generates the link
- THEN no email is sent; the link is surfaced for the owner to copy, matching today's existing behavior

### R3. Configurable validity window, capped at 365 days

The system SHALL let the owner choose the share link's validity when generating it: either a specific number of days (1–365), or a "1 Year" preset (365 days) — replacing today's fixed, non-configurable default. There is no true "unlimited"/indefinite option; every link has a concrete expiry.

**Resolved (was an open question):** the originally-described "Unlimited" option is not indefinite — it's a convenience preset equal to the maximum, renamed "1 Year" for clarity so the UI never implies a link that never expires. This also resolves the security-review flag raised in the earlier draft (§11): the original design's decision to avoid a truly indefinite option is preserved.

**Scenario: Owner sets a fixed number of days**
- GIVEN the owner is generating a share link
- WHEN they enter a number of days (1–365) as the validity period
- THEN the link expires exactly that many days after generation, per the existing expiry-check logic

**Scenario: Owner selects the 1 Year preset**
- GIVEN the owner is generating a share link
- WHEN they select "1 Year" validity
- THEN the link expires exactly 365 days after generation — functionally identical to entering 365 in the days field, offered as a one-click shortcut

**Scenario: Owner enters a value over the cap**
- GIVEN the owner is entering a custom number of days
- WHEN they enter a value greater than 365
- THEN the system rejects the value (client- and server-side) and the maximum allowed is 365

### R4. Single active link per form is preserved under the new settings

The system SHALL continue to enforce that generating a new share link for a form — regardless of the share method or validity chosen — immediately invalidates any previously active link for that same form, unchanged from the existing revoke-then-insert behavior.

**Scenario: New settings replace the old link**
- GIVEN a form already has an active share link
- WHEN the owner generates a new link with different settings (method and/or validity)
- THEN the previous link stops working immediately and the new link's settings are what govern going forward

### R5. Per-form settings independence across workflows

The system SHALL keep each Custom Form's share settings (method, validity, active/revoked state) fully independent of every other form's, including forms belonging to the same owner across different workflows/services.

**Scenario: Two workflows, two independent settings**
- GIVEN a portal user has two services, each with its own confirmed Custom Form and its own active share link with different settings
- WHEN one of those links is revoked, regenerated, or expires
- THEN the other service's share link and settings are unaffected

### R6. Current settings are visible on the persisted-link view

The system SHALL display the link's chosen share method and validity (including remaining time, or "1 Year") alongside the existing created/last-used/usage-count information already shown in the Share panel's persisted-link state. For links generated via Email, the recipient list it was sent to is also shown for the owner's reference.

**Scenario: Owner reopens the Share panel**
- GIVEN an active share link with a chosen method and validity
- WHEN the owner reopens the Share panel for that service
- THEN they see the method (and, for Email, recipients) and validity/remaining-time it was generated with, not just the URL and usage stats

### R7. Automatic invalidation when the underlying service is disabled, deleted, or unpaid

The system SHALL automatically revoke a form's active share link — without requiring owner action — the moment its `user_service_id`'s service is disabled, deleted, or marked unpaid, so a revoked/unpaid/deleted service can never keep serving unauthenticated public submissions. After such an auto-revocation, the owner must generate a brand-new link (same flow as any other regenerate) once the service is active/paid again — the old link is not silently reinstated.

**Grounded in the codebase:** `UserService.Active` (`crout-automations-api/CroutApi/Models/UserService.cs`) is the field that already governs a service's disabled/deleted/unpaid state today — `AdminController.DeleteClientService` transitions it to `false` via `UserServiceRepository.AdminDeactivateAsync`, and the general admin edit path (`AdminController.UpdateClientService` → `AdminUpdateAsync`) can also flip it to `false` for other reasons (including manually marking a service unpaid, since no automated billing/past-due webhook currently exists in this API). The repository already has `ICustomFormShareLinkRepository.RevokeActiveByUserServiceIdAsync(userServiceId)` — a no-ownership-check revoke suitable for a system-side call — so this requirement is implemented by invoking that method as a side effect everywhere `UserService.Active` transitions from `true` to `false`, not by adding a new state field.

**Scenario: Service deleted**
- GIVEN a service has an active share link
- WHEN an admin deletes the service (`DeleteClientService`)
- THEN the share link is immediately revoked and the public `/forms/:token` route stops accepting reads or submissions for it

**Scenario: Service marked unpaid/disabled**
- GIVEN a service has an active share link
- WHEN the service's `Active` flag is set to `false` through any existing admin path (disable, mark unpaid, etc.)
- THEN the share link is immediately revoked the same way

**Scenario: Service reactivated**
- GIVEN a service was disabled and its share link auto-revoked
- WHEN the service becomes active/paid again
- THEN no link is automatically restored — the owner must generate a new one

### Non-functional requirements

- **Performance**: none beyond current baseline; email sends happen synchronously in the generate request using the existing `EmailService` SMTP client (matching how `SendBookingConfirmationAsync` already sends multiple sequential emails per request) — no new background/queue infrastructure introduced.
- **Security / access**: the token mechanism itself is unchanged from the already-implemented, already-reviewed-in-design D1 decision (opaque 256-bit random value, stored only as a SHA-256 hash, never a JWT) — this remains the safer choice and already satisfies "viable only for this form's view/submit, nothing else on the API": it's structurally incapable of authenticating any `[Authorize]`-gated route (confirmed by existing task 3.6), and is scoped to exactly one `user_service_id`'s public read+submit actions, never anything else. No change to token generation is needed. The share-link email itself must never log the raw token/URL to application logs or error tracking (same constraint task 4.3 already verifies for the rest of the feature), and recipient email addresses must be validated/encoded before use in the SMTP call to prevent header injection.
- **Data / audit**: the chosen share method, validity, and (for Email) the recipient address list should be persisted per link (extending the existing `custom_form_share_link` record, e.g. a new `custom_form_share_link_recipient` table or a JSON column) so R6 can read them back; no change to the existing `custom_form_share_link_access` audit trail.
- **Compatibility**: no change to the public `/forms/:token` page, its rendering, or its submission path — this PRD only changes how a link is generated and configured, not how a valid link behaves once issued.

## 7. UX flow & wireframe

From the existing Share panel's "no link yet" state, generating a link now opens a small settings step first: a method choice (Email / URL) and a validity choice (a number-of-days input capped at 365, or a "1 Year" preset) before the link is created. Selecting "Email" reveals a recipient chip input — each address is validated as well-formed before being accepted as a chip, and at least one valid chip is required to generate. On generate with "Email", the app sends the share-link email to every recipient via the existing SMTP email service, using a new client-facing HTML template matching the style of the app's other client-facing emails (e.g. booking confirmations). Once generated, the persisted-link state shown today (URL on first reveal for "URL" method, then created/last-used/usage on reopen, plus Revoke/Regenerate) gains a line showing the chosen method, recipients (if Email), and validity/remaining time. Regenerating re-opens the same settings step rather than reusing the prior link's settings silently. Separately, if the service itself is later disabled, deleted, or marked unpaid, the link is auto-revoked with no owner action — the next time they open the Share panel they see the "no link yet" state again, not a leftover expired-looking link.

See wireframe: `crout-automations-custom-form-share-links-finalize-wireframe.html`

## 8. References

| Source | What it contributed |
|---|---|
| Requester's description (this request) | Source of the "validation settings" requirement (share method + validity window) and the "1 link per form/workflow, previous one invalidated" confirmation |
| `docs/prd/custom-form-share-links/custom-form-share-links.md` | The original, already-approved PRD this one extends — confirmed R2 (generation), R6 (long-lived, owner-independent expiry), R7 (revoke/regenerate replaces prior link), R12 (mandatory security review gate) |
| `openspec/changes/custom-form-share-links/tasks.md` | Confirmed implementation status: sections 1–7 fully complete, task 8.1 (feature flag) complete, task 8.2 (security review) explicitly not started and named as the sole remaining blocker |
| `openspec/changes/custom-form-share-links/proposal.md` | Confirmed the shipped design's fixed ~1-year default expiry and explicit decision *not* to offer a "valid indefinitely" option — the basis for flagging R3's "Unlimited" option as a deliberate, security-relevant change from the original decision |
| Recent commit history (`736745de` "Add Custom Form external share links...", `dfd1465d` "fix(deploy): configure custom form share links") | Confirmed the feature has already been merged and deployed-configured, ahead of being enabled |
| Requester's follow-up answers (this session) | Resolved all four original open questions: Email = real app-driven delivery to validated recipient chips; "Unlimited" renamed to a 365-day "1 Year" preset (no true indefinite option); 365-day cap applies to the custom days field too; token generation stays on the existing safest design (opaque/hashed, non-JWT); added a new requirement (R7) that the link auto-invalidates when the service is disabled/deleted/unpaid |
| Codebase research (`crout-automations-api/CroutApi/Services/EmailService.cs`, `IEmailService.cs`, `Templates/*.html`) | Confirmed the existing SMTP-based email pattern (`SendContactRequestAsync`, `SendBookingConfirmationAsync`), its `RenderTemplate` HTML-template convention, and its sequential-per-recipient send pattern — the basis for R2's email delivery design |
| Codebase research (`UserService.cs`, `UserServiceRepository.cs`, `AdminController.cs`, `ICustomFormShareLinkRepository.cs`) | Confirmed `UserService.Active` is the field governing disable/delete/unpaid today, identified `AdminDeactivateAsync`/`AdminUpdateAsync` as the transition points, and found the existing no-ownership-check `RevokeActiveByUserServiceIdAsync(userServiceId)` as the right hook for R7 |

## 9. Out of scope

- A general-purpose transactional email system, bounce/deliverability handling, or a new email provider — this reuses the existing SMTP `EmailService` as-is.
- Multiple concurrent active links per form.
- Any change to trigger types other than Custom Form, or to the public form page's rendering/submission behavior.
- Re-deriving the token/data-model design already accepted in `design.md` — R2/R3/R7 extend its stored fields and add a lifecycle hook, they don't replace its mechanism.
- Building a dedicated billing/past-due webhook — R7 hooks the existing `UserService.Active` transition points, it doesn't add new billing-event detection.

## 10. Open questions

All four original open questions are resolved (see requirements above and the References row for this session's answers). One residual assumption to flag rather than a blocking question:

- **Assumption:** since no automated billing/past-due webhook exists in this API today, "unpaid" for R7's purposes is operationalized as *any* existing admin path that sets `UserService.Active` to `false` (delete, disable, or a manual "mark unpaid" edit) — not a new payment-status detection mechanism. Flag during implementation planning if a dedicated billing webhook is added later, so R7's hook stays attached to the right transition point(s).

## 11. Rollout / risks

Task 8.2 (security review) was already a hard release gate before this PRD existed, and it stays one now. The scope is narrower than the earlier draft feared: since "Unlimited" is now a capped 365-day preset rather than a true indefinite option, the original design's decision to avoid indefinite validity is preserved, not reversed — flag this resolution to the reviewer rather than the original open risk. New items for the reviewer: (1) the email-send path must not leak the raw token/URL to logs, error tracking, or the SMTP provider's own delivery logs beyond what's necessary; (2) recipient email addresses must be validated/encoded to prevent SMTP header injection; (3) R7's auto-revoke hook must be confirmed to fire on every existing `Active`-to-`false` transition path, not just `DeleteClientService`, or a disabled/unpaid service could keep an old link alive. Ship the settings UI (R2/R3/R7) behind the same `CUSTOM_FORM_SHARE_LINKS_ENABLED` flag already in place, so the whole feature — original and extended — goes live together only once the review is satisfied.

---
*This PRD is a review artifact, not an implementation plan. Once approved, hand it to OpenSpec proposal authoring (`opsx` / `openspec-propose`) to generate the actual proposal, spec deltas, and tasks — this document does not create or replace those.*
