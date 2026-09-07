## Context

See `proposal.md` - Why. Two independent surfaces are touched: the Crout Automations custom-form renderer/builder (Angular, `crout-automations`) and one n8n code node (`Normalize and validate RFQ`) in the Globefurn `Quote System` workflow (`jhCyit5q0xE37ErN`). They share no runtime dependency on each other; they're grouped in one change because both were found while testing the same Globefurn RFQ submission flow end to end.

Constraints carried over from the source PRD (`docs/prd/custom-form-rfq-fixes/custom-form-rfq-fixes.md`):
- The n8n fix must stay compatible with `Check Duplicate Submission` and `Record Submission`, built under the separate, in-progress `globefurn-rfq-quote-builder` change, which key on `rfq.submission_id` as a plain string.
- `openspec/specs/` has no existing capabilities yet (greenfield spec repo) - all three capabilities in this change are new, not deltas.

## Goals / Non-Goals

**Goals:**
- Resolve the two PRD open questions that would otherwise leave the spec's behavior ambiguous (identifier derivation semantics; hint text scope) with a concrete decision, not a deferred one.V
- Keep the n8n fix a same-node, same-shape change: no new node, no new Data Table column, no change to what `Check Duplicate Submission`/`Record Submission` read.

**Non-Goals:**
- Redesigning the idempotency mechanism itself (Data Table schema, matching logic) - out of scope per proposal.md Impact.
- Time-windowing the synthetic identifier - considered and rejected below, not deferred.

## Decisions

**Phone regex source**: reuse `FormValidatorService.saPhone()`'s exact pattern (`^(\+27|0)[6-8][0-9]{8}$` after stripping spaces/hyphens/parentheses) as the default for a `formatter: 'phone'` field with no builder-authored `validation.regex`, rather than introducing a second, slightly different SA-phone pattern. *Alternative considered*: writing a new pattern tailored to the form renderer - rejected, since the app already has one canonical definition of "valid SA phone" and a second one would drift from it over time.

**No time-bucketing for the synthetic submission identifier (resolves PRD §10 open question 1)**: the identifier is a pure content hash with no time component - identical `client`+`products` content always derives the same identifier, full stop, matching the spec's `custom-form-rfq-intake-normalization` requirement as written ("identical content always derives the same identifier"). *Alternative considered*: bucketing the hash by a coarse time window (e.g. per hour) so an intentional identical resubmission after the window succeeds - rejected for this change because it adds a tunable parameter with no clear correct default, it would weaken the spec's scenario from an unconditional guarantee to a time-dependent one, and the risk it guards against (a client deliberately resubmitting byte-identical content) is speculative next to the risk it's meant to fix (a network-retry double-POST creating a duplicate Drive folder). If real-world use shows genuine duplicate re-submissions being wrongly blocked, that's a follow-up spec change with actual evidence to size the window against, not a guess made now.

**Hash construction**: derive the synthetic identifier from `client.email`, `client.business_name`, `client.quote_ref` (or `project_name` when `quote_ref` is blank), and the serialized `products` array, run through the same FNV-1a `stableHash` helper the node already uses for its email-path fallback identifier, prefixed `'form-'` (the email path already prefixes nothing but produces `email-`-prefixed IDs via its own fallback string - the two prefixes must differ so a form-derived and an email-derived ID can never collide even on pathological input).

**Hint text applies to list-item fields too (resolves PRD §10 open question 2)**: the new optional hint/description property is added at the same level as `validation`/`placeholder` on both top-level elements and list-item field definitions, since those already carry the same per-field configuration shape and a builder would otherwise get an inconsistent authoring experience (hints everywhere except inside a product list).

**Capability split**: three capabilities (`custom-form-validation`, `custom-form-field-presentation`, `globefurn-rfq-intake-normalization`) rather than one, because they're independently deployable, independently testable, and touch two unrelated systems (Angular SPA vs. n8n workflow) - collapsing them would make a future delta to just one of these three behaviors harder to scope correctly.

## Risks / Trade-offs

- [Risk] Two genuinely distinct submissions with byte-identical client/product content submitted close together are treated as one duplicate. → Mitigation: accepted trade-off per the no-time-bucketing decision above; revisit only with real evidence this happens.
- [Risk] The SA-only phone regex rejects legitimate non-SA numbers if a client ever needs one. → Mitigation: builder-authored `validation.regex` already overrides the default (R2/second requirement in `custom-form-validation`), so a non-SA form can opt out today; broader locale support is explicitly out of scope (PRD §9).
- [Risk] Adding `hint` to the form schema is a additive, backward-compatible interface change (optional field), so existing saved form schemas without it continue to work unchanged - no migration needed.

## Migration Plan

- Frontend changes (`custom-form-validation`, `custom-form-field-presentation`) ship as a normal Angular deploy - no data migration, no feature flag; every fix here corrects behavior that was either silently wrong (phone/list validation) or purely additive (hint field, sticky tabs).
- The n8n node change (`globefurn-rfq-intake-normalization`) is applied directly to the live `Normalize and validate RFQ` code node via `update_workflow`; the workflow is currently inactive (per `globefurn-rfq-quote-builder`'s own notes), so there's no in-flight traffic to migrate. No Data Table schema change, so no backfill.
- Rollback: both surfaces are plain code/config changes with no schema migration, so rollback is a straight revert (Angular deploy rollback; n8n node revert to its prior version via workflow history).

## Open Questions

- [ ] Exact copy for the new phone-format validation error message and any hint placeholder text - a pure content/wording detail with no effect on the spec's behavior contract; left to implementation/review.
