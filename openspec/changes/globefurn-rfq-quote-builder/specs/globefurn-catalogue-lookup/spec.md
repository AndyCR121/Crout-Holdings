## Purpose

Gives the Globefurn RFQ workflow a catalogue search source that is isolated from the main catalogue workbook, so matching never reads or risks writing the authoritative catalogue data, and so supplier contact fields are actually populated instead of relying on the main workbook's largely-blank quick-lookup tab.

## ADDED Requirements

### Requirement: Lookup sheet is a distinct file from the main catalogue workbook
The system SHALL maintain the N8N catalogue lookup as a Google Sheet separate from the main catalogue workbook (`Globefurn filled product supplier fixed bro.xlsx` or any successor file serving the same authoritative role).

#### Scenario: Matching never queries the main catalogue workbook
- **WHEN** the RFQ matching capability searches for a catalogue candidate
- **THEN** it reads only the dedicated lookup sheet's document ID, never the main catalogue workbook's document ID

#### Scenario: Building or refreshing the lookup sheet never writes to the main catalogue workbook
- **WHEN** the lookup sheet is built or refreshed from the main catalogue workbook's source data
- **THEN** the main catalogue workbook itself receives no writes — it is read-only throughout the refresh

### Requirement: Lookup sheet is populated from the richer product source, filtered to active products
The system SHALL populate the lookup sheet from the main catalogue workbook's richest available per-product sheet (`01_PRODUCTS_MASTER`), excluding any product row whose `Active` field is not `"Yes"`.

#### Scenario: Inactive products are excluded
- **GIVEN** a product row in `01_PRODUCTS_MASTER` with `Active = "No"`
- **WHEN** the lookup sheet is built
- **THEN** that product does not appear in the lookup sheet

#### Scenario: Active products carry their identity and search fields forward
- **GIVEN** a product row in `01_PRODUCTS_MASTER` with `Active = "Yes"`
- **WHEN** the lookup sheet is built
- **THEN** the lookup sheet contains a row for that product with at least `Product_ID`, `Category`, `Subcategory`, `Series_Name`, `Product_Number`, `Product_Name`, `Search_Name`, a description field, `Material_Type`, `Search_Tags`, and `Catalogue_Page`

### Requirement: Lookup sheet carries real supplier contact data
The system SHALL join each lookup sheet row's `Supplier_Name` against the main catalogue workbook's supplier sheets (`02_SUPPLIERS`, `07_SUPPLIER_CONTACT_LIST`) to populate supplier contact person, email, and telephone fields, rather than leaving them blank.

#### Scenario: A product's supplier contact is resolvable from the lookup sheet alone
- **GIVEN** a lookup sheet row for a product supplied by "Chair Express"
- **WHEN** the matching capability needs the supplier's contact person, email, and telephone for that product
- **THEN** those fields are present on the lookup sheet row itself, without a second lookup against the main catalogue workbook

#### Scenario: An inactive supplier's contact data is not presented as current
- **GIVEN** a supplier row in `02_SUPPLIERS` with `Active = "No"`
- **WHEN** the lookup sheet is built or refreshed
- **THEN** products supplied by that supplier either carry no supplier contact fields or are flagged as having an inactive supplier, rather than presenting stale contact data as current

### Requirement: No pricing data is carried into the lookup sheet
The system SHALL NOT include any price, cost, rate, or price-approval column in the lookup sheet.

#### Scenario: Lookup sheet columns contain no pricing fields
- **WHEN** the lookup sheet's column list is inspected
- **THEN** no column name represents a price, cost, rate, or approval-status value

### Requirement: Lookup sheet is buildable and refreshable through the existing N8N workflow
The system SHALL build and refresh the lookup sheet using N8N's existing Google Sheets/Drive credentials, as an auditable, repeatable process, without requiring manual spreadsheet editing outside N8N.

#### Scenario: A refresh run reflects the latest active-product data
- **GIVEN** `01_PRODUCTS_MASTER` has been updated with a newly active product since the last refresh
- **WHEN** the lookup-sheet refresh process runs again
- **THEN** the lookup sheet includes the newly active product on its next read
