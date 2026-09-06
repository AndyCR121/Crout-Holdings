# Repository Guidelines

## Durable Memory

Andrew's Vault `AIOS Memory\` folder (`C:\Users\User\Desktop\Andrew's Vault\AIOS Memory`) is the single authoritative durable-memory location, shared between Claude Code and Codex — a note either agent writes there is available to the other. Do not write AIOS Memory directly; when durable facts arise, delegate curation to the `memory-curator` agent (invoked via the Skill/Agent tool as `memory-curator` in Claude Code, or `C:\Users\User\.codex\agents\memory-curator.md` in Codex) with a concise, evidence-based session summary, not a raw transcript. The memory-curator agent owns durable-memory classification, writes, and Graphify refreshes. Never use the retired `C:\Users\User\Desktop\Crout Automations` vault or store credentials, tokens, passwords, private keys, or other secrets in memory.

## Context Mapping

Use Graphify as the first step when locating relevant files, symbols, or content — in this repository or in Andrew's Vault — before broad `rg`/grep sweeps or speculative file reads. In Claude Code this is the `graphify` skill; in Codex it is the `context_mapper` agent. Query the existing graph with a narrow question first; build or refresh `graphify-out/` only when a graph is missing and the target scope is clear.

## Project Structure & Module Organization

This repository contains several independent deliverables. The primary product is Crout Automations: the Angular client is in `crout-automations/`, and the .NET 8 API is in `crout-automations-api/CroutApi/`. API tests live in `crout-automations-api/CroutApi.Tests/`; ordered database migrations are in `crout-automations-api/sql/`. Production infrastructure is at the root (`docker-compose.prod.yml`, `Caddyfile`, and `README_DEPLOYMENT.md`).

Other self-contained projects include `image-encryptor/` (Python/FastAPI utility with tests), `wordpress-theme/`, `business-card/`, and `legal/`. Keep changes scoped to the relevant project; do not mix generated material in `legal/rendered/` with application work.

## Build, Test, and Development Commands

Run commands from the indicated project directory.

- `cd crout-automations; npm install; npm start` — serve the Angular app locally.
- `cd crout-automations; npm run build` — create a production frontend build.
- `cd crout-automations; npm test` — run Angular Jasmine/Karma tests.
- `dotnet build crout-automations-api/CroutApi/CroutApi.csproj` — compile the API.
- `dotnet test crout-automations-api/CroutApi.Tests/CroutApi.Tests.csproj` — run xUnit tests.
- `cd image-encryptor; python -m pytest` — run Python tests.
- `cd crout-automations-api; dotnet run --project .\CroutApi\CroutApi.csproj -- --apply-migrations --dry-run` — review pending migrations without changing a database.

## Coding Style & Naming Conventions

Follow nearby code. TypeScript uses 2-space indentation, Angular standalone components, `PascalCase` classes, and kebab-case component filenames such as `account-button.component.ts`. C# uses nullable reference types, `PascalCase` public members, `I`-prefixed interfaces, and async methods ending in `Async`. Python uses 4 spaces, snake_case, type hints, and `pytest`-style `test_*` functions. No repository-wide lint command is configured; format edited files consistently with their neighbours.

## Testing Guidelines

Add or update focused tests with behaviour changes. Name C# test files `*Tests.cs`; use descriptive `[Fact]` names. Place Python tests in `image-encryptor/tests/` and name them `test_*.py`. Exercise migrations with `--dry-run` before applying them; never run production migrations as part of routine development.

## Commit & Pull Request Guidelines

Recent history uses short imperative summaries and occasionally Conventional Commit prefixes (for example, `fix(proxy): ...`). Write focused commits such as `fix(api): validate booking platform`. PRs should state the affected project, behaviour change, validation commands run, migration/configuration impact, and screenshots for visible frontend changes. Do not commit `.env` files, credentials, or generated local output.
