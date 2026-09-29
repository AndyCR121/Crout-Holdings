# Manual testing checklist — Custom Form external share links (finalize)

Covers the baseline share-link feature (sections 1–7 of `tasks.md`) plus the new work from
this session (section 9: email delivery, capped validity, auto-invalidation) and the
`CUSTOM_FORM_SHARE_LINKS_ENABLED` flag removal (D11 in `design.md`). Tick items off as you
verify them; note the actual result next to anything that doesn't behave as expected so it
can be folded back into `tasks.md`/`design.md`.

**Environment:** API on `http://localhost:5000` (Docker), frontend on `http://localhost:4200`
(`ng serve`). No flag to set — the feature is unconditionally on.

---

## A. Setup

- [ ] Log into the portal (`http://localhost:4200/client/dashboard`) as a user with at least
      one service that has a **confirmed Custom Form trigger add-on** (needed for every test
      below). If none exists, use the admin panel (`http://localhost:4200/admin/client-services`)
      to find/create one, or check via API: `GET http://localhost:5000/api/services`.
- [ ] Confirm the Custom Form itself has been **published** (not just drafted) for that
      service — an unpublished form's share link should never work (see section B).

## B. Share panel — settings step (portal)

Where: `http://localhost:4200/client/services` (card actions) or
`http://localhost:4200/client/services/:userServiceId` (detail page) → **Share** action.

- [ ] **Share action visibility** — the "Share" action appears only on services with a
      confirmed Custom Form trigger; confirm it's hidden on a service without one.
- [ ] **Settings step opens first** — clicking "Share" (no existing link) shows "Set up a
      link", not an immediate URL. Clicking it opens the method/validity settings step, not
      a generated link.
- [ ] **URL method** — select URL, pick a validity, generate. Confirm: a full
      `http://localhost:4200/forms/{token}` URL is shown once, with a working copy button.
- [ ] **Email method — recipient chips** — select Email. Type a malformed address (e.g.
      `not-an-email`) and confirm it's rejected inline without clearing other valid chips
      already added. Add 2+ valid addresses as chips; confirm each renders as a removable chip.
- [ ] **Email method — cannot generate with zero recipients** — clear all chips; confirm the
      Generate/Send button is disabled or the request is rejected.
- [ ] **Email method — send confirmation** — generate with valid recipients. Confirm the UI
      shows "sent to: [addresses]" rather than a raw URL (the email method should never
      display the token/URL to the owner).
- [ ] **Validity — custom days** — enter a custom day count (e.g. 10); confirm the generated
      link's "Expires" reflects created-time + 10 days.
- [ ] **Validity — "1 Year" preset** — select the preset instead of typing a number; confirm
      expiry is exactly 365 days out.
- [ ] **Validity — over-365 rejected** — try to enter e.g. 400 in the custom-days field;
      confirm the UI clamps/rejects it (max 365), and that a manual API call bypassing the UI
      also gets rejected server-side (see section F).
- [ ] **Persisted-link view shows settings** — close and reopen the Share panel. Confirm the
      "active" state now shows Method (and Recipients, if Email) alongside the existing
      Created/Expires/Last used/Submissions fields — and that it does **not** redisplay the
      raw URL.
- [ ] **Regenerate re-opens settings** — click Regenerate on an active link; confirm it opens
      the settings step again (not an instant silent regenerate reusing old settings).
- [ ] **Single active link per form** — generate a second link (regenerate) for the same
      service; confirm the previous link's URL now returns "no longer available" at
      `http://localhost:4200/forms/{old-token}`.
- [ ] **Revoke** — revoke an active link; confirm the panel returns to "no link yet" and the
      old URL stops working.
- [ ] **Per-form independence** — repeat for a *second* service with its own Custom Form;
      confirm revoking/regenerating one service's link has no effect on the other's.
- [ ] **Non-owner denial** — (if you have a second portal user on the same company) confirm
      that user cannot view/manage a link they didn't generate — panel should show the
      "managed by the portal user who generated it" state.

## C. Public form page (`/forms/:token`)

Where: open the generated URL directly (new incognito/private tab, so you're not logged in).

- [ ] **Valid link renders the form** — no login prompt, no portal chrome; company/service
      name shown as light branding.
- [ ] **Submission works** — fill in required fields and submit; confirm you see the
      configured response (note: this needs the n8n webhook target to actually be reachable —
      if it isn't in your local setup, at least confirm the request reaches the API without a
      500 and fails gracefully).
- [ ] **Invalid field blocked client-side** — leave a required field empty and try to submit;
      confirm the same inline validation as the authenticated in-portal form.
- [ ] **Expired/revoked/never-existed link** — try an expired link, a revoked link, and a
      made-up token; confirm all three show the exact same generic "this link is no longer
      available" message (no distinguishing info).
- [ ] **Unpublished form has no working link** — if you can unpublish a form's schema without
      breaking other tests, confirm its share link also shows the generic unavailable state.

## D. Email delivery specifics

- [ ] **SMTP reachability** — after generating an Email-method link, check whether the email
      actually arrives at the recipient inbox. If your local network can't reach
      `mail.crout-holdings.com`, confirm instead (via API response / no crash) that the
      generate call still succeeds gracefully even though the send itself silently fails —
      check `docker compose logs api` for a "Form share-link email failed" warning, not a hard
      error.
- [ ] **Email content/branding** — if it does arrive, confirm the email looks like the other
      client-facing emails (booking confirmation style: header, CTA button, footer), shows the
      correct company/service name, and the "Open the form" link/button actually works.
- [ ] **Multiple recipients** — confirm each of 2+ recipients gets their own email (not one
      email with all addresses in To/Cc).
- [ ] **No secrets in logs** — `docker compose logs api | grep -i forms` (or similar) — confirm
      the raw share URL/token never appears in application logs.

## E. Auto-invalidation on service disable/delete/unpaid (new — R7)

Where: `http://localhost:4200/admin/client-services` (admin panel; requires an admin user).

- [ ] **Setup** — generate an active share link for a test service first, confirm it resolves
      at `/forms/:token`.
- [ ] **Delete revokes it** — delete that service via the admin panel (or
      `DELETE http://localhost:5000/api/admin/client-services/{id}`); confirm the share link's
      URL immediately returns "no longer available".
- [ ] **Disable/mark-unpaid revokes it** — repeat with a fresh link, this time using the admin
      "edit" flow to flip the service's Active flag to false (not delete); confirm the same
      immediate revocation.
- [ ] **Reactivating does not restore it** — flip the service back to Active; confirm the old
      share link is still dead (owner must generate a brand-new one, per design).

## F. API-level sanity checks (optional, via curl/Postman)

- [ ] `POST /api/companies/{companyId}/services/{userServiceId}/share-link/generate` with
      `validityDays: 400` → expect `400 Bad Request`, not silently clamped server-side.
- [ ] `POST .../generate` with `shareMethod: "email"` and `recipientEmails: []` → expect
      `400 Bad Request`.
- [ ] `POST .../generate` with `shareMethod: "email"` and one malformed address mixed with a
      valid one → expect `400 Bad Request` and confirm (via DB or the panel) that **no** link
      was created and **no** email was sent for the valid address either (reject-before-side-effects).
- [ ] Take a valid share token and try it against an unrelated authenticated endpoint (e.g.
      `GET /api/companies/{companyId}/services` with `Authorization: Bearer {token}`) → expect
      it to be rejected exactly like any other malformed bearer token (R5 — token scoped to
      one form's public actions only).

## G. Regression check

- [ ] The **authenticated** in-portal Custom Form fill-in flow (not via a share link) still
      works exactly as before — this change should be purely additive.
- [ ] `dotnet test` in `crout-automations-api/CroutApi.Tests` still passes in full.
- [ ] `ng build --configuration production` in `crout-automations` still succeeds.

---

## Known/accepted gaps going in (not bugs — already documented)

- No code-level gate exists anymore for production exposure — see `design.md` D11. This is a
  deliberate, explicit decision, not something to "find" during testing.
- The R12 security review itself (task 8.2) is still outstanding and out of scope for this
  checklist — this checklist is functional/manual QA, not a security review.
- `03_fix_encoding.sql` (a pre-existing, unrelated migration) has a MySQL syntax error
  (`CONTAINS()`) discovered while setting up local Docker testing — flagged separately, not
  part of this feature.
