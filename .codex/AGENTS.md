# Crout Holdings — Scoped Codex Operating Rules

## Required reading and execution order
1. Read `.codex/layer-1/Project.md`.
2. Read the Layer 2 map(s) relevant to the task: `Architecture.md` plus `Frontend.md` and/or `API.md`.
3. Read `.codex/layer-3/Notes.md`.
4. Establish an explicit initial search scope from those files and the task.
5. For any non-trivial, unfamiliar, cross-file, feature, or bug-investigation task, use the read-only `context_mapper` subagent with `gpt-5.4-mini` when available. Give it only the initial scope, wait for its report, then implement with `gpt-5.4`.

Skip the mapper only for a trivial, obvious, isolated single-file edit. State why in the final report.

## Scope discipline
- Primary workspaces are `crout-automations/` and `crout-automations-api/CroutApi/`.
- Ignore all other repository areas unless the task provides evidence they are required.
- Do not scan the whole repository by default.
- Start at the relevant route/controller, then trace one layer at a time into component/service/model or controller/service/repository/model.
- Expand scope only when evidence requires it. Before expanding, state the reason and the new boundary.
- Exclude by default: `node_modules/`, `dist/`, `bin/`, `obj/`, coverage output, generated files, lock files, binaries, screenshots, and migrations unless directly relevant.

## Change rules
- Implement with `gpt-5.4`.
- Make the smallest safe change consistent with existing local patterns.
- Avoid broad refactors, unrelated formatting, dependency upgrades, generated-file changes, and configuration rewrites.
- Preserve Angular standalone/lazy-route conventions and ASP.NET controller/service/repository separation where currently used.
- Never expose, log, hard-code, or replace secrets. Treat JWT, HMAC, Paystack, database, and allowed-origin configuration as security-sensitive.
- Do not modify CORS/authentication behavior, payment behavior, or role guards without tracing the full request path and validating the impact.

## Validation
Run or recommend only the narrowest relevant confirmed validation:
- Frontend: from `crout-automations/`, `npm run build`, `npm test`, or `npm run build:elements` when the change concerns web components/elements.
- API: from `crout-automations-api/CroutApi/`, use the smallest applicable `dotnet` build/test command after confirming the solution/project layout and test availability.
- Do not claim validation passed unless it was actually run successfully.

## Final response format
End every task with:
- changed files;
- behavior changed;
- validation run/recommended and result;
- mapper use or explicit skip reason;
- search-scope expansions and why;
- risks/unknowns;
- proposed dated entry for `.codex/layer-3/Notes.md`.
