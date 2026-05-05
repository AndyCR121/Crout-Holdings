# Crout Automations — Angular v20

Frontend rebuild of the Crout Automations WordPress/Elementor site using **Angular v20 standalone components** and **Angular Elements** for WordPress drop-in support.

## Stack

- **Angular 20** — standalone components, signals, `@for`/`@if`/`@switch` control flow
- **SCSS** — BEM naming, design token system, fluid `clamp()` type scale
- **Fonts** — Cabinet Grotesk (display) + General Sans (body) via Fontshare
- **Angular Elements** — exports all components as native Web Components

## Brand Tokens

| Token | Value | Usage |
|---|---|---|
| `--color-orange` | `#D4703A` | Primary CTA, accents, icons |
| `--color-blue` | `#4A7BAF` | Secondary accent, services section |
| `--color-navy` | `#2C3E6B` | Dark sections (hero, why-crout, footer) |

## Getting Started

```bash
npm install
npm start
```

## Build for Production (SPA)

```bash
npm run build
# Output: dist/crout-automations/
```

## Build for WordPress (Angular Elements)

```bash
npm run build:elements
# Output: dist/crout-elements/
# Enqueue crout-elements/main.js in your WordPress theme, then use:
# <ca-hero></ca-hero>, <ca-pricing></ca-pricing> etc. in any page/template
```

## Component Structure

```
src/app/
├── components/
│   ├── nav/               # Sticky header, mobile hamburger, scroll state
│   ├── hero/              # Full-screen dark hero, orb BG, trust bar
│   ├── pain-point/        # Two-column problem/solution section
│   ├── services-overview/ # 4-card 2×2 service grid
│   ├── how-it-works/      # 4-step process with connector lines
│   ├── why-crout/         # 6-feature grid on navy background
│   ├── pricing/           # 3-tier pricing cards
│   ├── cta-banner/        # Final CTA section
│   └── footer/            # 4-column footer, dark navy
├── interfaces/            # TypeScript interfaces for all data models
├── pages/
│   └── home/              # Assembles all components in order
styles/
├── _tokens.scss           # All CSS custom properties
├── _base.scss             # Reset + scroll reveal animations
└── styles.scss            # Entry point
src/elements/
└── main.ts                # Angular Elements registry (createCustomElement)
```

## Scroll Reveal Animations

Section entries use CSS `animation-timeline: view()` with a graceful fallback for browsers that don't support scroll-driven animations. Add the `reveal` class to any element and it will fade in as it enters the viewport. Use `stagger-children` on a parent to stagger child animations with 60ms delay increments.

## Selector Prefix

All components use the `ca-` prefix (Crout Automations). Custom Elements registered with the same prefix for drop-in WordPress use.
