# WordPress Theme Assets

This folder contains components that are **intentionally excluded from the Angular build**.
They will be integrated directly into the WordPress/Elementor theme layer.

## Structure

```
wordpress-theme/
├── nav/
│   ├── nav.component.html   — Header markup
│   ├── nav.component.scss   — Header styles
│   └── nav.component.ts     — Reference only (logic lives in WP theme JS)
└── footer/
    ├── footer.component.html — Footer markup
    ├── footer.component.scss — Footer styles
    └── footer.component.ts   — Reference only (logic lives in WP theme JS)
```

## Notes

- **Do not import these into `app.component.ts`** — they are not part of the Angular Element bundle.
- SCSS tokens (`--color-*`, `--space-*`, `--text-*`) must be loaded globally by the WordPress theme,
  as these components depend on the shared design token stylesheet.
- The `.ts` files are kept for reference (nav links, footer data) but their logic
  should be re-implemented as vanilla JS or a WordPress child theme function.
