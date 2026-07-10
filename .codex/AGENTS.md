# Crout-Holdings Codex Operating Guide

## Mandatory first step

Read and follow `.codex/AGENTS.md` first.

Before changing anything, read:

1. `.codex/layer-1/Project.md`
2. `.codex/layer-2/Architecture.md`
3. `.codex/layer-3/Notes.md`

Treat confirmed facts as authoritative only within the evidence recorded there. Treat likely or unknown items as hypotheses requiring verification.

## Repository focus

The primary working boundary is:

- `crout-automations/`
- `crout-automations-api/`

Do not scan or modify other repository areas unless the task directly names them or evidence from the primary boundary proves expansion is necessary.

Exclude by default:

- `.git/`
- `.codex/`
- `node_modules/`
- `dist/`, `build/`, `bin/`, `obj/`
- coverage, caches and generated output
- lock files unless dependency resolution is relevant
- SQL migrations unless persistence/schema work is relevant
- unrelated applications or legacy deployment assets

## Required workflow

For every task:

1. Define explicit acceptance criteria.
2. Define the narrow initial search scope.
3. Run `context_mapper` before non-trivial work and wait for its mapping.
4. Skip mapping only for a trivial isolated edit; state why.
5. Implement with the Main Implementer model, **5.6 Terra**.
6. Reuse existing helpers, services, repositories, components, guards, models, abstractions and established architecture.
7. Make the smallest safe change.
8. Run focused validation.
9. Run `code_reviewer` using **5.6 Luna**.
10. Resolve valid findings.
11. Re-run affected validation.
12. Update `.codex/layer-3/Notes.md` with concise, durable, evidence-backed knowledge.
13. Return the required final report.

Agent depth is 1. Subagents must not create additional agents.

## Search discipline

Start with only high-value sources relevant to the task:

- root tree for the two primary applications
- manifests and workspace configuration
- startup/entry files
- Angular routes, guards and app configuration
- ASP.NET controllers and DI registration
- relevant services, repositories, models and helpers
- configuration and environment handling
- persistence and SQL only when relevant
- focused tests
- Docker/CI only when deployment or validation is relevant
- existing architecture documentation

Search for an existing shared implementation before creating anything new.

Avoid broad repository scans, unrelated refactors, formatting-only edits, unnecessary dependency upgrades, duplicate helpers and speculative architecture changes.

Expand search scope only when evidence requires it. Record the reason, evidence, previous boundary and new boundary.

## Implementation rules

- Preserve Angular standalone and lazy-loaded route patterns.
- Preserve ASP.NET controller/service/repository separation where present.
- Keep authentication, authorization and environment-secret handling consistent with existing patterns.
- Do not expose secrets, connection strings, tokens or credentials.
- Do not silently weaken guards, role checks, sanitization, validation or production error handling.
- Prefer targeted changes over rewrites.
- Do not replace the numbered SQL migration system.
- Schema and persistence work must protect production data and remain reviewable.
- Keep frontend/API contracts synchronized when either side changes.
- Do not modify Git state unless the user explicitly asks.

## Validation policy

Prefer targeted validation.

Frontend, subject to repository verification:

```bash
cd crout-automations
npm test -- --watch=false
npm run build
```

API, subject to repository verification:

```bash
dotnet build crout-automations-api/CroutApi/CroutApi.csproj
dotnet test
```

Broaden validation only when changing shared libraries, contracts, startup, routing, persistence, schema, DI or build configuration.

## Review policy

Run `code_reviewer` after application-code changes. Review may be skipped only when no application code changed, agents are unavailable, or review is explicitly disabled. State the reason.

## Layer 3 policy

`context_mapper` may write only to `.codex/layer-3/`.

Layer 3 entries must be concise, reusable, evidence-backed, free of secrets and free of temporary task chatter.

## Required final report

### Summary
### Changed files
### Behaviour changes
### Patterns reused
### Validation
### Review findings
### Scope expansions
### Layer 3 updates
### Risks
