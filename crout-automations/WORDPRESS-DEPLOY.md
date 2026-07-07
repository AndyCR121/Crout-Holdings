# Crout Automations - WordPress Deploy Guide

The legacy Angular Elements / WordPress embed workflow has been removed from this project.

## Current deployment model

`crout-automations` now builds and deploys as a standard Angular SPA:

```bash
npm run build
```

Production output is written to:

```text
dist/crout-automations/browser/
```

Use the SPA deployment flow documented in [README.md](C:\Users\User\Documents\GitHub\FinanceManager\Crout-Holdings\crout-automations\README.md).

## What changed

- `build:elements` has been removed from `package.json`
- `src/elements/main.ts` has been removed
- `@angular/elements` is no longer a frontend dependency
- Admin pages now render inside the shared Angular admin shell instead of standalone embedded layouts

## If WordPress still references old bundles

Remove any stale references to:

- `npm run build:elements`
- `crout-elements/*`
- `main.js` custom-element bundles loaded from a WordPress theme
- old `functions.php` enqueue logic that expected Angular Elements output

If a WordPress site still needs to surface this application, it should link to the deployed SPA rather than attempting to mount page-specific Angular Elements bundles.
