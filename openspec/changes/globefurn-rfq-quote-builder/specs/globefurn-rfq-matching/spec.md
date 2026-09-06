## Purpose

Turns each normalized RFQ product line into one of four defined, evidence-backed outcomes against the catalogue lookup, replacing today's ad hoc series/name/material filter chain with a single ordered, testable search contract.

## ADDED Requirements

### Requirement: Ordered catalogue search sequence
For each product with `request_type` of `Standard`, the system SHALL search the catalogue lookup sheet in this order, stopping at the first step that yields a usable result: (1) exact `catalogue_product_id`, (2) series plus product name, (3) product name plus distinctive description terms, (4) category plus material plus feature terms, (5) a final series/variant disambiguation pass when multiple variants of the same series remain plausible.

#### Scenario: Exact catalogue ID short-circuits the remaining search steps
- **GIVEN** a product with `catalogue_id = "GF-0001"`
- **WHEN** matching runs
- **THEN** the lookup sheet row for `Product_ID = "GF-0001"` is used directly and steps 2-5 are not evaluated

#### Scenario: No catalogue ID falls through to series plus name
- **GIVEN** a product with no `catalogue_id`, `product_series = "President Heavy Duty"`, and `product_name = "High Back Chair"`
- **WHEN** matching runs
- **THEN** the search evaluates series-plus-name candidates before falling further back to name/description or category/material terms

### Requirement: Category-hint translation
The system SHALL translate the RFQ's broad `category` value into catalogue search hints without requiring an exact text match: `Seating` maps to Office Chairs, Soft Seating, Tables & Chairs and related seating categories; `Workstation` maps to Desks, Workplace, Height Adjustable Furniture and related categories; `Storage` maps to Storage; `Other` searches without a category restriction.

#### Scenario: Seating category matches an Office Chairs catalogue row
- **GIVEN** a product with `category = "Seating"` and no exact catalogue category text match on "Seating"
- **WHEN** the category/material/feature search step runs
- **THEN** catalogue rows with `Category = "Office Chairs"` are still considered candidates

### Requirement: Four-outcome match result vocabulary
The system SHALL classify every product with exactly one of `Matched`, `Needs Review`, `Unmatched`, or `Custom`, using: `Matched` only when the ordered search yields exactly one clearly identified catalogue product; `Needs Review` when multiple candidates remain plausible or supplied information conflicts; `Unmatched` when no reasonable catalogue candidate exists; `Custom` when `request_type` is `Custom` or `Flagged`, bypassing catalogue search entirely.

#### Scenario: Custom request type bypasses catalogue search
- **GIVEN** a product with `request_type = "Custom"`
- **WHEN** matching runs
- **THEN** the outcome is `Custom` without the ordered search steps being evaluated, even if a catalogue product with a similar name exists

#### Scenario: Exactly one candidate yields Matched
- **GIVEN** a `Standard` product whose ordered search narrows to exactly one catalogue row
- **WHEN** the outcome is classified
- **THEN** the outcome is `Matched` and the catalogue row's identity fields are attached as match evidence

#### Scenario: Multiple plausible candidates yield Needs Review
- **GIVEN** a `Standard` product whose ordered search narrows to more than one catalogue row with no way to disambiguate further
- **WHEN** the outcome is classified
- **THEN** the outcome is `Needs Review`, no single catalogue identity is attached as final, and up to 5 of the real candidate rows are retained

#### Scenario: No plausible candidate yields Unmatched
- **GIVEN** a `Standard` product whose ordered search yields zero catalogue rows at every step
- **WHEN** the outcome is classified
- **THEN** the outcome is `Unmatched` and no catalogue identity or candidates are attached

### Requirement: Match evidence is retained
The system SHALL retain, for every classified product, which search step (if any) produced the result and a human-readable reason supporting the classification.

#### Scenario: A Matched line records its search step
- **GIVEN** a product matched via the series-plus-name search step
- **WHEN** the match evidence is retained
- **THEN** the recorded reason identifies series-plus-name as the basis for the match, not a generic "matched" label with no evidence

### Requirement: Original request data is never overwritten by catalogue data
The system SHALL keep the product's originally submitted fields (`original_item_text`, `description`, `product_series`, `product_name`, `material`) unchanged by matching, regardless of outcome.

#### Scenario: A Matched product's original description is preserved
- **GIVEN** a product matched to a catalogue row whose `Short_Description` differs from the product's submitted `description`
- **WHEN** matching completes
- **THEN** the product's original `description` value is unchanged; the catalogue row's description is retained separately as match evidence, not merged into or overwriting the original
