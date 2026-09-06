# Project Constitution

## Architecture

- **Scope**: Globefurn's website-to-catalogue RFQ and quote-building workflow.
- **Integration flow**: Website webhook and email intake -> N8N normalisation and catalogue matching -> native Google Sheets quote copy in Google Drive -> human pricing and quote review.
- **Catalogue authority**: The main catalogue workbook is read-only and must never be modified. N8N searches only a separate read-only lookup sheet populated from approved catalogue data.
- **Quote authority**: Each RFQ receives its own copied native Google Sheet based on the working `.xlsx` template, not the damaged `.xlsm` copy.
- **Data contract**: Website and email RFQs are normalised to one stable client/product schema. Header-name mapping is required when N8N writes Sheets data.
- **Maximum size**: A quote supports at most 100 item lines.

## AI and matching principles

- Preserve original website and email wording. Catalogue data supplements the request; it never overwrites it.
- Matching must follow the defined ordered search strategy and return only `Matched`, `Needs Review`, `Unmatched`, or `Custom`.
- A match may be marked `Matched` only when one catalogue product is clearly identified.
- Ambiguous, conflicting, incomplete, unavailable, or low-confidence data must degrade to `Needs Review`, with warnings and up to five real candidates where applicable.
- Custom and unmatched products must still create quote lines from the original request for manual pricing.
- Parser validation must reject malformed structured output before Drive content is created.
- Never silently infer missing quantities or required request details; preserve blanks, warn, and mark the item `Needs Review`.
- Only active, explicitly approved supplier prices may be used automatically. Test pricing and blank quick-lookup supplier values are prohibited.
- Approved-price lookup happens only after an exact catalogue match.

## Human review and pricing controls

- Leandre is the required human reviewer for catalogue review and all supplier-pricing decisions.
- Supplier price, discount, profit markup, and per-unit courier are explicit inputs; prices remain incomplete until each required value is supplied, including `0` where applicable.
- Supplier price overrides require a reason when replacing an approved automatic price.
- Formula, catalogue, N8N input, and summary cells are protected. N8N writes only named input columns and never formula columns.
- No final quote totals or quote-ready status may appear until every included line has been reviewed and fully priced.
- The pricing calculation is fixed: discount applies to supplier price; markup applies to discounted supplier cost; courier is per unit, added after markup, and has no markup; VAT is then calculated on the line subtotal.

## Auditability and duplicate safety

- Retain `submission_id` for website RFQs and an email-derived unique ID for email RFQs.
- Prevent duplicate workflow executions from creating a second RFQ.
- Retain match status, confidence, reason, candidates, warnings, approved-price source/update date, overrides, and pricing notes in the RFQ workbook.
- Record source channel and submission date on every RFQ.
- Do not expose credentials, secrets, or unnecessary personal data in workflow logs or durable documentation.

## Never-do items

- Never modify the main catalogue workbook.
- Never use the damaged `.xlsm` template.
- Never replace original request fields with catalogue fields.
- Never force a catalogue identity or automatic price onto `Needs Review`, `Unmatched`, or `Custom` items.
- Never treat test prices as production-approved prices.
- Never coerce telephone numbers, quotation references, or IDs into numeric values.
- Never calculate a final selling price while a required pricing input is blank.
- Never create a Google Drive RFQ when structured-output validation fails.
- Never create more than one RFQ for the same website submission or email-derived request ID.
- Never store credentials or secrets in source control, Sheets, N8N documentation, or Codex Memory.

## Delegation and review

- N8N may normalise, search, populate protected intake/catalogue fields, copy the template, and calculate deterministic match evidence.
- Leandre owns final product resolution, supplier selection, prices, discounts, markup, courier, and quote approval.
- Any future workflow change affecting matching, pricing, template protection, or Google Drive creation requires focused end-to-end tests before release.

## Evaluation and release expectations

- Validate all specified end-to-end scenarios, including duplicates, malformed input, matching outcomes, formula protection, rows 2-101, and the supplied pricing acceptance example.
- Treat an inconclusive match, missing approved price, or incomplete pricing as an expected review state—not a workflow failure.
- Do not publish the workflow until the test plan passes against the copied native Google Sheet template.

## Style and documentation

- Use stable JSON property names, not visible form labels, for webhook contracts.
- Keep N8N mappings explicit and header-name based.
- Use plain, user-facing labels such as `Profit Markup %`.
- Document operational decisions and durable implementation facts in Codex Memory after they are confirmed.
