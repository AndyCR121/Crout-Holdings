# PRD: Custom Form Validation/UX Fixes & Globefurn RFQ Intake Normalization Fix

| | |
|---|---|
| **System / component** | Crout Automations custom form builder & renderer (`crout-automations/src/app/components/service-trigger-renderer/`, `.../pages/dev/service-guide/form-builder/`, `i-custom-form-builder.interface.ts`); Globefurn `Quote System` n8n workflow (`jhCyit5q0xE37ErN`), node `Normalize and validate RFQ` |
| **Status** | Draft |
| **Author** | Andrew (AndyCR121) |
| **Date** | 2026-09-06 |
| **Related OpenSpec change** | none yet — deliberately a separate follow-up from the in-progress `globefurn-rfq-quote-builder` change (see §2) |

## 1. Summary

This PRD covers two related fixes found while testing the Globefurn client's custom-form RFQ submission end to end: four gaps in the shared Crout Automations custom-form builder/renderer (phone-number validation, required-product-list validation, sticky section tabs, and field hint text), plus one workflow bug in the Globefurn n8n intake node (`Normalize and validate RFQ`) that still hard-requires a `submission_id` body field the form no longer sends, and a related dead check left over from the `source` rename (`"website"` → `"custom-form"`).

## 2. Problem / opportunity

**Custom form builder/renderer** (`crout-automations`):
- `formatter: 'phone'` exists as an option on input fields (`i-custom-form-builder.interface.ts`, `dev-service-form-builder.component.html:248-254,517-523`) but is purely decorative — `updateSelectedInputFormatter`/`updateListInputFieldFormatter` (`dev-service-form-builder.component.ts:335-340,475-477`) only store the value. Neither the renderer (`service-trigger-renderer.component.ts`) nor its validator ever reads `formatter`; only a manually-authored `validation.regex` does anything at submit time (`validateField`, `service-trigger-renderer.component.ts:447-480`). A builder admin who picks "Phone" gets no actual validation unless they also hand-write a regex — which is exactly the gap surfaced during Globefurn testing.
- `CustomFormListElement` exposes `minItems`/`maxItems` in the builder UI (`dev-service-form-builder.component.html:420-421`), but `validateCustomForm`'s `list` branch (`service-trigger-renderer.component.ts:488-502`) only validates each *existing* item's per-field rules — it never checks the list's own length against `minItems`. A required product list with zero items currently passes validation and submits.
- The section tab bar for multi-tab custom forms (`.trigger-form-tabs`, `service-trigger-renderer.component.html:32-42`) renders inside `.trigger-card__body`, which scrolls (`overflow-y: auto`, `service-trigger-renderer.component.scss:145`). The tab bar itself has no `position: sticky`, so scrolling down in a long tab hides it, forcing the submitter to scroll back up to switch sections.
- No field type in `i-custom-form-builder.interface.ts` carries a hint/description string, and the renderer template has no element for one. A builder admin has no way to add clarifying copy under a field beyond the field's own `label`/`placeholder`.

**Globefurn `Quote System` workflow** — confirmed by reading the live node via `get_workflow_details` (`jhCyit5q0xE37ErN`):
- The `source` check has already been corrected this testing round from `"website"` to `"custom-form"` (`const source = ... || (emailTriggered ? 'email' : 'custom-form'); if (!['custom-form', 'email'].includes(source)) throw ...`) — this part is done and not part of this PRD's scope.
- `submissionId` is still computed as `toText(raw.submission_id) || (source === 'email' ? emailMessageId || fallbackEmailId : '')` — for `source === 'custom-form'` this stays `''` whenever the body has no `submission_id`, which the form no longer sends, so the very next line (`if (!submissionId) throw new Error('Website RFQs require submission_id before any Drive or Sheets action.')`) throws on every real custom-form submission today.
- Two leftovers from the same rename were found while reading the live code: the throw message still says "Website RFQs..." (should read "custom-form"), and the per-line quantity-required check (`if (source === 'website' && !quantity) throw ...`) is gated on a `source` value (`'website'`) that can no longer occur, so it silently never fires for custom-form submissions.
- This fix cannot be made in isolation: the in-progress OpenSpec change `globefurn-rfq-quote-builder` (22/25 tasks complete) already built `Check Duplicate Submission` and `Record Submission` — an entire idempotency mechanism keyed on `rfq.submission_id` — directly downstream of this node, on the assumption that a `submission_id` always exists. Simply letting `submissionId` stay `''` for custom-form RFQs would make every custom-form submission after the first one look like a duplicate of the previous empty-string entry (`Check Duplicate Submission` uses `rowNotExists` matched on `submission_id`), silently blocking all custom-form RFQs after the first. Per this session's decision, this PRD ships as its own follow-up change layered on top of `globefurn-rfq-quote-builder` rather than being folded into it, but it must produce a real, unique `submission_id` for `Check Duplicate Submission`/`Record Submission` to keep working correctly.

## 3. Goals

- A builder admin who marks a field's formatter as "Phone" gets real mobile-number validation without hand-writing a regex, consistent with the SA-number rules already enforced elsewhere in the app (`FormValidatorService.saPhone()`).
- A required product/item list actually blocks submission when empty, matching the `minItems` setting the builder UI already exposes.
- Long, multi-section custom forms keep their section tabs reachable while scrolling.
- Builder admins can add short clarifying copy under any field without overloading `label` or `placeholder`.
- Custom-form RFQ submissions from Globefurn's (and any other client's) form succeed end to end without a client-supplied `submission_id`, while the already-built duplicate-submission protection keeps working correctly for those submissions.

## 4. Non-goals

- Redesigning or extending the "decimal", "currency", or "email" formatters — only "phone" is addressed, since that's the one confirmed broken during testing.
- Enforcing `maxItems` for list elements — it has the same "builder UI exists, validator ignores it" gap as `minItems`, but wasn't reported as a problem this round; tracked in §9 as a known related gap, not fixed here.
- Any change to the AI Agent's extraction prompt, the Structured Output Parser schema, the ordered-matching logic, or the idempotency Data Table's schema built under `globefurn-rfq-quote-builder` — this PRD must produce output compatible with what that change already built, not redesign it.
- International/non-South-African mobile number formats.

## 5. User story

> As a prospective client filling out a Crout Automations custom form (e.g. Globefurn's RFQ intake),
> I want my mobile number checked against a real format as I fill it in, a required product list to actually stop me from submitting empty, the section tabs to stay put while I scroll a long form, and hint text under fields that need it,
> So that I catch my own mistakes before submitting instead of the request bouncing or arriving incomplete.

> As the form-builder admin (Andrew) configuring a client's custom form,
> I want the "Phone" formatter and a list's minimum-items setting to actually enforce something, plus a place to add a hint under any field,
> So that I don't have to hand-write regexes for common cases or lose validation rules I already configured in the builder UI.

> As the workflow owner (Andrew), watching Globefurn's RFQ workflow during testing,
> I want `Normalize and validate RFQ` to accept the form's actual current payload (no `submission_id`) without breaking the duplicate-submission protection already built downstream,
> So that real client submissions stop failing at intake.

## 6. Requirements

### R1. Phone formatter drives real regex validation

The system SHALL, when an input element or list-item input field has `formatter === 'phone'` and no explicit `validation.regex` is set, validate the field's value against the same South African mobile pattern already used by `FormValidatorService.saPhone()` (stripping spaces/hyphens/parentheses, then matching `^(\+27|0)[6-8][0-9]{8}$`).

**Assumption:** the existing SA-only pattern is reused as the default rather than a new international one, since the codebase (`form-validator.service.ts`) already assumes South African numbers throughout.

**Scenario: Invalid phone number is rejected**
- GIVEN an input or list-item field has `formatter: 'phone'` and no `validation.regex`
- WHEN a submitter enters `"123"` and attempts to submit
- THEN validation fails with a message identifying the field as an invalid phone number, and the request is not sent

**Scenario: Valid SA mobile number is accepted**
- GIVEN the same field
- WHEN a submitter enters `"082 123 4567"` or `"+27821234567"`
- THEN validation passes

### R2. Builder-authored regex overrides the phone default

The system SHALL, when a field has both `formatter === 'phone'` and an explicit `validation.regex`, validate against the explicit regex instead of the SA-mobile default.

**Scenario: Custom regex takes precedence**
- GIVEN a field has `formatter: 'phone'` and `validation.regex` set to a custom pattern (e.g. an international format)
- WHEN a submitter enters a value that matches the custom pattern but not the SA default
- THEN validation passes

### R3. Required product/item list checks item count

The system SHALL fail custom-form validation when a `list` element has `minItems` set to `1` or greater and the current number of items is less than `minItems`, in addition to the existing per-item field checks.

**Scenario: Empty required product list blocks submission**
- GIVEN a list element (e.g. "Products") has `minItems: 1`
- WHEN a submitter attempts to submit with zero items added
- THEN validation fails with a message such as "Add at least 1 {itemLabel}." and the request is not sent

**Scenario: Optional list is unaffected**
- GIVEN a list element has no `minItems` set (or `minItems: 0`)
- WHEN a submitter submits with zero items
- THEN validation passes, unchanged from today

### R4. Section tabs stay sticky while scrolling

The system SHALL keep the custom-form's section tab bar (`.trigger-form-tabs`) pinned to the top of its scrolling container (`.trigger-card__body`) as the submitter scrolls through the active tab's fields.

**Scenario: Tabs remain visible mid-scroll**
- GIVEN a custom form has multiple tabs and the active tab has enough fields to require scrolling
- WHEN the submitter scrolls down within the form
- THEN the tab bar remains visible at the top of the scrollable area and stays clickable

### R5. Optional hint text below fields

The system SHALL let a form-builder admin attach an optional hint/description string to an input, select, datetime, or checkbox element (top-level or inside a list item's fields), rendered as small helper text directly below that field's control, visually distinct from the field's label and from any validation error text.

**Assumption:** a new optional `hint?: string` property is added to `CustomFormBaseElement`/list-item field types, with a corresponding "Hint / description" text input added next to each element type's existing Label/Placeholder fields in the builder UI.

**Scenario: Hint renders below its field**
- GIVEN an input element has `hint: "Enter your 10-digit SA mobile number, e.g. 082 123 4567"`
- WHEN the form renders that field
- THEN the hint text appears directly below the field's input

**Scenario: No hint configured**
- GIVEN an element has no `hint` set
- WHEN the form renders that field
- THEN no hint element is rendered

### R6. Custom-form submissions no longer require `submission_id` in the body

The system SHALL NOT require a client-supplied `submission_id` for `custom-form`-sourced RFQs reaching `Normalize and validate RFQ`; the current unconditional `if (!submissionId) throw new Error('Website RFQs require submission_id before any Drive or Sheets action.')` check SHALL no longer fire for a `custom-form` submission that omits `submission_id`.

**Scenario: Custom-form submission without submission_id succeeds**
- GIVEN a webhook POST from a Crout Automations custom form resolves `source` to `"custom-form"` and has no `submission_id` field
- WHEN `Normalize and validate RFQ` executes
- THEN the node does not throw for that reason, and produces an `rfq` object with a non-empty `submission_id` (per R7)

### R7. Synthetic, content-derived idempotency identifier for custom-form submissions

The system SHALL derive a stable `submission_id` for `custom-form`-sourced RFQs from the submission's own content, using the same FNV-1a `stableHash` helper already implemented in this node for the email fallback path, so `Check Duplicate Submission` and `Record Submission` (built under `globefurn-rfq-quote-builder`) continue to function unchanged.

**Assumption:** the hash input is `client.email`, `client.business_name`, `client.quote_ref`/`project_name`, and the serialized `products` array, prefixed distinctly from the email path (e.g. `'form-' + stableHash(...)`) so the two paths can never collide. Whether the hash should be bucketed by a coarse time window (so an intentional identical re-submission hours later is *not* treated as a duplicate) is left open — see §10.

**Scenario: A retried identical POST is deduplicated**
- GIVEN two webhook POSTs arrive in quick succession with byte-identical `client` and `products` content and no `submission_id` in either
- WHEN both reach `Normalize and validate RFQ`
- THEN both derive the same `submission_id`, and the second is caught by the existing `Check Duplicate Submission` node

**Scenario: Two different submissions never collide**
- GIVEN two webhook POSTs with different client or product content
- WHEN both are normalized
- THEN they derive different `submission_id` values

### R8. Clean up dead code left from the `source` rename

The system SHALL (a) update the invalid-`source` error message from `"RFQ source must be website or email."` to reflect the current accepted values (`"custom-form"`/`"email"`), and (b) re-gate the per-line "quantity is required" check — currently `if (source === 'website' && !quantity) throw ...`, which can never fire since `source` is never `"website"` — on `source === 'custom-form'` instead, so the quantity-required rule the intake was designed to enforce for form submissions runs again.

**Scenario: Missing quantity on a custom-form product line is now caught**
- GIVEN a custom-form RFQ product line has no `quantity`/`product_qty`
- WHEN `Normalize and validate RFQ` executes
- THEN it throws a quantity-required error referencing the current source terminology, instead of silently accepting the line with only a warning

### Non-functional requirements

- **Performance**: negligible — R1/R3 add constant-time regex/length checks in an already-run client-side validator; R7 adds one more `stableHash` call already used elsewhere in the same node.
- **Security / access**: none beyond current baseline — no new data is collected; R7's hash is derived from data already submitted.
- **Data / audit**: the idempotency Data Table's `submission_id`/`source`/`created_at`/`drive_folder_id` schema (from `globefurn-rfq-quote-builder`) is unchanged; custom-form rows simply now carry a synthetic rather than a client-supplied `submission_id`.
- **Compatibility**: the email-triggered path (`emailMessageId`/`fallbackEmailId`) is untouched by R6/R7/R8.

## 7. UX flow & wireframe

A submitter opens a multi-tab custom form (e.g. Globefurn's RFQ intake). While filling in a contact tab, a phone-formatted field shows hint text below it and flags an invalid number inline as soon as they blur the field or attempt to submit. Scrolling down within a tab's fields keeps the tab bar pinned at the top so they can jump to another section without scrolling back up. On a "Products" tab, the list starts empty with an "Add product" affordance; attempting to submit with zero products shows an inline validation message instead of silently succeeding. Once at least one product and a valid phone number are present, submission proceeds as today.

See wireframe: `custom-form-rfq-fixes-wireframe.html`

(The Globefurn workflow fix, R6–R8, is an n8n code-node change with no end-user-visible UI; it is not depicted in the wireframe.)

## 8. References

No screenshots, docs, or links were supplied with this request — it originated from the requester's own testing notes. This PRD's technical grounding instead comes from directly reading the current source during this session:

| Source | What it contributed |
|---|---|
| `crout-automations/src/app/components/service-trigger-renderer/service-trigger-renderer.component.ts` (+ `.html`, `.scss`) | Confirmed the renderer's actual validation logic (`validateField`, `validateCustomForm`), the unused `formatter` field, the missing `minItems` list-length check, and the non-sticky `.trigger-form-tabs` markup/styles |
| `crout-automations/src/app/pages/dev/service-guide/form-builder/dev-service-form-builder.component.ts` (+ `.html`) | Confirmed the "Phone" formatter option exists in the builder UI but only sets metadata; confirmed list elements expose `minItems`/`maxItems` but no `required` checkbox |
| `crout-automations/src/app/interfaces/i-custom-form-builder.interface.ts` | Confirmed current schema shape for all element/field types — no existing hint/description property |
| `crout-automations/src/app/services/form-validator.service.ts` | Source of the existing SA mobile-number regex (`saPhone()`) reused as R1's default |
| n8n `get_workflow_details` on workflow `jhCyit5q0xE37ErN` (`Globefurn \| Quote System`) | Live current code of `Normalize and validate RFQ`, confirming the `source` rename is already partially done, the `submission_id` throw is still live, and the two rename leftovers (R8) |
| `openspec/changes/globefurn-rfq-quote-builder/` (proposal, design, tasks) | Confirmed the in-progress idempotency mechanism (`Check Duplicate Submission`, `Record Submission`) is keyed on `rfq.submission_id`, and that this PRD's fix must stay compatible with it |

## 9. Out of scope

- Enforcing `maxItems` on list elements (same class of gap as `minItems`, not reported this round).
- Non-South-African phone number formats.
- Any change to the "decimal", "currency", or "email" formatters.
- Any change to the AI Agent prompt, Structured Output Parser schema, ordered-matching logic, or idempotency Data Table schema from `globefurn-rfq-quote-builder`.
- Folding this work into the `globefurn-rfq-quote-builder` change's own artifacts (its proposal/design/tasks keep describing the workflow as it stood when that change was authored; per this session's decision this ships as a separate, later change).

## 10. Open questions

- [ ] Should R7's content hash be bucketed by a time window (e.g. per hour) so a client who intentionally resubmits the same RFQ later isn't treated as a duplicate? Left open for review before implementation.
- [ ] Should R5's hint text apply to list-item fields as well as top-level elements (assumed yes), or only top-level elements?
- [ ] Exact copy for the new phone-format error message and any hint placeholder copy — left to review/implementation.

## 11. Rollout / risks

No feature flag needed — these are direct fixes to existing, already-shipped behavior (form validation/rendering) and a currently-broken workflow node (every real custom-form submission fails today, so there is no working baseline to regress). Main risk is R7's content-hash approach: two genuinely distinct submissions with identical client/product text submitted close together would be wrongly deduplicated; see the open time-bucketing question in §10 before implementation.

---
*This PRD is a review artifact, not an implementation plan. Once approved, hand it to OpenSpec proposal authoring (`opsx` / `openspec-propose`) to generate the actual proposal, spec deltas, and tasks — this document does not create or replace those.*
