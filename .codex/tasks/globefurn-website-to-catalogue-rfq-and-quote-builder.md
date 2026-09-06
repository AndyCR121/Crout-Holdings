# Tasks: Globefurn Website-to-Catalogue RFQ and Quote Builder

## 1. Inspect and document the tested N8N baseline

**Description**: Use the N8N MCP server read-only to inspect `Globefurn | Quote System`, record its workflow ID, triggers, nodes, mappings, error paths, Drive/Sheets integration references, and current idempotency behaviour. Define the minimal node-level change set.

**Done-when**: a baseline note identifies the working workflow structure, protected existing behaviour, configuration references without secrets, and proposed extension points.

**Depends-on**: none.

## 2. Define and test the unified RFQ contract

**Description**: Add the stable website/email client and product schema, including `submission_id`, source, IDs, original email text, product series, catalogue ID, and notes. Add schema validation and fixtures for valid and invalid payloads.

**Done-when**: valid website and email fixtures normalise to one schema; malformed output and invalid quantities are rejected before Drive creation; telephone numbers and references remain strings.

**Depends-on**: #1.

## 3. Update the Globefurn website RFQ form

**Description**: Locate the existing RFQ form, implement stable webhook keys, generate/display `submission_id`, add Series/Product Name help text, and apply Standard/Custom/Flagged conditional validation.

**Done-when**: the form sends only the required stable properties, preserves exact entered text, validates positive integer quantity, and displays the generated submission ID after submission.

**Depends-on**: #2.

## 4. Build the read-only N8N catalogue lookup Sheet

**Description**: Create the separate lookup Google Sheet and populate required catalogue identity, material, supplier/contact, page, and approved-price fields from the latest working catalogue. Exclude test prices and blank quick-lookup supplier values.

**Done-when**: N8N can read the lookup Sheet; it contains only approved active prices where available; no main catalogue workbook is modified.

**Depends-on**: #1.

## 5. Create and validate the native quote template

**Description**: Import the working `.xlsx` template as native Google Sheets. Configure RFQ Summary, Quote Items, Client Data, and Instructions; protections; validations; grouped technical columns; formatting; and formulas for rows 2-101.

**Done-when**: a copied test workbook has all required sheets, protected formula/catalogue/input areas, editable Leandre columns, and complete formulas in each Quote Items row 2-101.

**Depends-on**: #1.

## 6. Implement catalogue matching and approved-price gating

**Description**: Extend the N8N workflow with the required ordered matching search, category hints, candidate collection, match statuses, confidence explanation, warnings, and approved-price lookup after exact matching only.

**Done-when**: fixture tests cover clear match with and without approved price, ambiguity, no match, custom item, and all four match outcomes preserve original request data correctly.

**Depends-on**: #2, #4.

## 7. Implement duplicate-safe RFQ orchestration

**Description**: Add website/email unique-ID checks before Drive writes; copy the native template to the configured RFQ folder; name it from business, reference, and date; and retain the destination reference for retries.

**Done-when**: repeated website and email inputs produce exactly one RFQ each; malformed inputs create no folder or Sheet; valid unmatched/custom inputs still create a quote.

**Depends-on**: #2, #5.

## 8. Map quote data and pricing-status behaviour

**Description**: Update Build Client Row and Build Item Rows to resolve destination columns by header name. Populate only permitted input columns, implement status inputs, and verify formulas calculate the approved pricing model without N8N touching formula cells.

**Done-when**: the R262.20 acceptance example passes; per-unit courier is multiplied by quantity; override reasons are required; and totals stay blank until all included lines are reviewed and fully priced.

**Depends-on**: #5, #6, #7.

## 9. Run end-to-end and regression tests

**Description**: Execute the complete supplied test plan against test Google assets and a working N8N revision. Compare existing unaffected workflow paths before and after the changes.

**Done-when**: every specified scenario passes, protected fields resist N8N and user writes, formula coverage is complete, duplicate prevention passes, and baseline workflow regression checks pass.

**Depends-on**: #3, #8.

## 10. Complete Leandre UAT and controlled release

**Description**: Generate representative RFQs for matched, no-price, ambiguous, unmatched, custom, email, and multi-line cases. Obtain Leandre's review, publish the revised workflow, and retain rollback instructions/version.

**Done-when**: Leandre approves the test RFQs, the revised workflow is published, and the prior tested version plus rollback procedure are documented.

**Depends-on**: #9.

## Parallelisable work

- After #1: #2, #4, and #5 can proceed in parallel.
- After #2: #3 can proceed independently while #4/#5 are completed.
- #6 and #7 converge after their respective dependencies; #8 follows both.
