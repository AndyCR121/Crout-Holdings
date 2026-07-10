# Confirmed Architecture

## System shape

```text
Angular 20 SPA
  -> route guards and lazy standalone pages
  -> frontend services / HTTP contracts
  -> ASP.NET Core controllers
  -> application services
  -> repositories / Dapper
  -> MySQL

External systems:
  -> n8n
  -> Paystack
  -> email delivery

Operational data tooling:
  -> numbered SQL files
  -> SchemaUpdater
  -> database management
  -> schema-sync planning
```

## Frontend architecture

### Confirmed

- Standalone Angular application.
- Lazy `loadComponent` route boundaries.
- Child routes organize client, admin and developer portals.
- Guards enforce authentication and roles.
- Dynamic service details use `services/:slug`.
- `pendingChangesGuard` protects the developer form builder.
- Material/CDK are available.
- Production builds use output hashing and environment replacement.

### Rules

- Reuse existing route hierarchy and guard patterns.
- Put role-protected pages under their existing portal boundary.
- Prefer lazy standalone components.
- Preserve query/path parameter conventions already used by the target feature.
- Search for shared components, models and HTTP services before adding new ones.
- Keep UI state and API DTO changes synchronized.
- Avoid broad routing/provider changes for isolated features.

## API architecture

### Confirmed

`Program.cs` registers helpers, scoped repositories, scoped application services, typed/named HTTP clients, controllers, authentication and authorization.

Observed pattern:

```text
Controller -> Service -> Repository -> Dapper/MySQL
```

### Authentication and security

- JWT issuer, audience, signature and lifetime validation are enabled.
- Tokens may come from bearer auth or the `ca_jwt` cookie.
- A `token_version` claim is checked against the current user record.
- CORS origins are environment-configured.
- HMAC-backed encryption/sensitive-data helpers are registered.
- Release-note HTML is sanitized.
- Production exception output is reduced.

### Rules

- Preserve controller/service/repository separation.
- Use existing repository and helper abstractions.
- Match current DI lifetimes.
- Keep async I/O asynchronous.
- Never bypass role authorization.
- Never log or return secrets or raw sensitive credential values.
- Reuse sanitization and sensitive-data protection.
- Validate external-service failures.

## Persistence

### Confirmed

- Dapper and MySqlConnector are used.
- SQL migration files are included in build/publish output.
- Schema update logic runs before normal host startup.
- Database management and schema-sync services exist.

### Rules

- Do not replace the numbered migration system.
- Prefer additive, idempotent, reviewable SQL.
- Protect production data.
- Keep schema comparison separate from approved application.
- Review nullability, defaults, indexes, keys and data-preservation effects.

## External integrations

### n8n

**Confirmed:** `N8nOptions` plus typed `IN8nWorkflowClient` / `N8nWorkflowClient`.

### Paystack

**Confirmed:** a proxy service uses `https://api.paystack.co`; secret configuration is externalized.

## Unknown

- Exact logging framework and conventions.
- Complete test topology.
- Full Docker/CI deployment architecture.
- Exact DTO mapping conventions.
- Transaction patterns for multi-step writes.
