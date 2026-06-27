# Project Map — Crout Holdings

## Purpose
Crout Holdings contains the Crout Automations public site and portals plus its supporting HTTP API. The active scope for this pack is intentionally limited to the two related applications below.

## Confirmed workspace layout
| Path | Role | Status |
|---|---|---|
| `crout-automations/` | Angular frontend application | Confirmed |
| `crout-automations-api/CroutApi/` | ASP.NET Core web API | Confirmed |
| Other repository folders | Out of scope unless task evidence requires them | User-directed |

## Source-of-truth locations
- Frontend package/tooling: `crout-automations/package.json`
- Frontend build configuration: `crout-automations/angular.json`
- Frontend bootstrap: `crout-automations/src/main.ts`
- Frontend route map: `crout-automations/src/app/app.routes.ts`
- API project: `crout-automations-api/CroutApi/CroutApi.csproj`
- API composition root: `crout-automations-api/CroutApi/Program.cs`
- API controllers: `crout-automations-api/CroutApi/Controllers/`

## Initial boundaries
### Frontend task
Search first, in order:
1. Target path in `src/app/app.routes.ts`
2. Matching route component under `src/app/pages/`
3. Its directly imported services, models, guards, and styles
4. Environment/proxy files only when endpoint/runtime behavior is affected

### API task
Search first, in order:
1. Matching controller under `CroutApi/Controllers/`
2. Its service interface/implementation under `CroutApi/Services/`
3. Its repository interface/implementation under `CroutApi/Repositories/`
4. Directly used models/helpers/configuration
5. `Program.cs` only for cross-cutting registration/auth/CORS/exception behavior

### Cross-stack task
Start with the frontend route/component and the matching API controller. Trace request/response contracts narrowly in both directions.

## Default exclusions
Do not inspect without a task-specific reason:
- all non-`crout-automations` and non-`crout-automations-api` projects;
- `node_modules/`, `dist/`, `bin/`, `obj/`, coverage, caches, binaries;
- lock files unless dependency resolution is the issue;
- generated assets and screenshots;
- migrations unless schema/data access is part of the task.

## Known aliases / conventions
- Angular project name: `crout-automations`.
- Angular component prefix: `ca`.
- Angular source root: `crout-automations/src`.
- API root namespace: `CroutApi`.
