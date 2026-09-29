# PRD: Homepage Service & Bundle Card Redesign + Pricing Model Review

| | |
|---|---|
| **System / component** | Crout Automations portal (`crout-automations` — `src/app/components/pricing/` [`pricing.component.html`, `pricing.component.scss`, `pricing.component.ts`], embedded on the homepage via `src/app/pages/home/home.component.html`, and reused on `/services`) |
| **Status** | Draft |
| **Author** | Andrew (AndyCR121) |
| **Date** | 2026-09-23 |
| **Related OpenSpec change** | none yet |

## 1. Summary

The homepage's Service and Bundle (package) cards stretch to fill their full available width on large screens, leaving large dead zones — most visibly in bundle cards, between the add-on list and the price/actions column — instead of scaling gracefully. Separately, and independently of the visual issue, the underlying pricing model needs a review: the requester wants a genuinely high-ticket-price positioning, but as currently configured the base price alone (before any add-ons, before real automation functionality is scoped in) is already high enough that a customer is effectively paying a large sum for very little tangible value. This PRD covers both: a visual rework of the card layout for services and bundles, and a pricing-model audit of base/token/add-on pricing to close that value gap.

## 2. Problem / opportunity

**Layout**: `pricing.component.scss` lays bundle cards out as `.pricing__suite-inner { grid-template-columns: 1fr 280px; }` (line ~433) with no upper bound on the `.pricing__suite`/`.pricing__container` width beyond `var(--content-wide)`. On a large display, the `1fr` left column (add-on list) grows far beyond the width its content actually needs, so the gap between an add-on's label/price and the fixed 280px price/CTA column on the right becomes very large — this is the "massive white space" the requester is describing. Service cards (`.pricing__card`, capped at `max-width: calc(50% - var(--space-6))`, `min-width: 220px`) are less broken but still look sparse and under-designed at wide viewports since they were evidently designed card-by-card rather than as a system that adapts across breakpoints.

**Pricing**: reported directly by the requester — as configured today, a service's displayed monthly price is `baseCost + tokensCost` (`PricingComponent.serviceMonthlyPrice`), with `baseCost` charged before any trigger/action/output add-on (the actual automation logic) is selected. The requester's stated experience is that this base price (their example: ~R5000) is already high relative to what it delivers on its own — i.e. the base tier is priced as if it were the product, when today it's closer to a shell that the real automation value is added on top of. The intent is not to lower prices — the requester explicitly wants a high-ticket-price model — but for the base price itself to be defensible as standalone value, or for the pricing structure to be reworked so it isn't perceived as "paying for nothing."

## 3. Goals

- Redesign the Service and Bundle card layouts (homepage and `/services`) so they read as deliberately designed at every supported viewport width, from mobile up through large/ultra-wide desktop, with no unexplained empty space between an add-on list and its price/actions.
- Audit the current pricing model — base cost, token cost, and add-on pricing, per service and per package — and produce a revised structure where the base price reflects real standalone value, consistent with an intentionally high-ticket-price positioning (not a race to the bottom).
- Keep the existing bundle-discount mechanics (`PACKAGE_DISCOUNT`, `minimumRequiredAddons`-gated discount unlock) legible under the new layout and pricing.

## 4. Non-goals

- Rebuilding the pricing/discount *engine* (package view composition, discount-unlock logic in `PricingComponent`) — this PRD is about the numbers it displays and the layout it renders in, not its computation logic, unless a requirement below explicitly says otherwise.
- The niche-focused homepage redesign tracked separately in `crout-automations-niche-focused-redesign` (backlog) — that's a longer-term IA/positioning change; this PRD is the near-term fix to the existing page.
- Introducing new service/add-on *types* or automation capabilities — this is about how existing services and add-ons are priced and displayed, not new functionality to sell.

## 5. User story

> As a prospective customer viewing the homepage on a large monitor,
> I want the service and bundle cards to look intentionally designed rather than stretched and sparse,
> So that the page reads as a credible, professional offering rather than an unfinished template.

> As Crout Holdings (site operator),
> I want the base price of each service to reflect real standalone value,
> So that a high sticker price doesn't read as "paying for nothing" once the customer sees what's actually included before add-ons.

## 6. Requirements

### R1. Bundle card layout has no unbounded white space at wide viewports

The system SHALL constrain the bundle/package card's content columns (add-on list vs. price/actions) so the gap between them scales proportionally with the card's width rather than growing unbounded as viewport width increases.

**Scenario: Bundle card at a large viewport**
- GIVEN a viewport of 1920px or wider
- WHEN a bundle/package card (`.pricing__suite`) renders
- THEN the space between the rightmost text of an add-on line item and the price/CTA column does not exceed a fixed, designed maximum (rather than the current unbounded `1fr` growth)

### R2. Service cards are visually reworked for large viewports

The system SHALL rework the service card (`.pricing__card`) visual design — spacing, information density, and/or a revised max column count — so cards do not look sparse or under-filled at large viewport widths, while preserving the existing 1–2 cards-per-row behavior on tablet/mobile (`@media (max-width: 1024px)` / `640px` breakpoints).

**Scenario: Service card grid at a large viewport**
- GIVEN a viewport of 1920px or wider
- WHEN the service card grid renders
- THEN the cards present a deliberately designed layout (not simply the existing card stretched or capped mid-way) consistent with the rest of the redesigned pricing section

### R3. Pricing model audit covering base, token, and add-on pricing

The system's pricing configuration SHALL be reviewed, service by service and package by package, against the goal of a high-ticket-price model where the base price alone represents defensible standalone value — covering `baseCost`, `tokensCost`/`totalTokens`, and each add-on's `price`, and where the required pricing components (`requiredPricingComponents`) are re-evaluated alongside them.

**Assumption:** this requirement produces a documented set of *proposed* new pricing figures for business sign-off — it does not itself fix specific new numbers, since target price points are a business decision this PRD cannot responsibly infer (see §10).

**Scenario: Base price stands on its own**
- GIVEN a service's base price as newly configured
- WHEN a prospective customer views that price with zero add-ons selected
- THEN what's included at that price is enough to be recognizable as real value, not a bare shell requiring add-ons to mean anything

### R4. Pricing section copy reflects the revised positioning

The system SHALL revisit the pricing section's framing copy (e.g. the "One service. One price." headline and "Every service starts at R{{ startingPrice }}..." sub-copy in `pricing.component.html`) so it doesn't undercut the new high-ticket-price positioning by leading with the lowest available number.

**Scenario: Headline doesn't undersell the new pricing**
- GIVEN the revised base pricing from R3
- WHEN a visitor reads the pricing section header
- THEN the copy does not anchor the page on the cheapest possible entry point in a way that contradicts the intended high-ticket-price positioning

### Non-functional requirements

- **Performance**: none beyond current baseline — this is a layout/content change, not a new data-fetching path.
- **Security / access**: none — pricing data is already public.
- **Data / audit**: any changed `baseCost`/`tokensCost`/add-on `price` values should be applied as a reviewed, deliberate update (not a silent data edit) — see Rollout/risks.
- **Compatibility**: no change to `serviceMonthlyPrice`/`fullTotal`/`discountedTotal` computation logic unless a requirement above explicitly changes an input to it; the package discount-unlock mechanic (`minimumRequiredAddons`) stays intact.

## 7. UX flow & wireframe

The homepage's pricing section (`ca-pricing`) is the entry point — a visitor scrolls to "Pricing," sees the service card row first, then the bundle/package section below it. Both need to hold up from narrow mobile through ultra-wide desktop without the current wide-screen sparseness. The wireframe below contrasts today's unconstrained bundle layout against a bounded-width alternative, and sketches a denser service card treatment; it does not prescribe exact pixel values or the final pricing figures from R3.

See wireframe: `crout-automations-pricing-cards-rework-wireframe.html`

## 8. References

| Source | What it contributed |
|---|---|
| Requester's description (this request) | Source of both the "massive white space" observation and the "R5000 for essentially nothing" base-pricing concern — no screenshot was supplied, but the layout issue was independently confirmed by reading the component source below |
| `crout-automations/src/app/components/pricing/pricing.component.scss` | Confirmed the unbounded `1fr` left column in `.pricing__suite-inner` (bundle cards) and the `max-width: calc(50% - var(--space-6))` cap on `.pricing__card` (service cards) that together produce the reported layout problem |
| `crout-automations/src/app/components/pricing/pricing.component.html` | Confirmed the card markup structure (service card price/add-ons block; bundle card add-on list vs. price/actions column) and the pricing section's current headline/sub-copy |
| `crout-automations/src/app/components/pricing/pricing.component.ts` | Confirmed the pricing data model in play: `baseCost`, `tokensCost`, `totalTokens`, per-add-on `price`, `PACKAGE_DISCOUNT`, `minimumRequiredAddons`-gated discount unlock |

## 9. Out of scope

- Changing the discount/unlock computation logic itself (only its inputs, per R3).
- The niche-focused homepage redesign (tracked in `crout-automations-niche-focused-redesign`, backlog).
- Any change to the services/add-ons catalog's functional scope — this is pricing and presentation only.

## 10. Open questions

- [ ] What is the target base price range per service (or per service tier), and what minimum standalone scope must be guaranteed at that price so it doesn't read as "paying for nothing"? This is the core business decision R3 depends on and is not inferred here.
- [ ] Should base price vary by service complexity (some services already cost more to build/run than others), or should there be a small number of standard price tiers across the catalog?
- [ ] Does the desired card redesign change the card *count per row* at wide viewports (e.g. 3–4 up instead of capping at 2), or only the internal spacing/proportions within the existing column cap?
- [ ] Should the "starting at R{{x}}" framing be removed entirely from the homepage headline, or just recalculated against the new base prices?

## 11. Rollout / risks

Pricing changes are customer-facing and revenue-affecting: treat the R3 pricing audit's output as a proposal for explicit business sign-off before any `baseCost`/`tokensCost`/add-on `price` value is changed in the live database — this PRD's pricing review should conclude with a reviewed rate card, not a direct data edit. The layout rework (R1/R2) can ship independently and ahead of the pricing changes if useful, since it carries no pricing risk on its own; consider sequencing it first as a lower-risk visible improvement while the pricing audit is worked through.

---
*This PRD is a review artifact, not an implementation plan. Once approved, hand it to OpenSpec proposal authoring (`opsx` / `openspec-propose`) to generate the actual proposal, spec deltas, and tasks — this document does not create or replace those.*
