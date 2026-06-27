# Frontend Map — `crout-automations`

## Confirmed tooling
- Angular CLI commands from `package.json`:
  - `npm start` → `ng serve -o`
  - `npm run build` → `ng build`
  - `npm run build:elements` → builds the `elements` configuration
  - `npm test` → `ng test`
- The application build entry is `src/main.ts`.
- Global styles are `src/styles/styles.scss`.
- Development serve uses `proxy.conf.json`.

## Build characteristics
- Standard app output: `dist/crout-automations`.
- The `elements` configuration uses `src/elements/main.ts`, has no index, and outputs without hashing; treat this path as sensitive to web-component/embed behavior.
- Components are configured as standalone with SCSS.

## Confirmed route domains
- Public: home, services, contact, privacy policy, and not-found.
- Public service detail pages: quote system, WhatsApp agent, project management, marketing systems.
- Client portal: dashboard, services, profile, billing, subscriptions, payment methods; protected by `authGuard`.
- Developer portal: dashboard, services, service guide; protected by `authGuard` + `devGuard`.
- Admin portal: users, services, packages, companies, dev management, client services, Paystack management, addons, service features; protected by `authGuard` + `adminGuard`.

## Search guide
- Route/UI issue: `src/app/app.routes.ts` → target `src/app/pages/...` component → direct dependencies/styles.
- Authorization/navigation issue: target route → `src/app/guards/` → authentication/session service(s) referenced by the guard.
- API data issue: target component → frontend client/service → request/response type → matching API controller.
- Elements issue: `src/elements/main.ts` plus target page/component and its embedded dependencies.

## Frontend safety rules
- Preserve standalone/lazy `loadComponent` routing patterns unless the task explicitly changes routing.
- Do not change guard protection, redirects, SEO metadata, or Elements output behavior incidentally.
- Avoid adding component registration to an unrelated bootstrap file without proving it is necessary.
