## Purpose

Writes the normalized, matched RFQ into the copied quote sheet's real `Client Data` and `Quote Items` tabs, so Leandre opens a populated sheet ready for pricing review instead of a blank template copy, and fixes the folder/file naming this mapping depends on.

## ADDED Requirements

### Requirement: RFQ folder and quote file are named from live normalized data
The system SHALL derive the RFQ Drive folder name (`Create folder`) and quote file name (`Copy file`) from `Normalize and validate RFQ`'s `rfq.client` fields, for both website and email-triggered runs.

#### Scenario: Folder naming no longer depends on a stale field path
- **GIVEN** an RFQ has been normalized into `rfq.client.business_name` and `rfq.client.quote_ref`
- **WHEN** `Create folder` executes
- **THEN** the folder name is derived from those `rfq.client` fields, not from `$('AI Agent').item.json.output.quote` or `$('Webhook').item.json.quote`

#### Scenario: Website and email RFQs name their folders identically
- **GIVEN** two RFQs with the same client data, one arriving via `Webhook` and one via `On Email Received`
- **WHEN** each reaches `Create folder`
- **THEN** both resolve their folder name the same way, from `rfq.client`

### Requirement: One Client Data row per RFQ
The system SHALL write exactly one row to the copied sheet's `Client Data` tab per RFQ, containing `Source`, `Business_Name`, `Contact_Person`, `Cell_Number`, `Telephone_Number`, `Email`, `Sales_Rep`, `Quote_Date_ISO`, `Project_Name`, `Quotation_Reference`, `Client_Notes`, `Currency`, and `VAT_Rate`, with `Cell_Number`, `Telephone_Number`, and `Quotation_Reference` written as strings.

#### Scenario: Client Data reflects the normalized client record
- **GIVEN** a normalized RFQ with a complete `rfq.client` record
- **WHEN** the Client Data row is written
- **THEN** each named field lands in its matching column by header name, and phone/reference fields remain strings rather than being coerced to numbers

### Requirement: Client Data carries computed item-status counts
The system SHALL compute and write `Total_Items`, `Matched_Items`, `Needs_Review_Items`, `Unmatched_Items`, `Custom_Items`, and `Pricing_Inputs_Required` on the same `Client Data` row, derived from the RFQ's classified product lines.

#### Scenario: Counts reflect the RFQ's actual match outcomes
- **GIVEN** an RFQ with 5 products classified as 2 `Matched`, 1 `Needs Review`, 1 `Unmatched`, and 1 `Custom`
- **WHEN** the Client Data row is written
- **THEN** `Total_Items = 5`, `Matched_Items = 2`, `Needs_Review_Items = 1`, `Unmatched_Items = 1`, and `Custom_Items = 1`

### Requirement: One Quote Items row per product, written in the incoming-request and match-evidence columns only
The system SHALL write one row per product to `Quote Items` (starting at row 2, one row per line, up to the existing 100-line maximum), populating only `Line_No`, `Incoming_Product_Description`, `Incoming_Product_Type`, `Incoming_Product_Category`, `Incoming_Product_Name`, `Quantity`, `Material_Description`, `Match_Status`, `Match_Confidence`, `Product_ID`, `Category`, `Subcategory`, `Series_Name`, `Product_Number`, `Catalogue_Product_Name`, `Search_Name`, `Catalogue_Description`, `Material_Type`, `Supplier_Name`, `Catalogue_Page`, `Match_Reason`, `Candidate_1` through `Candidate_5`, `Needs_Review`, `Pricing_Input_Required`, and `Warnings`.

#### Scenario: Multi-product RFQ produces one row per product in order
- **GIVEN** a normalized RFQ with 3 products
- **WHEN** the Quote Items rows are written
- **THEN** rows 2, 3, and 4 are written in submitted order, each with `Line_No` set to its 1-based position

#### Scenario: original_item_text is preserved via Incoming_Product_Description
- **GIVEN** a product with a non-empty `original_item_text`
- **WHEN** its row is written
- **THEN** `Incoming_Product_Description` carries `original_item_text` (falling back to `description` only when `original_item_text` is empty)

#### Scenario: Matched row carries full catalogue identity
- **GIVEN** a product classified `Matched` against a single catalogue row
- **WHEN** its row is written
- **THEN** `Product_ID`, `Category`, `Subcategory`, `Series_Name`, `Product_Number`, `Catalogue_Product_Name`, `Search_Name`, `Catalogue_Description`, `Material_Type`, `Supplier_Name`, and `Catalogue_Page` are populated from that catalogue row

#### Scenario: Needs Review row carries candidates but no final identity
- **GIVEN** a product classified `Needs Review` with more than 5 plausible candidates
- **WHEN** its row is written
- **THEN** `Product_ID` and the other catalogue-identity columns are left blank, and `Candidate_1` through `Candidate_5` contain exactly the first 5 candidates

#### Scenario: Unmatched or Custom row still reaches the sheet
- **GIVEN** a product classified `Unmatched` or `Custom`
- **WHEN** its row is written
- **THEN** the incoming-request columns are fully populated and the catalogue-identity columns are left blank, so the line is priceable manually from the original request alone

### Requirement: Pricing-input and formula columns are never written by N8N
The system SHALL NOT write to `Quote Items` columns `Buying_Price_Excl_VAT`, `Addons_Cost_Per_Unit_Excl_VAT`, `Discount %`, `Markup %`, `Transport_Amount`, or `Transport_Basis` (Leandre's manual pricing inputs), and SHALL NOT write to any column from `Processing_Status` onward (the template's formula-controlled columns), on any row, for any match outcome.

#### Scenario: Even a Matched row has no price written
- **GIVEN** a product classified `Matched`
- **WHEN** its row is written
- **THEN** `Buying_Price_Excl_VAT` and the other pricing-input columns remain empty, and no value or blank is sent to any formula-controlled column

### Requirement: Writes resolve destination columns by header name
The system SHALL resolve every destination column on `Client Data` and `Quote Items` by matching the sheet's actual header row, not by a fixed column-letter assumption, and SHALL write only within rows 2-101 on `Quote Items`.

#### Scenario: A reordered column still receives the correct value
- **GIVEN** a column on `Quote Items` has been moved to a different position since the mapping was built
- **WHEN** a row is written
- **THEN** each field is written to the column carrying its matching header text, not to a shifted column position
