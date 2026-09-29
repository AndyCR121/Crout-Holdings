# PRD: Niche-Focused Site Redesign (Retailing, Logistics, etc.)

| | |
|---|---|
| **System / component** | Crout Automations portal (`crout-automations`) — homepage (`src/app/pages/home/`) and navbar/routing (`src/app/app.routes.ts`, navbar component under `src/app/components/`) |
| **Status** | Backlog |
| **Author** | Andrew (AndyCR121) |
| **Date** | 2026-09-23 |
| **Related OpenSpec change** | none yet |

## 1. Summary

A future rework of the site's overall design and framing, moving from a general "we do automation" positioning to one organized around focused business niches/professions (e.g. Retailing, Logistics) — while still keeping the existing catalog of base services available as separate, standalone orders rather than folding everything into niche-specific bundles. This is explicitly a **backlog** item: the requester has flagged it as planned future work, not something to scope for near-term implementation, and several details of the intended flow are not yet defined (see §10).

## 2. Problem / opportunity

No specific evidence (tickets, metrics, user reports) was supplied for this item — it was described directly by the requester as a planned strategic direction rather than a reaction to an observed problem. The stated intent is that the current homepage's general, service-catalog-first framing doesn't speak to a prospective customer's specific industry the way a niche-focused presentation would, and that the site's navigation should grow a dedicated surface for this framing.

## 3. Goals

- Redesign the homepage's overall design and feel to speak to focused business niches/professions (e.g. Retailing, Logistics) rather than presenting as a generic automation catalog.
- Keep the existing base/foundational services available as separate, individually orderable items, even as the homepage's framing shifts toward niches — i.e. niche framing is presentation, not a forced re-bundling of every existing offering.
- Add a new page reachable from the navbar's "Services" dropdown related to this niche framing (see §10 — the specific purpose of this page was not fully described and is an open question, not an assumption made here).

## 4. Non-goals

- Any concrete visual redesign of the homepage right now — this PRD records the direction, it does not specify layouts, copy, or component changes; that's a follow-up PRD once the open questions below are resolved.
- The near-term visual/pricing fixes already tracked separately in `crout-automations-pricing-cards-rework` — that work should proceed on its own timeline and is not blocked by this backlog item, though its outcome (e.g. any new card system) may end up informing this redesign later.
- Changing how existing base services are priced or configured — this PRD is about presentation and navigation, not the pricing model itself.
- Restructuring the underlying services/packages data model — unless a future refinement of this PRD determines that's required to support niche-specific presentation.

## 5. User story

> As a prospective customer researching automation for my specific industry (e.g. retail or logistics),
> I want the site to speak to my industry's context rather than a generic list of automation services,
> So that I can quickly recognize this is relevant to my business before digging into the full service catalog.

> As a returning or industry-agnostic customer who wants a specific base service regardless of niche framing,
> I want to still be able to find and order that service directly,
> So that the niche-focused redesign doesn't bury or remove the straightforward option I already rely on.

<!-- A third persona/flow for the new navbar "Services" page is not written here because its purpose was not fully specified by the requester — see §10. Add it once that's resolved. -->

## 6. Requirements

Written at a directional, backlog-appropriate grain rather than fully specified — expect this PRD to be revisited and tightened (additional Given/When/Then scenarios, concrete UX) before it's ready to hand to OpenSpec proposal authoring.

### R1. Homepage reflects niche-focused framing

The system SHALL present the homepage with a design and content structure organized around specific business niches/professions (e.g. Retailing, Logistics), rather than the current general automation-service framing.

**Scenario: Visitor lands on the redesigned homepage**
- GIVEN the niche-focused redesign is live
- WHEN a visitor lands on the homepage
- THEN they see framing organized around specific business niches, not a flat generic service list, as the primary presentation

### R2. Base services remain independently orderable

The system SHALL continue to let a customer view and order any existing base service on its own, independent of any niche framing, so the redesign does not remove or hide the direct-order path that exists today.

**Scenario: Customer orders a base service directly**
- GIVEN the niche-focused homepage redesign is live
- WHEN a customer wants a specific base service without going through niche-specific framing
- THEN they can still find and order it as a standalone item, the same way they can today

### R3. A new navbar Services page is added

The system SHALL add a new page reachable from the navbar's "Services" dropdown, related to the niche-focused framing introduced by R1.

**Assumption:** this requirement is deliberately left without a Given/When/Then scenario and without a stated purpose beyond "related to the niche framing," because the requester's description of what this page should give users was not completed in the original request (it was cut off mid-sentence). Do not implement or design against this requirement as written — resolve §10 first.

### Non-functional requirements

- **Performance**: not yet assessed — depends on the eventual design.
- **Security / access**: none anticipated; a public marketing/navigation change.
- **Data / audit**: not yet assessed.
- **Compatibility**: R2 is the compatibility constraint that most matters here — whatever the redesign becomes, it must not regress direct base-service ordering.

## 7. UX flow & wireframe

No wireframe is included. This PRD is intentionally at the vision/backlog stage — niche categories, homepage layout, and the new navbar page's actual purpose are all still undefined (see §10) — sketching a flow now would invent structure the requester hasn't specified yet. A wireframe should be produced once those questions are answered and this PRD is picked up for active scoping.

## 8. References

| Source | What it contributed |
|---|---|
| Requester's description (this request) | The sole source for this PRD — a prose description of the intended direction, with no screenshots, docs, or links supplied. The description of the new navbar "Services" page was cut off mid-sentence in the original request (see §10) |

## 9. Out of scope

- Any specific niche's content, copy, or category list (e.g. which niches beyond Retailing/Logistics are included) — not specified yet.
- Redesigning the services/packages pricing engine itself.
- The near-term card/pricing fixes tracked in `crout-automations-pricing-cards-rework`.

## 10. Open questions

- [ ] The request describing the new navbar "Services" page was cut off before saying what it should give users — what is this page meant to do? (Original text ends: *"We'll add a new page under the Services dropdown (navbar) to give users..."*) This blocks R3 entirely until answered.
- [ ] Which specific business niches/professions are in scope beyond the two examples given (Retailing, Logistics)? Is there a target list, or is this meant to grow over time?
- [ ] Does "keeping some of the base services as separate orders" mean *all* current base services stay directly orderable, or only some of them — and if only some, which?
- [ ] Is this redesign meant to replace the current homepage entirely, or coexist with it (e.g. niche landing pages feeding into the existing homepage/services flow)?
- [ ] What's the rough timeframe/trigger for picking this up — is it tied to a specific business milestone, or purely "whenever the near-term work is done"?

## 11. Rollout / risks

Too early to assess — no design, scope boundary, or timeline has been set. The main near-term risk is scope ambiguity: R3 in particular should not be started until its purpose is clarified, and the niche list/coverage should be confirmed before any homepage content work begins, to avoid building toward an incomplete picture of the intended direction.

---
*This PRD is a review artifact, not an implementation plan. Given its Backlog status and open questions, it is not yet ready to hand to OpenSpec proposal authoring (`opsx` / `openspec-propose`) — that step should wait until §10 is resolved and this PRD is picked up for active scoping.*
