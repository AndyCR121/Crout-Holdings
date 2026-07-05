# Crout Automations API

## SQL updater

Run pending SQL scripts from the API project with:

```powershell
dotnet run --project .\CroutApi\CroutApi.csproj -- --apply-migrations --dry-run
```

Apply pending scripts with the API's normal database environment variables:

```powershell
dotnet run --project .\CroutApi\CroutApi.csproj -- --apply-migrations
```

Useful options:

- `--dry-run` lists pending scripts without changing the database.
- `--allow-production` is required when `ASPNETCORE_ENVIRONMENT` or `DOTNET_ENVIRONMENT` is `Production`, unless `SCHEMA_UPDATER_ALLOW_PRODUCTION=true` is set.

Behavior:

- The updater always targets the database configured through the API's normal `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` environment variables.
- SQL files are resolved from the API project/output location, not from the shell working directory or a caller-supplied path.
- Scripts run in deterministic version/filename order.
- Successfully applied scripts are recorded in the `SchemaMigrations` table and skipped on later runs.
- Generator/review scripts such as `08_schema_only_local_parity.sql` are ignored by the updater.
