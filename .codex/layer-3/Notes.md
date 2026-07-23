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

## Catalogue availability

- Public catalogue reads flow through `ServicesController` -> `IServiceCatalogService` -> `IServiceRepository`; admin catalogue management reads `AdminController` directly through `IServiceRepository` and `IPackageRepository`.
- Services and packages use an `Active` availability column; public reads filter it while admin management reads remain unfiltered.
- New user-service creation must validate the selected service, package, and every package-linked service are active server-side.

## n8n lifecycle

- Provisioning is deferred until the developer confirms Step 2 integrations or publishes the service; creation must not require a matching n8n template.
- Publishing and restarting an integration must pass the same workflow-tag, managed-note, confirmed Trigger/Action/Output, and credential-readiness checks.
- Developer Step 2 notes are stored under `config.notes` by role and rendered into the managed `CROUT_SERVICE_NOTES` n8n node.
- All workflow-mutating lifecycle operations share one advisory lock per user service to avoid concurrent n8n updates and activation changes.

## Unknown / verify per task

- Preferred solution-level .NET build/test command.
- API test project locations.
- CI and Docker validation commands.
- Logging and transaction conventions.
- Exact frontend HTTP/data-access layout.
