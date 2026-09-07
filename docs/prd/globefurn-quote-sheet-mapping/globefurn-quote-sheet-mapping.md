# PRD: Globefurn — Map Normalized RFQ Data into the Copied Quote Sheet

| | |
|---|---|
| **System / component** | Globefurn \| Quote System (n8n workflow `jhCyit5q0xE37ErN`) |
| **Status** | Draft |
| **Author** | Andrew (AndyCR121) |
| **Date** | 2026-09-04 |
| **Related OpenSpec change** | none yet |

## 1. Summary

The Globefurn RFQ workflow already normalizes incoming website/email requests, narrows each product line against the catalogue lookup sheet, and copies the native Google Sheets quote template into a new Drive RFQ folder. Nothing writes data into that copied sheet afterward — the `Copy file` node's output goes nowhere. This PRD defines the last step: two new mapping nodes that write the normalized RFQ and its candidate-match data into the correct tabs and columns of the freshly copied sheet, respecting the template's protected/editable column groups, so Leandre opens a populated sheet instead of a blank copy.

## 2. Problem / opportunity

- `get_workflow_details` on the live workflow (`jhCyit5q0xE37ErN`) shows the connection `"Copy file": {"main": [[]]}` — the copy step is a dead end. No node writes to `RFQ Summary`, `Quote Items`, or `Client Data`.
- The project constitution (`.codex/CONSTITUTION.md`) already assumes this is done — it references "Build Client Row and Build Item Rows nodes" and requires header-name mapping — but no such nodes exist in the current workflow. The constitution describes the target state; this PRD is what gets the workflow there.
- Separately, `Create folder` and `Copy file` derive the RFQ folder/file name from `$('AI Agent').item.json.output.quote` / `$('Webhook').item.json.quote`. The `Normalize and validate RFQ` node (added since that naming logic was written) outputs everything under an `rfq` key, not `quote`, for **both** trigger paths. That reference is stale and will produce a blank/incorrect folder name (or a node error) today, regardless of source. Since the new mapping nodes write into the file this step names and copies, this has to be fixed as part of the same change — there is no correct file to map into otherwise.

## 3. Goals

- Every RFQ that reaches `Copy file` results in a correctly named Drive folder/file, and a Quote Items row per product plus an RFQ Summary header block, populated automatically — no manual retyping of what the client/rep already submitted.
- Leandre can open any newly created quote sheet and immediately see, per line, the original request as submitted and whatever catalogue candidate information the existing filter chain already produced — without needing to touch anything N8N should have filled in.
- The mapping never writes into a cell reserved for Leandre's input (yellow) or the template's protected formulas (green), so the workbook's pricing math stays trustworthy.

## 4. Non-goals

- Improving the catalogue matching/ranking logic itself (the `Filter on Series` / `Filter on Product Name` / `Filter on Material Type` chain and its `isFinal`/`identified[]` output are taken as-is). Producing genuine match confidence scoring or free-text match-reason generation is a separate, later PRD — confirmed out of scope for this change.
- The approved-price lookup (Approved supplier unit price, source, update date, approval status). No such lookup exists upstream today; this PRD leaves that blue column group blank so Leandre's override price path is the only price entry path, per the template's own fallback rule.
- Duplicate-submission / idempotency protection for `Create folder` / `Copy file` (re-running the same `submission_id` today would create a second folder+file). This is a real gap against the constitution's "prevent duplicate RFQs" rule and the test plan, but it sits upstream of the mapping step and wasn't part of the scope decision made for this PRD — tracked in §10 as a follow-up.
- Any change to the AI Agent's extraction prompt or the Structured Output Parser's JSON schema. The fields this PRD maps from (`catalogue_id`, `notes`, `product_series`, `original_item_text`, etc.) already exist on `Normalize and validate RFQ`'s output; only their destination sheet column headers are new.

## 5. User story

> As Leandre (the RFQ/pricing reviewer),
> I want the copied quote sheet to already contain the client's request and whatever catalogue candidates the workflow found,
> So that I can go straight to confirming supplier pricing, discount, markup and courier instead of manually transcribing the RFQ.

> As the workflow owner (Andrew),
> I want the Drive folder and quote file to be named from the same normalized RFQ data the mapping step reads,
> So that the file the mapping writes into is the same file Leandre and the sales rep actually find.

## 6. Requirements

### R1. Fix stale folder/file naming source

The system SHALL derive the RFQ Drive folder name (`Create folder`) and quote file name (`Copy file`) from `Normalize and validate RFQ`'s `rfq` output for both website and email-triggered runs, replacing the current `$('AI Agent').item.json.output.quote` / `$('Webhook').item.json.quote` references.

**Scenario: Email-triggered RFQ names its folder correctly**
- GIVEN an RFQ reached `Normalize and validate RFQ` via the email/AI Agent path and produced `rfq.client.business_name = "Acme Office Supplies"` and `rfq.client.quote_ref = "Q-1042"`
- WHEN `Create folder` executes
- THEN the folder is named using `rfq.client.business_name` and `rfq.client.quote_ref` (not a blank/undefined value from the old `quote` path)

**Scenario: Website-triggered RFQ names its folder identically**
- GIVEN an RFQ reached `Normalize and validate RFQ` via the `Webhook` path
- WHEN `Create folder` and `Copy file` execute
- THEN both nodes resolve the same `rfq.client.*` fields as the email path, with no dependency on which trigger fired

### R2. Write the RFQ Summary header block

The system SHALL write the client-level fields to the `RFQ Summary` tab of the newly copied sheet: business name, contact person, cell number, telephone number, email, sales rep, project name, quotation reference, submission source, and submission/quote date.

**Scenario: Header block reflects the normalized client record**
- GIVEN `rfq.client` contains `business_name`, `contact_person`, `cell_number`, `tel_number`, `email`, `sales_rep`, `project_name`, `quote_ref`, and `rfq.source` / `rfq.submission_id`
- WHEN the RFQ Summary mapping node runs
- THEN each named header field is written to its corresponding named column on `RFQ Summary`, and telephone/cell numbers and the quotation reference are written as strings, never coerced to numbers

**Assumption:** the per-item display rows on `RFQ Summary` (match status, pricing status, selling price, line total per line) are template formulas that reference `Quote Items`, not separate N8N writes — consistent with the template's "protect formulas and summaries" rule. This PRD does not write per-line data to `RFQ Summary` directly; it only writes the client/header block. Confirm this against the actual template before implementation (see §10).

### R3. Write Quote Items — original request columns

The system SHALL write one row per product (starting at row 2, one row per line, up to the 100-line maximum already enforced by `Normalize and validate RFQ`) to the grey "original request" column group on `Quote Items`: line number, source channel, original item text, product description, product type, product category, product series, product name, quantity, material, and product notes.

**Scenario: Multi-product RFQ produces one row per product in order**
- GIVEN a normalized RFQ with 3 products in `rfq.products`
- WHEN the Quote Items mapping node runs
- THEN rows 2, 3, and 4 are written, each carrying that product's `original_item_text`, `description`, `request_type` (as Product type), `category`, `product_series`, `product_name`, `quantity`, `material`, and `notes` (as Product notes), with `Line number` set to the product's 1-based position

**Scenario: Blank optional fields stay blank, not "undefined" or zero**
- GIVEN a product line has no confirmed `product_series` or `material`
- WHEN that row is written
- THEN the corresponding cells are written as empty strings, never the literal text "undefined" or a coerced `0`

### R4. Derive a Match status label from existing filter output

The system SHALL translate the existing `Filter on Material Type` output (`identified[]` candidate rows and the product's `request_type`) into one of the four sheet-defined match statuses, using only signals already produced upstream:

- `request_type` is `Custom` or `Flagged` → **Custom**
- else `identified.length === 1` → **Matched**
- else `identified.length > 1` → **Needs Review**
- else (`identified.length === 0`) → **Unmatched**

**Scenario: Single candidate maps to Matched**
- GIVEN a product's `identified` array has exactly one row and `request_type` is `Standard`
- WHEN the status is derived
- THEN the row's Match status column is written as `Matched`

**Scenario: Multiple candidates map to Needs Review**
- GIVEN a product's `identified` array has 3 rows
- WHEN the status is derived
- THEN the row's Match status column is written as `Needs Review`

**Scenario: Custom/Flagged request type overrides candidate count**
- GIVEN a product's `request_type` is `Flagged`, even if exactly one row is in `identified`
- WHEN the status is derived
- THEN the row's Match status column is written as `Custom`, not `Matched`

**Note:** this is a direct, deterministic translation of existing signals into the sheet's required vocabulary — not new matching/ranking logic. If review determines this crosses into "matching logic," pull R4 and R5 into the separately-scoped matching PRD instead (see §9).

### R5. Write Quote Items — catalogue match columns, gated by status

The system SHALL write the blue "catalogue match" column group according to the status derived in R4:

- **Matched**: populate Product ID, category/subcategory, catalogue series and product name, product number, catalogue description and material, catalogue supplier name, supplier contact/email/telephone, and catalogue page from the single `identified[0]` row.
- **Needs Review**: leave Product ID and catalogue identity fields blank; populate the Candidate matches column with up to 5 entries from `identified[]` (name + product number, or the closest available identifying fields).
- **Unmatched** or **Custom**: leave all catalogue identity and candidate fields blank.
- All statuses: populate the Warnings column from `rfq.warnings` entries relevant to that product line, when present.

**Scenario: Needs Review shows up to 5 candidates, no final identity**
- GIVEN a product's derived status is `Needs Review` with 7 rows in `identified[]`
- WHEN the row is written
- THEN Product ID and catalogue identity columns are blank, and the Candidate matches column lists exactly the first 5 candidates

**Scenario: Unmatched/Custom rows still reach the sheet with original data intact**
- GIVEN a product's derived status is `Unmatched`
- WHEN the row is written
- THEN R3's original-request columns are still fully populated and the catalogue match columns are blank, so Leandre can price it manually from the original request alone

### R6. Leave Approved price columns blank

The system SHALL NOT write to the "Approved price information" column group (approved supplier unit price, price source, price update date, price approval status) on any row, since no approved-price lookup exists upstream of this change.

**Scenario: Even a Matched row has no automatic price**
- GIVEN a product's derived status is `Matched`
- WHEN the row is written
- THEN the Approved price columns remain empty, so the template's own rule ("no approved price → override price becomes the required entry") governs Leandre's pricing input

### R7. Write the Client Data audit record

The system SHALL write the full normalized RFQ payload (submission ID, source, email message ID when applicable, client record, all product lines as submitted, and warnings) to the `Client Data` tab as N8N's internal record, separate from the human-facing `RFQ Summary` and `Quote Items` tabs.

**Scenario: Client Data retains what the human-facing tabs don't show**
- GIVEN a normalized RFQ with `submission_id`, `source`, and per-product `catalogue_id`/`notes` fields
- WHEN the Client Data mapping node runs
- THEN every field on `rfq` (client + products + warnings + submission_id/source) is written to `Client Data`, including fields not surfaced elsewhere in the workbook

**Assumption:** `Client Data`'s exact column layout isn't specified in the summary doc beyond "protected N8N data sheet." This requirement assumes it holds the full normalized record as an audit trail. Confirm the actual tab's headers before implementation (§10).

### R8. Respect the template's write guardrails

The system SHALL resolve every destination column by header name (not fixed column letters), write only to rows 2 through 101, and never write to any column in the yellow (Leandre input) or green (calculated/formula) groups on `Quote Items`, or to any formula cell on `RFQ Summary`.

**Scenario: Template column reorder doesn't silently corrupt the sheet**
- GIVEN the template's columns are read by header name at write time
- WHEN a column is added or reordered in the template ahead of a future edit
- THEN the mapping still writes each field to the column carrying the matching header, not a shifted column

**Scenario: A 101st product line is rejected before it reaches the sheet**
- GIVEN this is already enforced by `Normalize and validate RFQ` (1–100 products)
- WHEN a mapping node runs
- THEN it never attempts to write beyond row 101, consistent with the existing upstream limit

### Non-functional requirements

- **Performance**: none beyond current baseline — mapping runs once per RFQ execution, writing at most 100 rows.
- **Security / access**: no credentials, secrets, or the full email body are written into sheet cells beyond what the existing normalized fields already carry; the mapping nodes reuse the existing Google Sheets/Drive credentials already configured on the workflow.
- **Data / audit**: `submission_id`, `source`, and warnings must be traceable from `Client Data` back to the originating webhook/email, per the constitution's auditability section.
- **Compatibility**: identical mapping behavior regardless of whether the RFQ arrived via `Webhook` or `On Email Received` — both paths converge on `Normalize and validate RFQ` before reaching the mapping nodes.

## 7. UX flow & wireframe

The "UI" here is the copied Google Sheet itself — this PRD's real deliverable is what Leandre sees when they open it. The flow: RFQ arrives → normalized → candidate-matched → folder/file created (R1) → this change's two new nodes write the RFQ Summary header block (R2) and the Quote Items rows (R3–R6) → Client Data receives the audit copy (R7) → Leandre opens the sheet already populated, colour-coded by column group, ready for pricing input.

See wireframe: `globefurn-quote-sheet-mapping-wireframe.html` — an interactive n8n node diagram, not a sheet mockup. It shows the existing chain ending at the dead-end `Copy file`, the R1 fixes needed on `Create folder`/`Copy file` (click for before/after expression), and the three new branches this PRD adds (`Build RFQ Summary Row` → `Write RFQ Summary`, `Build Quote Items Rows` → `Write Quote Items`, `Build Client Data Row` → `Write Client Data`). Click any amber (fix) or blue (new) node to see its exact source-expression → destination-column field mapping, colour-tagged by which template column group (grey/blue/yellow/green) it lands in.

## 8. References

| Source | What it shows / contributed |
|---|---|
| `C:\Users\User\Downloads\Globefurn Summary Workflow.txt` | Full target spec: webhook/email schema, catalogue matching rules, sheet structure, column groups and colours, pricing math, test plan, and assumptions. Primary source for §6 requirements and the wireframe's column layout. |
| n8n workflow `jhCyit5q0xE37ErN` ("Globefurn \| Quote System"), fetched via `mcp__n8n__get_workflow_details` | Confirmed current node graph: intake (`Webhook`, `On Email Received` → `AI Agent` → `Structured Output Parser`) → `Normalize and validate RFQ` → catalogue candidate narrowing (`Get row(s) in sheet` → `Return list as one` → `Filter on Series`/`If` → `Filter on Product Name`/`If1` → `Filter on Material Type`) → `Create folder` → `Copy file` (dead end). Confirmed the stale `quote`-vs-`rfq` field reference (R1) and the absence of any post-copy mapping nodes (R2–R8). |
| `.codex/CONSTITUTION.md` | Standing rules this PRD must not contradict: read-only main catalogue, working `.xlsx` template only, header-name mapping, protected formula/catalogue/summary cells, no blanks into formula columns, string-typed phone/reference fields, auditability fields, duplicate-RFQ prevention (flagged out of scope in §4/§10, not contradicted). |

## 9. Out of scope

- Any change to the `Filter on Series` / `Filter on Product Name` / `Filter on Material Type` / `If` / `If1` matching chain's own logic.
- The approved-price lookup and its sheet columns (R6 explicitly leaves them blank).
- Free-text "Match reason" generation — the current filter chain doesn't produce one, and generating one is matching-logic work, not mapping. Left blank for this PRD; call this out to reviewers since the template's column list includes it.
- Duplicate-submission / idempotency handling on `Create folder` / `Copy file`.
- Any change to the `AI Agent` prompt or `Structured Output Parser` schema.

## 10. Open questions

- [ ] Confirm the exact tab and header names on the live copied template (`Globefurn_Quote_Intake_Template.xlsx`, Drive file `1GtG2-tRiHNMcmtoqxnUMXahZZLPdJ45C`) match this PRD's assumed structure (RFQ Summary header block vs. formula-only per-item rows; `Client Data`'s exact columns). Browser tooling wasn't connected this session (declined during setup) and there's no Sheets MCP available, so this was drafted from the summary doc's prose description only, not a direct read of the live sheet.
- [ ] Confirm the exact column headers on `08_CATALOGUE_QUICK_LOOKUP` (the `Get row(s) in sheet` source) beyond the three already visible in code (`Series_Name`, `product_name`/`Product_Name`, `Material_Type`/`material_type`/`material`) — specifically the supplier name/contact/email/telephone and catalogue page fields R5 needs to read.
- [ ] Should "Match reason" and the approved-price columns stay visibly blank in the delivered sheet, or should the template itself hide/grey those columns until a later PRD fills them in?
- [ ] Confirm whether `Client Data`'s intended content is the full normalized audit record (this PRD's assumption) or something narrower.
- [ ] Track the duplicate-RFQ-prevention gap (§4, §9) as a follow-up PRD — confirm priority.

## 11. Rollout / risks

- **Risk**: header-name mapping (R8) fails silently if the live template's actual headers differ from this PRD's assumed names (built from the summary doc, not a direct sheet read — see §10). Mitigate by validating header names against the real template before writing the implementation, not just before writing the PRD.
- **Risk**: R1's fix changes folder/file naming behavior for both trigger paths at once. Test both a website and an email RFQ end-to-end before considering this done, per the constitution's "any change affecting Google Drive creation requires focused end-to-end tests" rule.
- **Rollout**: no flag needed — this is an additive change to a currently-inactive (`"active": false`) workflow. Validate against the test plan scenarios already defined in the summary doc that are in scope for this PRD (standard match with row written, needs-review with candidates, unmatched/custom lines reaching the sheet, rows 2–101 populated correctly, formula cells untouched) before activating.

---
*This PRD is a review artifact, not an implementation plan. Once approved, hand it to OpenSpec proposal authoring (`opsx` / `openspec-propose`) to generate the actual proposal, spec deltas, and tasks — this document does not create or replace those.*
