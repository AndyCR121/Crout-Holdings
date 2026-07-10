Read and follow .codex/AGENTS.md first.

# Task

Describe the requested behaviour and why it is needed.

## Required preparation

1. Read `.codex/layer-1/Project.md`, `.codex/layer-2/Architecture.md` and `.codex/layer-3/Notes.md`.
2. Define measurable acceptance criteria.
3. Define a narrow initial search scope.
4. Run `context_mapper` with 5.6 Luna before non-trivial implementation.
5. Wait for mapping and use its recommended smallest scope.
6. Skip mapping only for a trivial isolated edit and state why.

## Implementation requirements

- Implement with 5.6 Terra.
- Preserve the repository's Angular and ASP.NET architecture.
- Reuse existing shared components, services, repositories, helpers, models and abstractions.
- Search for existing implementations before creating new ones.
- Make the smallest safe change.
- Avoid broad scans, unrelated refactors, formatting-only edits, dependency upgrades and duplicate helpers.
- Keep frontend/API contracts synchronized.
- Preserve authentication, authorization, sanitization and sensitive-data handling.
- Do not replace the numbered SQL migration system.
- Do not modify Git state unless explicitly requested.

## Search scope

List exact initial directories/files. Exclude dependencies, generated output, binaries, caches, coverage, unrelated apps, lock files and migrations unless relevant.

Any expansion must record:

- reason
- evidence
- previous boundary
- new boundary

## Acceptance criteria

- [ ] Add task-specific behavioural criteria.
- [ ] Existing architecture and shared code are reused.
- [ ] Focused validation passes.
- [ ] Security and authorization remain correct.
- [ ] Relevant Layer 3 knowledge is updated.

## Validation

```bash
cd crout-automations
npm test -- --watch=false
npm run build
```

```bash
dotnet build crout-automations-api/CroutApi/CroutApi.csproj
dotnet test
```

Broaden validation only when shared libraries, contracts, startup, routing, persistence, schema, DI or build configuration changes.

## Review

Run `code_reviewer` with 5.6 Luna after application-code changes. Resolve valid findings and revalidate. Skip only when no application code changed, agents are unavailable or review is explicitly disabled; state why.

## Layer 3

Update `.codex/layer-3/Notes.md` only with concise, durable, evidence-backed repository knowledge. Do not add secrets or task chatter.

## Final report

### Summary
### Changed files
### Behaviour changes
### Patterns reused
### Validation
### Review findings
### Scope expansions
### Layer 3 updates
### Risks
