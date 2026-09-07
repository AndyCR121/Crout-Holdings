## Context

The live workflow (`Globefurn | Quote System`, `jhCyit5q0xE37ErN`, inactive, 21 nodes today) already has: intake (`Webhook` / `On Email Received` → `AI Agent` → `Structured Output Parser`), `Normalize and validate RFQ` (outputs `{ rfq: { submission_id, source, email_message_id, original_email_text, client, products, warnings } }`), a candidate-narrowing chain (`Get row(s) in sheet` → `Return list as one` → `Filter on Series`/`If` → `Filter on Product Name`/`If1` → `Filter on Material Type`), and `Create folder` → `Copy file` (dead end). See `proposal.md` for why each piece changes.

Ground truth this design relies on (verified this session, not assumed):
- `Get row(s) in sheet` reads `08_CATALOGUE_QUICK_LOOKUP`, a tab inside the main catalogue workbook (`Globefurn filled product supplier fixed bro.xlsx`, doc id `1hzom7XdziM_XT9DF4bfrZk-ewW4uDGQZ21vL1DRwzKw`) — not a separate file.
- That workbook has 21 sheets. `01_PRODUCTS_MASTER` (1164 rows, 46 cols) is a richer per-product source than `08_...` (16 cols) — it adds `Active`, `Full_Description`, `Search_Tags`, dimensions, and feature flags. `02_SUPPLIERS`/`07_SUPPLIER_CONTACT_LIST` (9 rows each) hold real contact data keyed on `Supplier_Name`. No sheet, anywhere in the workbook, contains a price/cost/rate/approval column.
- The copied quote template (verified from `docs/prd/globefurn-quote-sheet-mapping/Globefurn_Quote_Intake_Template.xlsm` — the deprecated `.xlsm` copy per the client's summary doc, but confirmed by the user as authoritative structure for this design) has 3 tabs: `Quote Summary` (formula/display-only, not a write target), `Client Data` (one header row, 19 columns, holds client fields *and* rollup counts together), `Quote Items` (46 columns, rows 2-101, with an explicit author comment on `AJ1`: "Formula-controlled column. n8n must write only A:AI and must never send values, including blanks, to AJ:AT").
- The n8n MCP toolset available this session has no direct Google Sheets/Drive access outside n8n workflow execution itself, and a manual test-execution attempt (`execute_workflow`) hung indefinitely with zero node progress and had to be abandoned. Design accordingly: the lookup-sheet build/refresh (below) must be an n8n-native process, not something this session (or its tooling) can do outside n8n.

## Goals / Non-Goals

**Goals:**
- A catalogue lookup source isolated from the main catalogue workbook, buildable/refreshable through n8n itself.
- A single, ordered, testable matching implementation replacing the 5-node ad hoc filter chain.
- Idempotent RFQ creation.
- Real writes into `Client Data` and `Quote Items` that respect the template's actual (not assumed) structure and write boundary.

**Non-Goals:**
- Approved-price lookup or population of any pricing-input column (`Buying_Price_Excl_VAT`, `Addons_Cost_Per_Unit_Excl_VAT`, `Discount %`, `Markup %`, `Transport_Amount`, `Transport_Basis`) — no price data exists anywhere in the source workbook. Leandre fills these manually for every line, matched or not.
- Fixing the copied template's own gaps: no `Instructions` tab in this copy, and no `Quote Items` columns for source channel, a separate original-item-text, product series, or product notes. These are template-authoring gaps for the client's template owner, not something an n8n change can add columns for. `original_item_text` (falling back to `description`) is folded into the one available `Incoming_Product_Description` field; `product_series`, `product_notes`, and source-channel data have no destination in this template version and are simply not written to `Quote Items` (they remain available on the RFQ object in memory during the run, just not persisted to this sheet).
- Website RFQ form changes, native-template creation/protection work, end-to-end/regression test execution, and Leandre UAT/release (`.codex` tasks #3, #5, #9, #10) — separate, later work.
- Any change to the `AI Agent` prompt, the `Structured Output Parser` schema, or the main catalogue workbook's content.

## Decisions

**Matching implementation shape**: one (or two, if search and classification are cleanly separable) Code node(s) implementing the full ordered search + category-hint translation + outcome classification + evidence, replacing `Filter on Series`, `Filter on Product Name`, `Filter on Material Type`, `If`, `If1`. *Alternative considered*: keep the existing chained-node style and just extend it — rejected because the current chain doesn't have a step for exact-ID, category-hint translation, or Custom/Flagged bypass ordering, and five more chained nodes would be harder to test than one well-tested function. This is a per-user decision made during exploration this session.

**Lookup sheet build/refresh mechanism**: an n8n node sequence (reusing the workflow's existing Google Sheets/Drive credentials) that reads `01_PRODUCTS_MASTER` + `02_SUPPLIERS` + `07_SUPPLIER_CONTACT_LIST` from the main catalogue workbook, filters/joins them, and writes the result to a newly created, dedicated Google Sheet. *Alternative considered*: a manual, human-performed spreadsheet-building step outside n8n — rejected per user decision, since n8n already holds the needed credentials and this session has no separate Sheets/Drive tooling to do it any other way; keeping it n8n-native also makes future refreshes auditable and repeatable rather than a one-off manual copy.

**Idempotency store**: an n8n Data Table keyed on `submission_id` (or the email-derived identifier), checked before `Create folder`, recording at least the identifier, source, and the created folder's Drive reference. *Alternative considered*: name-matching against existing Drive folders — rejected as fragile (folder names aren't guaranteed unique or stable, and a rename would break detection); a Data Table is a direct, queryable key lookup. Per-user decision this session.

**Write boundary on `Quote Items`**: N8N writes only `Line_No` through `Warnings` (columns A-AC, 1-29) — i.e., the incoming-request and match-evidence columns. Columns `Buying_Price_Excl_VAT` through `Transport_Basis` (30-35) are within the template's nominal N8N-writable range (A:AI per the author comment) but are deliberately left blank since no price data exists to populate them; `Processing_Status` onward (36-46) are never written under any circumstance, per the template's own comment.

**Client Data as the single client-level write target**: supersedes the original PRD's split between an "RFQ Summary header" write and a "Client Data audit" write — the real template has no such split. One row, written once per RFQ, carries both the client fields and the computed status-count rollups (`Total_Items`, `Matched_Items`, `Needs_Review_Items`, `Unmatched_Items`, `Custom_Items`, `Pricing_Inputs_Required`), computed by counting the RFQ's classified product lines.

## Risks / Trade-offs

- [Risk] The `.xlsm` copy this design is based on is explicitly the deprecated one; the real working `.xlsx` template could differ in column names or the write boundary. → Mitigation: validate header names and the `AJ1`-equivalent write-boundary comment against the actual working `.xlsx` template before implementation is considered done, not just before this design was written.
- [Risk] Consolidating five matching nodes into one (or two) Code node(s) makes that node larger and more complex to review. → Mitigation: cover it with fixture-based tests for all four outcomes plus the exact-ID short-circuit, using `.codex/fixtures/globefurn-rfq-contract.json`'s payloads as a starting point.
- [Risk] Building the lookup sheet from `01_PRODUCTS_MASTER`+`02_SUPPLIERS`+`07_SUPPLIER_CONTACT_LIST` via n8n, with no direct Sheets/Drive MCP access this session, means the actual build step can't be verified end-to-end without either live n8n execution (which hung once already this session) or manual verification in Google Sheets. → Mitigation: build it as its own testable step with a small, manually-verifiable sample run before wiring it into the main RFQ flow.
- [Risk] Dropping `product_series`/`product_notes`/source-channel from the persisted `Quote Items` row loses information Leandre might want later. → Mitigation: flagged explicitly in `proposal.md`'s Impact section and here, for the template owner to consider adding columns for in a future template revision; not silently dropped without a record.
- [Risk] The idempotency Data Table introduces a new piece of state that must stay consistent with actual Drive folder existence (e.g., a folder deleted by a human afterward would leave a stale "already processed" record). → Mitigation: out of scope for this change to reconcile; note it as a known limitation of the simple existence-check approach.

## Migration Plan

- This is an additive change to a currently inactive workflow (`"active": false`) — no live-traffic cutover risk.
- Build and validate the lookup sheet first (task order: catalogue lookup → matching → idempotency → mapping, matching `.codex`'s task #4 → #6 → #7 → #8 dependency order), since matching depends on it.
- Test each new/replaced node group against representative fixtures (reusing `.codex/fixtures/globefurn-rfq-contract.json`) before wiring the full chain together.
- No rollback beyond the workflow's own version history is needed since the workflow isn't active; if issues surface after activation, reverting to the pre-change workflow version is sufficient.

## Open Questions

- Whether the real working `.xlsx` template (not this `.xlsm` copy) matches the column names and write boundary this design assumes — deferred to implementation-time validation per the Risks section above; does not change the approach or task breakdown, only confirms or corrects header strings.
