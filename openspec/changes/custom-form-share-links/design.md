## Context

See `proposal.md` - Why. Today every route that touches a Custom Form is authenticated: `client/services/**` sits behind `authGuard`, and `ServiceTriggersController`'s `GetConfigs`/`Execute` carry `[Authorize]` plus an explicit `CompanyOwnerUserId == userId` check in `ServiceTriggerService`. Sessions are `JwtHelper`-issued JWTs, 8-hour default expiry, invalidated by a `token_version` bump. `Program.cs` already has a default CORS policy built from `ALLOWED_ORIGINS` (correction from an earlier pass of this doc, which said none existed) — the new public routes inherit it as-is rather than needing a separate policy; no rate-limiting middleware existed before this change, and that part is genuinely net-new. `ServiceTriggerExecution` (the existing execution-audit model) has non-nullable `UserId`/`CompanyId` columns, which doesn't fit an anonymous public submission as-is.

## Goals / Non-Goals

**Goals:**
- Keep the public surface's authorization mechanism structurally incapable of ever validating against `[Authorize]`/`JwtHelper` — a share token and a session JWT must not be interchangeable at the middleware level, so a future refactor can't accidentally let one authenticate the other's routes.
- Reuse the existing webhook-execution code path (`ExecuteCustomFormAsync`) rather than forking it, so authenticated and public submissions can never drift in validation/behavior.
- Make the new public read/submit endpoints trivially separable from the authenticated API surface (own controller, own route prefix) so the mandatory security review (R12) has a bounded, obvious surface to review.

**Non-Goals:**
- Multi-link-per-form support (see proposal/open questions — single active link only for v1).
- Identity verification (email/OTP) of link recipients.
- Any change to `[Authorize]`-gated routes or `JwtHelper` itself.

## Decisions

### D1. Token shape and storage: opaque random value, stored hashed, own table
Generate a cryptographically random token (e.g. 256 bits, base64url-encoded) at creation time. Store only its hash (e.g. SHA-256) in a new `custom_form_share_link` table; return the raw token to the client exactly once, embedded in the share URL, at generation time. Lookups hash the presented token and compare against the stored hash. Because only the hash is stored, the raw URL is fundamentally unrecoverable after that first response — the owner-facing "get current link" read (D2, section 2.3/2.4) returns metadata only (created/expires/revoked timestamps, usage) and never a URL/token field; reopening the Share panel later never redisplays it, and the UI's only recovery path is Regenerate.

**Alternatives considered:** a scoped-down JWT (rejected — R5 explicitly requires the token be structurally incapable of being processed by the existing `[Authorize]`/`JwtHelper` pipeline, and a JWT's self-contained claims can't be revoked server-side without a blocklist, which the opaque+hashed approach gets for free via a `revoked_at` column).

Table shape (new, additive):
```
custom_form_share_link
  share_link_id       PK
  user_service_id     FK -> user_service (the Custom Form this link serves)
  created_by_user_id  FK -> user (the only user who may manage this link, per spec's ownership requirement)
  token_hash           unique, indexed
  created_at
  expires_at            created_at + fixed window (~1 year, configurable constant)
  revoked_at            nullable
```
Only one row per `user_service_id` may be "active" (not expired, not revoked) at a time — enforced at the service layer when generating a new link (revoke-then-insert, or a partial unique index if the DB supports it) rather than a DB-level uniqueness constraint on `user_service_id` alone, so history isn't destroyed on regenerate.

### D2. New controller and service, no `[Authorize]`, own route prefix
A `PublicFormsController` (route prefix e.g. `/api/public/forms`) with no `[Authorize]` attribute and no dependency on `JwtHelper`, backed by a new `IPublicFormAccessService`. It resolves `{token}` -> `(userServiceId, PublishedSchemaJson)` via the hashed lookup, and on submit calls into the same `ExecuteCustomFormAsync` logic `ServiceTriggerService` already uses for authenticated submissions (extracted to be callable without a `userId`/ownership check when invoked from the public path, since the public path's "authorization" is already the possession of a valid token — not a user identity).

A separate `ManagedFormShareLinksController` (or actions on the existing services controller area), *with* `[Authorize]`, handles generate/revoke/regenerate/usage-view for the owning portal user, enforcing the "only the generating user" check from the spec.

### D3. Audit trail: new `custom_form_share_link_access` table, not a repurposed `ServiceTriggerExecution`
`ServiceTriggerExecution.UserId`/`CompanyId` are non-nullable and semantically mean "the logged-in user who triggered this" — forcing an anonymous public visitor into that shape means inventing a fake user, which pollutes existing authenticated-only reporting. Instead:
```
custom_form_share_link_access
  access_id            PK
  share_link_id         FK -> custom_form_share_link
  accessed_at
  action                'view' | 'submit'
  service_trigger_execution_id   nullable FK -> service_trigger_execution (set only for 'submit', linking to the real execution record created via the same ExecuteCustomFormAsync path)
```
This keeps `ServiceTriggerExecution` unchanged (submissions still create a normal execution record with the *service's owning* `CompanyId`/a sentinel/nullable-safe `UserId` path already used elsewhere for system-triggered executions, if one exists — otherwise `UserId` on that specific execution row will need to become nullable, confirmed during implementation) while giving the owner's Share panel a simple `last_used_at` / `count(*)` query against `custom_form_share_link_access` for R11.

**Alternative considered:** widen `ServiceTriggerExecution` with a nullable `share_link_id` and make `UserId` nullable in place. Rejected for the design doc's default because it changes an existing, presumably-reported-on table's nullability contract; revisit during implementation if the access-log join proves awkward.

### D4. Rate limiting: ASP.NET Core built-in `Microsoft.AspNetCore.RateLimiting`
No rate-limiting middleware exists in `Program.cs` today. Use the framework-native fixed-window or sliding-window limiter (no new dependency) applied only to the `PublicFormsController` routes, keyed by a composite of token + remote IP so neither dimension alone can be starved by the other. Concrete thresholds are a security-review-time tuning knob (proposed starting point: 30 reads/min and 5 submits/min per token, 120 requests/min per IP across all public form routes) — not hard-coded into the spec per R10's own note that thresholds are an implementation detail.

### D5. Public page branding
Per the explore-mode decision, the public form page shows the owning company and service name only (resolved server-side from `user_service_id`, returned alongside the schema) — no other account context, and the invalid/expired/revoked response path never resolves or returns this data at all (satisfies R9 by construction: the "not found" branch never touches the row that would carry a name).

### D6. CORS for the new public routes: reuse the existing default policy
Corrected during implementation: `Program.cs` already has a default CORS policy built from `ALLOWED_ORIGINS` (not a wildcard), applied API-wide. The new public routes inherit this unchanged — no separate policy needed, since the public form page is still served from the same Angular app on one of those already-allowed origins, just via an unguarded route. No CORS code change was required for this decision.

### D7. Share URL base domain: `automations.crout-holdings.com`, no new DNS needed
Build the returned share URL as `https://automations.crout-holdings.com/forms/{token}`. This domain is already the SPA's production origin — it's already present in `ALLOWED_ORIGINS` in `crout-automations-api/.env.example` (`https://automations.crout-holdings.com,https://crout-holdings.com`), and the existing `api.automations.crout-holdings.com` / `automations.crout-holdings.com` pairing is already live per `crout-automations-api/nginx/default.conf` and `crout-automations/proxy.conf.json`. No `app.automations.crout-holdings.com` subdomain exists anywhere in the codebase or config, so none is needed — the public form page ships as a new unguarded route (`/forms/:token`) on the SPA's existing domain, not a separate host. Resolve this base URL server-side from configuration (e.g. an `AppBaseUrl` setting alongside the existing `ALLOWED_ORIGINS`), not hard-coded in application code, so lower environments can point it at their own origin.

## Risks / Trade-offs

- **[Risk] A long-lived (~1 year) opaque token is a durable secret with a large exposure window if leaked.** → Mitigation: R5's strict scoping (can only read/submit one form, nothing else), R9's no-disclosure response, R10's rate limiting, and R7's owner-initiated revoke all bound the damage; R12's security review is the final gate before this reaches production.
- **[Risk] Extracting `ExecuteCustomFormAsync` to be callable without a `userId` could accidentally weaken the authenticated path's ownership check if done carelessly.** → Mitigation: keep the authenticated controller action's `[Authorize]` + `CompanyOwnerUserId` check fully intact and unchanged; only add a new call path into the shared execution logic, don't modify the existing one's signature/callers.
- **[Risk] Server-side "only one active link, revoke-then-insert" logic has a race if a user double-clicks "Regenerate."** → Mitigation: wrap generate-replacing-existing in a single transaction/serializable check at the service layer; acceptable low-severity risk to flag explicitly to the security review rather than over-engineer here.
- **[Trade-off] New `custom_form_share_link_access` table instead of reusing `ServiceTriggerExecution` adds a join for the owner's usage view** → accepted; keeps existing authenticated-execution reporting semantics unchanged, which was judged more important than avoiding one new table.

## Migration Plan

1. Add `custom_form_share_link` and `custom_form_share_link_access` tables via a new numbered SQL migration file (following the existing `crout-automations-api/sql/NN_description.sql` convention).
2. Add `PublicFormAccessService`/`PublicFormsController` (no `[Authorize]`) and the owner-facing manage-link service/controller (`[Authorize]`), both additive — no existing controller/service is modified beyond extracting the shared execution call.
3. Add the new unguarded `/forms/:token` Angular route and public form page component, reusing `service-trigger-renderer`'s field/validation logic (extract shared rendering logic if it's currently tightly coupled to the authenticated component; keep it additive).
4. Add "Share" action + panel to `portal-services.component` and `portal-service-details.component`.
5. Add rate-limiting and CORS configuration in `Program.cs`, scoped to the new public route prefix only.
6. Feature-flag or config-gate production enablement behind the R12 security review sign-off — the routes/UI can exist in lower environments before that review completes, but must not be reachable in production until it does.
7. Rollback: the new tables/controllers/routes are entirely additive; disabling the feature flag (or removing the route registration) fully removes the public surface without touching any existing authenticated behavior.

## Open Questions

- Whether an existing "system-triggered" nullable-`UserId` pattern already exists on `ServiceTriggerExecution` for non-interactive executions (would simplify D3's linkage) — confirm during implementation by searching for any current non-interactive/system execution path; doesn't change the spec or task breakdown either way since D3's fallback (separate access-log table) already covers the case where no such pattern exists.
