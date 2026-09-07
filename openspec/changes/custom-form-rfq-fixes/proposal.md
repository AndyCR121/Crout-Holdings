## Why

Testing Globefurn's custom-form RFQ submission end to end surfaced two classes of bugs: the shared Crout Automations custom-form builder/renderer silently accepts invalid phone numbers and empty "required" product lists, loses its section tabs off-screen on scroll, and has no way to add field hint text; and the Globefurn n8n intake node `Normalize and validate RFQ` still hard-requires a `submission_id` body field that the form no longer sends, so every real custom-form submission fails at intake today. Fixing the intake failure requires producing a real, unique identifier for the duplicate-submission protection already built downstream (under the separate, in-progress `globefurn-rfq-quote-builder` change) — it can't just stop enforcing the field.

## What Changes

- Phone-formatted fields (`formatter: 'phone'`) in the custom-form renderer now enforce the same South African mobile regex used elsewhere in the app by default, unless the form builder has authored its own `validation.regex`, which takes precedence.
- Custom-form `list` elements with `minItems >= 1` now fail validation when submitted with fewer items than `minItems` (previously only each *existing* item's own fields were validated, so an empty required list passed silently).
- The custom form's section tab bar becomes sticky to the top of its scrolling container so it stays reachable while a long tab's fields are scrolled.
- Form builder admins can attach an optional hint/description string to an input, select, datetime, or checkbox element (top-level or inside a list item), rendered below that field's control.
- **BREAKING**: the Globefurn `Normalize and validate RFQ` n8n code node no longer throws when a `custom-form`-sourced submission has no `submission_id`; instead it derives one from the submission's own content, so `Check Duplicate Submission`/`Record Submission` (built under `globefurn-rfq-quote-builder`) keep working unchanged for the custom-form path.
- Cleans up two dead-code leftovers in that same node from the earlier `source` rename (`"website"` → `"custom-form"`): a stale error message and a per-line quantity-required check that could never fire.

## Capabilities

### New Capabilities

- `custom-form-validation`: the custom-form renderer's field-level validation contract — phone-formatter default regex (with builder override) and required-list minimum-item-count enforcement.
- `custom-form-field-presentation`: the custom-form renderer's presentational behavior for section tabs (sticky-on-scroll) and per-field hint/description text.
- `globefurn-rfq-intake-normalization`: the `Normalize and validate RFQ` n8n node's contract for accepting a `custom-form`-sourced RFQ without a client-supplied `submission_id`, deriving a stable synthetic one instead, compatible with the existing idempotency mechanism built under `globefurn-rfq-quote-builder`.

### Modified Capabilities

(none — `openspec/specs/` has no existing capabilities yet; this is a greenfield spec repo, so all behavior above is captured as new capabilities rather than deltas to existing ones)

## Impact

- **Frontend** (`crout-automations`): `src/app/components/service-trigger-renderer/service-trigger-renderer.component.ts` (+ `.html`, `.scss`) — validation logic and sticky-tab styling; `src/app/interfaces/i-custom-form-builder.interface.ts` — new optional `hint` field on element/list-item-field types; `src/app/pages/dev/service-guide/form-builder/dev-service-form-builder.component.ts` (+ `.html`) — builder UI for authoring hint text (no change needed for phone/minItems, which reuse existing `formatter`/`minItems` fields already exposed there).
- **n8n workflow** `Globefurn | Quote System` (`jhCyit5q0xE37ErN`): the `Normalize and validate RFQ` code node only. No other node in that workflow changes.
- **Depends on / must stay compatible with**: `Check Duplicate Submission` and `Record Submission` (built under the separate `globefurn-rfq-quote-builder` change), which key on `rfq.submission_id`. This change must keep producing a value in the same shape those nodes already expect.
- **No changes** to the AI Agent extraction prompt, Structured Output Parser schema, ordered-matching logic, idempotency Data Table schema, the "decimal"/"currency"/"email" formatters, or `maxItems` enforcement — all explicitly out of scope per the source PRD.
