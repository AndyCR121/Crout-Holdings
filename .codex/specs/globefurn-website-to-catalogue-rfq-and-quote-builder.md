# Spec: Globefurn Website-to-Catalogue RFQ and Quote Builder

## Traditional user story

> As a Globefurn sales representative or email requester,
> I want an RFQ captured in a consistent structure and matched against the approved catalogue,
> So that Leandre can reliably review products, complete supplier pricing, and produce a protected Google Sheets quote.

> As Leandre,
> I want original requests, catalogue evidence, supplier details, and pricing calculations separated clearly,
> So that I can price custom, unmatched, and matched products without losing the client's original wording.

## 1. Performance thresholds

- **Capacity**: support 1-100 product lines per RFQ; rows 2-101 in Quote Items have complete, protected formulas.
- **Input validity**: website quantity must be a positive whole number; malformed structured output creates no Google Drive RFQ.
- **Matching quality**: `Matched` requires one clear catalogue identity. `Needs Review` exposes no final product identity and shows at most five real candidates.
- **Price eligibility**: only explicitly active and approved prices may populate automatic price fields. Test prices are excluded.
- **Calculation precision**: all currency calculations round to two decimals; default VAT is 15%; default currency is ZAR.
- **Confidence handling**: a numeric threshold is not yet approved. Until then, matching confidence is descriptive evidence supporting the required status rather than an autonomous decision threshold.
- **Duplicate safety**: the same `submission_id` or email-derived unique ID must not create more than one RFQ.

## 2. Graceful degradation

- If an email or website item lacks important information, preserve provided wording, leave unavailable fields blank, add a warning, and set `Needs Review`.
- If matching is ambiguous or conflicts with supplied information, retain original request fields, leave final catalogue identity blank, and show candidates.
- If no catalogue match exists, create an `Unmatched` quote item with catalogue and automatic-price fields blank for manual pricing.
- If an item is custom, create a `Custom` quote item without forcing a catalogue match.
- If a clear match has no approved price, populate catalogue information but require Leandre's supplier-price override.
- If N8N, catalogue lookup, Google Drive, or Google Sheets is unavailable, do not produce a partial or duplicate RFQ; surface a retriable failure without altering the main catalogue.
- Quote totals remain blank until every included line is reviewed and has supplier price, discount, markup, and courier values.

## 3. Learning expectations

- This workflow does not automatically train or alter matching rules from production data.
- Leandre's manual corrections, override reasons, warnings, and final product selections are retained in the RFQ workbook as review evidence.
- Future improvements may use reviewed outcomes to refine deterministic search terms or an AI prompt, but only through an approved workflow change.
- No cross-client learning profile or automated price approval is in scope.

## 4. Failure modes

- **False-positive match**: wrong catalogue product appears authoritative. Mitigation: preserve original request, require a single clear match, retain reason/confidence, and use `Needs Review` where ambiguous.
- **False-negative match**: a catalogue product is missed. Mitigation: ordered search including exact ID, series/name, description, category hints, and final variant search.
- **Incorrect price use**: test, inactive, or unapproved price enters a quote. Mitigation: separate lookup sheet exposes only active approved prices and lookup occurs only after exact matching.
- **Formula corruption**: N8N or a user overwrites calculations. Mitigation: protected fields, formulas prefilled for rows 2-101, N8N mapping restricted to named input columns.
- **Duplicate RFQ**: retry creates another folder/sheet. Mitigation: idempotency check on website submission ID or derived email ID before copying the template.
- **Lossy normalisation**: catalogue values replace the original request. Mitigation: original and catalogue fields remain separate, with `original_item_text` retained for email.
- **Pricing error**: markup is applied to courier or percentages are treated as decimals. Mitigation: protected formulas implement the agreed calculation where `20` means 20%.

## Acceptance criteria

- [ ] Website sends the defined stable client and product JSON fields, preserving telephone numbers and references as strings.
- [ ] Website form explains Series versus Product Name and applies the specified Standard, Custom, Flagged, and quantity validation behaviour.
- [ ] Submission confirmation displays the generated `submission_id`.
- [ ] Email and website paths normalise into the same structure; emails preserve `original_item_text`.
- [ ] Invalid parser output prevents Drive RFQ creation; unmatched and custom valid items still create quote lines.
- [ ] N8N uses a separate read-only catalogue lookup Sheet containing the stated identity, material, supplier, contact, page, and approved-price fields.
- [ ] The main catalogue workbook is unchanged, blank quick-lookup supplier data is not used, and test prices never reach N8N.
- [ ] Matching follows the required search order and category-hint translation rules.
- [ ] Match outcomes populate exactly as defined for `Matched`, `Needs Review`, `Unmatched`, and `Custom`.
- [ ] N8N copies the native Google Sheet template into the correct RFQ Drive folder and names it with business, reference, and date.
- [ ] The copied workbook contains RFQ Summary, Quote Items, Client Data, and Instructions, with required protections, colours, validation, filtering, wrapping, and hidden/grouped technical fields.
- [ ] All pricing formulas implement the supplied acceptance example: quantity 2, R100 price, 20% discount, 30% markup, R10 courier, and 15% VAT results in R262.20 total including VAT.
- [ ] Courier is multiplied per unit by quantity and receives no profit markup.
- [ ] Price override of an approved value requires an override reason.
- [ ] Quote totals remain blank until every included item is fully reviewed and priced.
- [ ] End-to-end tests cover all scenarios in the supplied test plan.

## Out of scope

- Editing the main catalogue workbook.
- Treating any test or non-approved pricing as production data.
- Automatic quote sending, client approval, invoice creation, or payment collection.
- Automated learning, supplier-price approval, or autonomous resolution of ambiguous matches.
- RFQs exceeding 100 product lines.

## Clarifications

### Existing workflow baseline

The existing N8N workflow, `Globefurn | Quote System`, has been tested and works correctly. It is the implementation baseline: future work must inspect and extend it incrementally, preserving its working behaviour unless a requirement explicitly replaces it. The plan will use the N8N MCP server to inspect its current nodes, connections, credentials by reference only, and operational data flow before proposing changes.

### Matching confidence

No numerical confidence threshold is required for the first release. `confidence` is a human-readable, evidence-based explanation of match certainty. A line is `Matched` only when the deterministic search sequence yields one clearly identified catalogue product; otherwise it is `Needs Review`.

### Input and write ownership

N8N may write only explicitly named input columns in `Client Data` and the protected original-request/catalogue-match/approved-price columns of `Quote Items`. It must omit absent values rather than writing blanks, and it must never write formulas, calculated fields, summaries, validation lists, or protection settings.

### Email idempotency

For email intake, derive the RFQ ID from the email provider's immutable message ID. If unavailable, derive a deterministic ID from the normalized sender, received timestamp, subject, and original body. Store the ID in the RFQ so retries are detected before Drive-folder or Sheet creation.

### Pricing and processing statuses

Use these line-level pricing statuses:

- `Needs Review` — catalogue or required RFQ information needs Leandre's review.
- `Pricing Incomplete` — required supplier price, discount, markup, courier, or required override reason is blank.
- `Ready for Quote Review` — the line has been reviewed and all required pricing inputs are present.

Use the overall RFQ status rules already specified: `New RFQ`, `Needs Product Review`, `Ready for Pricing`, `Pricing Incomplete`, and `Ready for Quote Review`.

### Google configuration

Google Drive folder IDs, template Sheet ID, read-only lookup Sheet ID, and access/protection principals are deployment configuration—not hard-coded workflow values. Their exact values will be read from the existing tested workflow and configuration during planning, without exposing credentials.

### Catalogue lookup refresh

The separate N8N lookup sheet is the workflow's only searchable catalogue source. Refreshing it from the latest working catalogue is a controlled, auditable process that preserves only approved active prices and supplier details; it does not modify the source catalogue workbook.

### Personal data handling

Client contact details are used only to create and operate the RFQ/quote. Workflow logs and durable technical notes must avoid unnecessary copies of client PII and must never include credentials.
