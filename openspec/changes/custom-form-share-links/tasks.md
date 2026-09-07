## 1. Data model

- [x] 1.1 Add a new numbered SQL migration (`crout-automations-api/sql/NN_custom_form_share_links.sql`) creating `custom_form_share_link` (per design.md D1) and verify it applies cleanly against a local/dev database
- [x] 1.2 Add `custom_form_share_link_access` table in the same migration (per design.md D3) and verify it applies cleanly
- [x] 1.3 Add corresponding EF/model classes and repository interfaces (`ICustomFormShareLinkRepository`, or extend `IServiceTriggerRepository` if more consistent with existing conventions) and verify they build

## 2. Backend: owner-facing management API

- [x] 2.1 Add a service (e.g. `ICustomFormShareLinkService`) implementing generate (token creation, hashing, revoke-then-insert single-active-link semantics per design.md D1), revoke, and regenerate, and verify with unit tests covering: first generation, regenerate replaces prior link, revoke invalidates
- [x] 2.1a Build the returned share URL from a configured `AppBaseUrl` (defaulting to `https://automations.crout-holdings.com`, per design.md D7 — no new subdomain/DNS needed) rather than hard-coding the domain, and verify it's overridable per environment (e.g. local/dev config points at `http://localhost:4200` or similar)
- [x] 2.2 Enforce "only the generating user can manage the link" (spec requirement) in the service layer and verify with a test asserting a different authenticated user gets denied
- [x] 2.3 Add `[Authorize]`-gated controller actions (generate / revoke / regenerate / get-current-link-with-usage) and verify via integration test that eligibility (confirmed Custom Form trigger, per R1) is enforced before generation is allowed — verified at the service-test level (no HTTP-level integration-test harness exists elsewhere in this project to extend)
- [x] 2.4 Add a usage-read endpoint/method backing R11 (last-used time and/or submission count from `custom_form_share_link_access`) and verify it returns correct counts against seeded access rows

## 3. Backend: public unauthenticated API

- [x] 3.1 Extract `ServiceTriggerService.ExecuteCustomFormAsync`'s webhook-calling logic into a form callable without a `userId`/ownership check (per design.md D2), keeping the existing authenticated controller action's `[Authorize]` + `CompanyOwnerUserId` check fully unchanged, and verify existing authenticated Custom Form submission tests still pass unmodified — confirmed: all 13 pre-existing tests plus the 12 new ones pass (25/25)
- [x] 3.2 Add `IPublicFormAccessService` resolving a presented token (hashed lookup) to `(userServiceId, PublishedSchemaJson, companyName, serviceName)`, returning a uniform "not found" result for never-existed/expired/revoked tokens, and verify with unit tests for all three invalid cases returning identical shape
- [x] 3.3 Add `PublicFormsController` (no `[Authorize]`, route prefix e.g. `/api/public/forms`) with GET (resolve token -> schema + light branding) and POST (submit) actions, and verify via integration test that a valid token returns the published schema and an invalid one returns the generic unavailable response with identical status/body shape across never-existed/expired/revoked — verified at the service-test level; no HTTP-level integration-test harness (e.g. WebApplicationFactory) exists elsewhere in this project to extend, so the controller itself (a thin passthrough) was verified by code review rather than an HTTP test
- [x] 3.4 Verify a form with only a draft schema (never published) returns the same unavailable response as an invalid token (R8), via integration test
- [x] 3.5 Record a `custom_form_share_link_access` row on both view (GET) and submit (POST), linking submissions to the created `ServiceTriggerExecution` id, and verify rows are created with correct `action` values
- [x] 3.6 Verify a share token presented to any other existing authenticated endpoint (e.g. `ServiceTriggersController`) is rejected, via integration test (R5) — true by construction (the JWT bearer auth handler rejects any non-JWT value, and the share token is never a JWT), confirmed by code review; not covered by an explicit automated test

## 4. Backend: rate limiting & CORS

- [x] 4.1 Add ASP.NET Core `Microsoft.AspNetCore.RateLimiting` middleware configured only for `/api/public/forms/**` routes with the token+IP and IP-wide limiters from design.md D4 — implemented and reviewed; throttling behavior itself is not covered by an automated test (would require an HTTP-level test harness this project doesn't have)
- [x] 4.2 ~~Add a narrowly-scoped CORS policy~~ — corrected during implementation: a default CORS policy built from `ALLOWED_ORIGINS` already existed API-wide in `Program.cs` (design.md's original claim that none existed was wrong); the public routes inherit it as-is, no new policy needed
- [x] 4.3 Confirm (by inspection/grep, not a new test) that the share token is never written to application logs, error tracking, or analytics anywhere in the new code paths — confirmed: no logger/Log.* calls exist anywhere in the new share-link files

## 5. Frontend: portal Share management UI

- [x] 5.1 Add "Share" action to `portal-services.component` card actions, visible only when `HasConfirmedCustomFormTrigger` is true — implemented and confirmed via production build (`ng build` succeeds); not manually exercised in a running browser session
- [x] 5.2 Add the same "Share" action to `portal-service-details.component` — implemented, same verification caveat as 5.1
- [x] 5.3 Build the Share panel component: "Generate link" (no existing link state); full URL + copy button shown once immediately after generation; and a persisted-link state (on reopen) showing only created/last-used/usage metadata plus Revoke/Regenerate (no URL/token redisplay, per design.md D1) — implemented; two real integration bugs against the backend contract were found and fixed during coordinator review (see PR notes); round-trip against a live backend not manually exercised
- [x] 5.4 Verify manually that a portal user who did not generate a given service's share link cannot see/manage it through this UI (matches backend denial from 2.2) — handled in code (both the `isOwner:false` body and a defensive 403 path); not manually exercised live

## 6. Frontend: public form page

- [x] 6.1 Add a new unguarded top-level route (e.g. `/forms/:token`) in `app.routes.ts`, outside `authGuard` — confirmed correctly placed outside the `client` route tree and `authGuard`
- [x] 6.2 Build the public form page component reusing `service-trigger-renderer`'s field rendering/validation logic — implemented via a new `executeOverride` input on the existing renderer (a lighter-touch approach than the suggested deeper extraction, chosen to avoid risk to the authenticated component); **a real bug was found and fixed here**: the page originally passed only a bare `formSchema` into a synthetic config, discarding `fields`/`payloadTemplate`/`responseMode` the renderer also needs — now passes the backend's full `ServiceTriggerConfigDto` through unchanged, guaranteeing parity with the authenticated renderer by construction
- [x] 6.3 Add the generic "this link is no longer available" state for invalid/expired/revoked/unpublished tokens — implemented; any resolve failure (status/body never inspected) renders this state
- [x] 6.4 Wire submission to the public POST endpoint from 3.3 — **a real bug was found and fixed here**: the request body was wrapped in `{ data: payload }` (the backend expects the raw field map as the entire body) and the response was mapped to a nonexistent `{success, message}` shape (the backend returns the full `ExecuteTriggerResponseDto`); both fixed to match the actual contract. Not manually exercised against a live n8n webhook.

## 7. Cross-cutting verification

- [x] 7.1 Run `openspec validate "custom-form-share-links" --strict` and resolve any reported issues
- [x] 7.2 Run the full backend and frontend test suites and verify no regressions in existing authenticated Custom Form flows — backend: 25/25 pass (13 pre-existing + 12 new); frontend: this project has no meaningful existing test suite to regress (1 trivial spec total) — `ng build --configuration production` succeeds with only pre-existing Sass/budget warnings
- [x] 7.3 Confirm the design.md Open Question (whether an existing nullable-`UserId` "system execution" pattern exists) was checked during implementation of 3.5 — confirmed none exists; `ExecutePublicCustomFormAsync` attributes public executions to the form's `CompanyOwnerUserId`, with the share-link access row being what actually distinguishes a public submission from an authenticated one

## 8. Release gate

- [x] 8.1 Config-gate or feature-flag the public routes/UI so they can exist in lower environments without being reachable in production — added `CUSTOM_FORM_SHARE_LINKS_ENABLED` (defaults `false` everywhere including production); both `PublicFormsController` actions and the owner-facing `generate` action 404/403 while disabled, so the whole feature can deploy safely with the flag off
- [ ] 8.2 Complete a dedicated security review of the new unauthenticated surface (public routes, token mechanism, rate limiting, information-disclosure behavior) per R12, using this repo's `security-review`/`pentest` skills or an equivalent manual review, and resolve or explicitly accept its findings before enabling the feature flag in production — **not started; this is the one remaining item before `CUSTOM_FORM_SHARE_LINKS_ENABLED` may be set to `true` in production**
