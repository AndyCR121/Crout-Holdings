# Crout Holdings Codex Task Template

Read and follow `.codex/AGENTS.md` first.

## Task
[Describe the exact requested behavior/change.] 

## Acceptance criteria
- [Observable result 1]
- [Observable result 2]
- [Regression constraints]

## Constraints
- Implement with `gpt-5.4`.
- Read `.codex/layer-1/Project.md`, then relevant Layer 2 map(s), then `.codex/layer-3/Notes.md` before inspecting code.
- Use the read-only `context_mapper` with `gpt-5.4-mini` when available for every non-trivial, unfamiliar, cross-file, feature, or bug-investigation task. Wait for its report before editing.
- Inspect only the initial scope below. Preserve existing patterns and make the smallest safe change.
- Do not do broad refactors, dependency upgrades, unrelated formatting, generated-file edits, or full-repository scans.
- Justify every scope expansion before performing it.
- Validate narrowly and report actual results only.
- Suggest a concise Layer 3 update at the end.

## Initial search scope
[Example frontend: `crout-automations/src/app/app.routes.ts`, target page/component, direct service/model/guard.]
[Example API: `crout-automations-api/CroutApi/Controllers/<Target>Controller.cs`, direct service/repository/model.]

## Explicit exclusions
[Example: unrelated repo projects, build output, generated assets, migrations unless necessary.]

## Deliverable
[Files to change, UI/API behavior, tests/build validation, documentation note if needed.]
