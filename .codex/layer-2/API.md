# API Map — `crout-automations-api/CroutApi`

## Confirmed runtime and dependencies
- .NET target: `net8.0`.
- Packages: Dapper, MySqlConnector, JWT bearer authentication, Microsoft identity token libraries.
- Composition root: `Program.cs`.

## Registered application areas
### Helpers / cross-cutting
- `DbHelper`
- `JwtHelper`
- `EncryptionHelper`

### Repository registrations
- users, companies, services, user services, service requests, contact requests, packages, addons, service features, service triggers, video projects, dev services, dev portal.

### Application-service registrations
- auth, profile, service catalog, service request, service trigger, video project, email, contact request, Paystack proxy.

### Confirmed controller domains
- Auth, Users, Profile, Companies, Services, Service Requests, Service Triggers, Contact, Contact Requests, Dev, Video Projects, Admin, Paystack.

## Configuration and security boundaries
- Required environment variables at startup: `JWT_SECRET`, `HMAC_SECRET`.
- Optional JWT values: `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRY_HOURS`.
- CORS uses `ALLOWED_ORIGINS` with localhost defaults.
- Paystack service has base address `https://api.paystack.co`; its secret is read from `PAYSTACK_SECRET_KEY` or Paystack configuration per source comments.
- Authentication and authorization occur before controller mapping.
- Global exception handler maps `UnauthorizedAccessException` to 403, `KeyNotFoundException` to 404, `ArgumentException` to 400, and otherwise 500.

## Search guide
- Endpoint behavior: controller → service → repository → model/SQL.
- Login/roles: Auth controller/service → JWT helper → `Program.cs` only for claim and validation configuration.
- Admin/client access issue: target controller authorization attributes + related frontend route guard.
- Billing/payment issue: Paystack controller → proxy service → affected frontend billing/admin screen.

## API safety rules
- Do not weaken JWT issuer/audience/lifetime/signing validation, role claims, or CORS credentials behavior without end-to-end evidence and targeted validation.
- Do not log tokens, HMAC/JWT secrets, Paystack keys, or database credentials.
- Confirm database schema/migration ownership before changing repository SQL or model persistence.
