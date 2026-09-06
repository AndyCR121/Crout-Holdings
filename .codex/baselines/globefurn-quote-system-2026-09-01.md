# Globefurn Quote System baseline — 2026-09-01

## Verified rollback point

- Workflow: `Globefurn | Quote System` (`jhCyit5q0xE37ErN`)
- Verified N8N version: `backup` (`200a212c-d419-4b33-9762-e48d5da20c5e`)
- The backup retains the original 19 functional nodes and connections.  It adds only a disconnected, non-executing sticky note documenting the backup.
- The preceding original version remains in N8N history as `7b55628f-9b3f-4eef-b5fd-f7af2ca418cb`.
- Workflow state at inspection: inactive, with no published active version and one POST webhook trigger.

## Existing execution paths

### Website path

`Webhook` -> `Get row(s) in sheet` -> `Return list as one` -> `Filter on Series` -> `If` -> `Filter on Product Name` -> `If1` -> `Filter on Material Type` -> `Create folder` -> `Copy file`

The webhook passes its native request body downstream.  The three code nodes progressively narrow catalogue rows by series, product name, and material.  A single result routes to Drive creation; custom and flagged product types can bypass the matching gates.

### Email path

`On Email Received` -> `AI Agent` -> shared catalogue/filter path -> `Create folder` -> `Copy file`

The agent uses a structured output parser and an existing chat model.  It extracts the legacy quote body and product fields, then shares the same lookup and matching chain as the website path.

## Existing integrations (references only)

- Google Sheets: a quick-lookup tab in the existing working catalogue workbook.
- Google Drive: a configured RFQ destination folder and a working `.xlsx` quote template copied into a newly created RFQ folder.
- IMAP email trigger and an OpenAI chat-model subnode serve the email path.

No credentials, client data, Drive URLs, or Sheet URLs are recorded here.

## Protected baseline behaviour

- Email and website intake both reach the same matching and quote-copy flow.
- Folder naming uses business/contact plus quote/project reference, with a timestamp fallback.
- Existing custom and flagged classification bypasses the current catalogue-finality gates.
- The current template copy is the final action; it does not populate quote rows.

## Required extension points

1. Insert shared normalisation and schema validation before any Sheets or Drive action.
2. Add idempotency checking before folder creation.
3. Replace the main-catalogue quick lookup with a separate read-only approved-price lookup source.
4. Replace the three narrow matching nodes with the approved ordered, evidence-preserving matching contract.
5. Add template-copy data mapping by destination headers after a native Google Sheets template is available.

## Pre-existing validation warnings

N8N reported existing warnings for the AI Agent prompt/system-message setup, a sticky-note colour field, and the chat-model `builtInTools` field.  They predate this work and must not be changed unless an approved requirement makes it necessary.
