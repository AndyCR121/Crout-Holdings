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

- `--connection "<connection string>"` overrides the normal `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` pattern.
- `--sql-root "<path>"` overrides auto-discovery of the sibling `sql` folder.
- `--dry-run` lists pending scripts without changing the database.
- `--allow-production` is required when `ASPNETCORE_ENVIRONMENT` or `DOTNET_ENVIRONMENT` is `Production`, unless `SCHEMA_UPDATER_ALLOW_PRODUCTION=true` is set.

Behavior:

- SQL files are resolved relative to the API project/output location, not the shell working directory.
- Scripts run in deterministic version/filename order.
- Successfully applied scripts are recorded in the `SchemaMigrations` table and skipped on later runs.
- Generator/review scripts such as `08_schema_only_local_parity.sql` are ignored by the updater.
