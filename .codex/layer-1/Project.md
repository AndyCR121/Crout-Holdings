# Project Map

## Status legend

- **Confirmed**: verified from repository files.
- **Likely**: strongly indicated but not fully mapped.
- **Unknown**: requires targeted repository verification.
- **Next Verification**: recommended first lookup.

## Repository boundary

### Confirmed

`Crout-Holdings` is a multi-application repository. The primary active scope for this pack is:

- `crout-automations/`
- `crout-automations-api/`

Other repository content is outside the default boundary.

## Applications

### `crout-automations/`

**Confirmed**

- Angular application named `crout-automations`.
- Angular 20 packages.
- TypeScript 5.8.
- Standalone components are the default schematic style.
- SCSS component styling.
- Angular Material and CDK.
- RxJS 7.8.
- Browser entry: `src/main.ts`.
- Routes: `src/app/app.routes.ts`.
- Build output: `dist/crout-automations`.
- Dev server proxy: `proxy.conf.json`.
- Tests use Karma/Jasmine.
- Primary scripts: `npm start`, `npm run build`, `npm test`.

**Confirmed route areas**

- public home
- public service catalogue and dynamic `services/:slug`
- contact and privacy pages
- authenticated client portal
- authenticated admin portal
- authenticated developer portal
- route guards for auth, admin, developer and pending changes
- lazy-loaded standalone page components

### `crout-automations-api/`

**Confirmed**

- ASP.NET Core Web API.
- Target framework: .NET 8.
- Startup: `CroutApi/Program.cs`.
- Controllers are enabled and mapped.
- Dapper with MySQL via MySqlConnector.
- JWT bearer authentication with cookie-token fallback.
- Repositories and application services registered through DI.
- SQL files from `crout-automations-api/sql/` are copied into build/publish output.
- A command-line schema updater hook executes before normal application startup.
- Health endpoint: `GET /api/health`.
- External integrations include n8n and Paystack.
- HTML sanitization and sensitive-data protection helpers are registered.

## Major domains inferred from registrations/routes

### Confirmed

- authentication and password reset
- users and profiles
- companies
- service catalogue
- client user-services and service requests
- packages, add-ons and service features/triggers
- developer portal and service configuration/forms
- integrations and credential definitions
- video projects
- contact requests and email
- release notes
- SQL updater, database management and schema sync
- n8n workflow integration
- Paystack proxy integration

## Configuration

### Confirmed

API startup reads `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRY_HOURS`, `HMAC_SECRET` and `ALLOWED_ORIGINS`.

Configuration sections include `DatabaseManagement` and `N8n`. Paystack uses an environment variable or application configuration.

Do not record secret values in `.codex`.

## Validation

### Confirmed

```bash
cd crout-automations
npm run build
npm test -- --watch=false
```

```bash
dotnet build crout-automations-api/CroutApi/CroutApi.csproj
```

### Unknown

- Whether a solution file exists and should be the preferred API build entry.
- Exact automated API test projects and commands.
- Current CI workflow commands.
- Docker compose file locations and production deployment validation.

## Next Verification

For a task, inspect only the relevant route/component/controller, related frontend service and API contract, related API controller/service/repository/model, focused tests, and configuration/SQL/integration code only when required.
