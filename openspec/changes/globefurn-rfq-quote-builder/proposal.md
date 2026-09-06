## Why

The Globefurn `Quote System` n8n workflow (`jhCyit5q0xE37ErN`) normalizes RFQs and narrows catalogue candidates, but the chain dead-ends at `Copy file` — nothing ever writes into the copied quote sheet, the catalogue search reads directly from the main catalogue workbook instead of an isolated lookup source, matching only produces a boolean/candidate-list rather than the required Matched/Needs Review/Unmatched/Custom contract, and nothing prevents a retried submission from creating a second RFQ folder. A prior planning pass (`.codex/specs`, `.codex/plans`, `.codex/tasks`, dated 2026-09-01) already scoped this as tasks #4, #6, #7, and #8 of a larger project; this change implements that slice end-to-end now, using the actual live workflow and actual spreadsheet structures (verified this session, not assumed from prose) as ground truth.

## What Changes

- Build a genuinely separate, read-only Google Sheet for N8N catalogue lookups, populated from `01_PRODUCTS_MASTER` (filtered to `Active = "Yes"`) joined with `02_SUPPLIERS`/`07_SUPPLIER_CONTACT_LIST` for real contact fields — replacing the current `08_CATALOGUE_QUICK_LOOKUP` read, which lives inside the main catalogue workbook itself, not a separate file. No price/cost/approval columns are populated: none exist anywhere in the source workbook (verified across all 21 sheets), so approved-price lookup is out of scope for this change.
- Replace the `Filter on Series` / `Filter on Product Name` / `Filter on Material Type` / `If` / `If1` chain with a single ordered-matching implementation: exact `catalogue_product_id` → series+name → name+description → category/material/feature terms → final variant disambiguation, with category-hint translation (Seating/Workstation/Storage/Other) and a `Matched` / `Needs Review` / `Unmatched` / `Custom` outcome per product, each with a confidence/reason and up to 5 candidates where relevant.
- Add idempotency: an n8n Data Table keyed on `submission_id`, checked before `Create folder` runs, so a retried website/email submission does not create a second Drive folder/quote copy.
- **BREAKING**: Fix `Create folder` and `Copy file`, whose naming expressions currently read `$('AI Agent').item.json.output.quote` / `$('Webhook').item.json.quote` — a shape that no longer exists on `Normalize and validate RFQ`'s actual `rfq`-keyed output — to read `rfq.client.*` instead, for both trigger paths.
- Add two new mapping nodes after `Copy file` that write the normalized, matched RFQ into the copied sheet's real tabs: one row to `Client Data` (client/header fields plus computed `Total_Items`/`Matched_Items`/`Needs_Review_Items`/`Unmatched_Items`/`Custom_Items`/`Pricing_Inputs_Required` counts), and one row per product to `Quote Items` (columns `Line_No` through `Warnings` only — columns `Buying_Price_Excl_VAT` onward stay blank for Leandre, and the formula columns `Processing_Status` onward are never written, per the template's own author comment on `Quote Items!AJ1`).

## Capabilities

### New Capabilities

- `globefurn-catalogue-lookup`: a separate, read-only N8N catalogue lookup Google Sheet, built and kept current from the main catalogue workbook's product/supplier data, isolated from the main catalogue workbook itself.
- `globefurn-rfq-matching`: the ordered catalogue-matching contract that turns a normalized product line into a `Matched`/`Needs Review`/`Unmatched`/`Custom` outcome with evidence, replacing the current ad hoc filter chain.
- `globefurn-rfq-idempotency`: duplicate-submission detection that prevents a retried website/email RFQ from creating a second Drive folder and quote copy.
- `globefurn-quote-sheet-mapping`: writing the normalized RFQ and its match evidence into the copied quote sheet's `Client Data` and `Quote Items` tabs, plus the `Create folder`/`Copy file` naming fix that this mapping depends on.

### Modified Capabilities

(none — this is a greenfield OpenSpec repo; the current workflow behavior isn't captured as an existing `openspec/specs/` capability yet, so there is nothing to modify, only new capabilities to add)

## Impact

- **n8n workflow** `Globefurn | Quote System` (`jhCyit5q0xE37ErN`, currently inactive): `Filter on Series`, `Filter on Product Name`, `Filter on Material Type`, `If`, `If1` are removed and replaced; `Get row(s) in sheet` is repointed at the new lookup sheet; `Create folder` and `Copy file` have their naming expressions fixed; new nodes are added for idempotency and for the two sheet-mapping writes.
- **Google Drive/Sheets**: a new Google Sheet is created (via n8n's existing Google Sheets/Drive credentials) to hold the separate catalogue lookup data; the copied quote template's `Client Data` and `Quote Items` tabs receive real writes for the first time.
- **n8n Data Table**: a new table is created to track processed `submission_id`s for idempotency.
- **No changes** to the AI Agent's extraction prompt, the Structured Output Parser schema, the website RFQ form, the native quote template's protections/formulas, or the main catalogue workbook (read-only throughout).
- **Known gap carried forward, not fixed here**: the current copied-template structure (verified from `docs/prd/Globefurn_Quote_Intake_Template.xlsm`) has no `Instructions` tab and no `Quote Items` columns for source channel, a separate original-item-text, product series, or product notes — flagged in `design.md` for the template's owner, not something this n8n change can fix.
