# Plan: Globefurn Website-to-Catalogue RFQ and Quote Builder

## Summary

Extend the tested `Globefurn | Quote System` N8N workflow rather than rebuilding it. Add a stable website/email RFQ contract, a separate approved-price catalogue lookup Sheet, deterministic matching and idempotency controls, and a protected native Google Sheets RFQ template that retains original requests separately from catalogue and pricing data.

## Approach

- **Core technique**: deterministic, evidence-based catalogue matching using ordered exact and progressively broader Google Sheets lookup queries.
- **Structured extraction**: normalise website payloads and parsed emails to the same schema. Reject malformed output before Drive creation.
- **Matching decision**: use catalogue ID first, then series/name, name/description, category/material/features, and final variant disambiguation. Return review states rather than guessing.
- **Price handling**: retrieve approved prices only after an exact match; manual pricing remains mandatory for unmatched, custom, and no-approved-price lines.
- **Template strategy**: import the working `.xlsx` template as a native Google Sheet once, configure protections/formulas/validation there, and copy that native file for every RFQ.
- **Why this approach**: it preserves the operating workflow, protects source data and formulas, and makes review decisions traceable without modifying the main catalogue.

## Data flow

```text
Website RFQ ─┐
             ├─► Normalize + validate ─► Idempotency check ─► Catalogue matching
Email RFQ ───┘                                      │                  │
                                                    │                  ├─► approved price only for exact match
                                                    │                  │
                                                    └─ duplicate ─► return existing RFQ

Validated RFQ + match evidence
  └─► Copy native template into RFQ Drive folder
        ├─► Client Data
        ├─► Quote Items protected input columns
        └─► RFQ Summary formula-driven view

Leandre
  └─► product review + supplier/discount/markup/courier inputs
        └─► protected calculations + quote-review status
```

## Implementation sequence

1. **Read-only baseline inspection**: use N8N MCP to inspect `Globefurn | Quote System`, record node-level delta, and preserve working nodes unless superseded.
2. **Website RFQ contract**: add stable fields, submission ID, conditional product guidance, and validation while preserving entered values.
3. **Normalisation and validation**: add shared schema/prompt, preserve original email text, validate fields, and block malformed output before Drive writes.
4. **Catalogue lookup source**: create the separate read-only lookup Sheet using latest working catalogue supplier data and only approved active prices.
5. **Matching subflow**: implement the stated search order, category hints, match outcomes, evidence, and candidate controls.
6. **Native Google Sheet template**: create the protected four-sheet native template, formula coverage for rows 2-101, and named header mappings.
7. **Pricing and status logic**: implement the approved formulas, override-reason requirement, and line/RFQ statuses.
8. **Idempotent Drive creation**: deduplicate before copy/create, name output consistently, and retain destination references.
9. **End-to-end validation and release**: run the required cases, regression-test the baseline, collect Leandre review, then publish with rollback preserved.

## Integration points

- **Website**: Globefurn RFQ form and webhook payload.
- **N8N**: existing `Globefurn | Quote System` workflow, shared normalisation/matching nodes, idempotency path, and error handling.
- **Google Sheets**: read-only catalogue lookup Sheet, native quote template, and copied RFQ workbooks.
- **Google Drive**: configured RFQ destination folder and template-copy operation.
- **Catalogue source**: latest working catalogue workbook, read only.
- **Human reviewer**: Leandre's pricing, resolution, and quote-review workflow.

## Evaluation strategy

- Contract tests for client/product fields, quantity validation, and string preservation.
- Parser tests for normalisation, warnings, malformed-output rejection, and original email text.
- Match tests for exact/no-price, ambiguity, no match, custom item, category hints, and candidate limits.
- Sheet tests for tabs, mapping, protection, formulas through row 101, totals, and status formatting.
- Pricing tests for the acceptance example, per-unit courier, zero values, overrides, and multi-line inputs.
- Idempotency tests for repeated website and email execution.
- Regression tests confirming unaffected tested workflow paths remain operational.

## Rollout strategy

- Create an unpublished working revision or platform-native version of the tested workflow.
- Test only against a test Drive folder and test copies of the lookup Sheet/template.
- Obtain Leandre review of representative matched, ambiguous, custom, and unmatched RFQs.
- Activate after approval and retain the current tested workflow version for rollback.
- Roll back by restoring the prior workflow version and disabling the new webhook route; do not alter the main catalogue or delete RFQs.

## Risks and mitigations

1. **Existing workflow regression**: mitigate with read-only MCP inspection, incremental changes, baseline regression tests, and versioned rollback.
2. **Wrong catalogue match or approved price**: mitigate with strict statuses, retained original wording, price gating, and human review.
3. **Template/formula corruption**: mitigate with native template copy, protections, header-only writes, and formula coverage tests.
4. **Duplicate or partial RFQs**: mitigate with pre-write idempotency and parser validation.
5. **Catalogue data drift**: mitigate with controlled lookup refresh and explicit source/update-date fields.

## Cost estimate

No AI model, Google Workspace, or N8N hosting costs are assumed. Confirm the existing parser/matching provider and operational cost profile during baseline inspection before proposing any new paid service or model.

## Open questions

- Which N8N version, workflow ID, and current nodes implement `Globefurn | Quote System`?
- Where are the working `.xlsx` template, target Drive folder, and latest catalogue currently stored?
- What process and owner approves updates to the lookup Sheet?
- Which website form/module currently submits Globefurn RFQs?
- What production/test separation exists for N8N and Google Workspace assets?

## Out of scope (for the plan)

- Editing the main catalogue workbook.
- Automatic quote sending, approvals, invoicing, payment collection, price approval, or autonomous ambiguity resolution.
