# Architecture — Cross-Stack Overview

## Confirmed stack
- Frontend: Angular 20 application, TypeScript ~5.8, RxJS 7.8, SCSS, standalone components.
- Frontend supports both application output and an Angular Elements build.
- API: ASP.NET Core on .NET 8 (`Microsoft.NET.Sdk.Web`).
- Data access: Dapper + MySqlConnector.
- Security: JWT bearer authentication plus HMAC-oriented encryption helper configuration.
- Payments: a named/typed HTTP client points to Paystack.

## Cross-stack boundaries
- The frontend exposes public marketing pages, an authenticated client portal, a developer portal, and admin portal routes.
- API controllers expose corresponding domain areas including auth, users, profile, companies, services, service requests/triggers, contact, dev, video projects, admin, and Paystack.
- Exact endpoint paths and DTO contracts must be read from the target controller and frontend client/service; do not infer them solely from names.

## API request flow
`Controller -> application service -> repository -> Dapper/MySQL`

`Program.cs` registers repositories/services and configures JWT, authorization, CORS, global exception mapping, controllers, and Paystack HTTP access.

## Task-oriented search order
1. Identify user-facing route or HTTP endpoint.
2. Find the concrete component/controller.
3. Trace only its immediate dependencies.
4. Inspect models/contracts used across the boundary.
5. Inspect cross-cutting configuration only when the behavior involves auth, role guard, CORS, errors, payments, or external calls.
