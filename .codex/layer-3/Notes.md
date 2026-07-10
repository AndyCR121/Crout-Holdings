# Durable Repository Notes

## Confirmed

- Primary application scope is `crout-automations/` and `crout-automations-api/`.
- Frontend is Angular 20 with standalone components, SCSS, Angular Material and lazy routes.
- API targets .NET 8 and uses controllers, scoped services/repositories, Dapper and MySQL.
- Authentication uses JWT validation plus a `ca_jwt` cookie fallback and token-version revocation checks.
- API secrets are environment/configuration driven; never record their values here.
- SQL files under `crout-automations-api/sql/` are shipped with the API.
- Existing database tooling includes schema update, database management and schema-sync planning.
- Existing integration abstractions include n8n and Paystack.
- Public service pages use a dynamic `services/:slug` route.
- Client, admin and developer areas are child-route portals protected by guards.

## Reuse reminders

- Search existing Angular services, shared components, guards and models first.
- Search existing API services, repositories, helpers and DTOs first.
- Preserve the numbered SQL migration mechanism.
- Use focused validation first; broaden for routing, shared contracts, startup, DI, schema or build changes.

## Unknown / verify per task

- Preferred solution-level .NET build/test command.
- API test project locations.
- CI and Docker validation commands.
- Logging and transaction conventions.
- Exact frontend HTTP/data-access layout.
