using MySqlConnector;

namespace CroutApi.Helpers;

public static class SchemaUpdater
{
    private const string ApplyFlag = "--apply-migrations";
    private const string DryRunFlag = "--dry-run";
    private const string AllowProductionFlag = "--allow-production";
    private const string SqlRootArgument = "--sql-root";
    private const string ConnectionArgument = "--connection";
    private const string AllowProductionEnvironmentVariable = "SCHEMA_UPDATER_ALLOW_PRODUCTION";
    private const string HistoryTableName = "SchemaMigrations";

    public static async Task<int?> TryRunAsync(string[] args, CancellationToken cancellationToken = default)
    {
        if (!args.Contains(ApplyFlag, StringComparer.OrdinalIgnoreCase))
        {
            return null;
        }

        try
        {
            var dryRun = args.Contains(DryRunFlag, StringComparer.OrdinalIgnoreCase);
            var sqlRoot = ResolveSqlRoot(ReadArgument(args, SqlRootArgument));
            var connectionString = ReadArgument(args, ConnectionArgument) ?? DbHelper.BuildConnectionStringFromEnvironment();
            var environmentName = ResolveEnvironmentName();

            var target = DescribeTarget(connectionString, environmentName);
            EnsureProductionIsAllowed(args, environmentName, target);

            Console.WriteLine($"SQL folder: {sqlRoot}");
            Console.WriteLine($"Database target: {target}");
            Console.WriteLine($"Mode: {(dryRun ? "dry-run" : "apply")}");

            await using var connection = new MySqlConnection(connectionString);
            try
            {
                await connection.OpenAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Target database is unreachable: {ex.Message}", ex);
            }

            var allScripts = await LoadMigrationScriptsAsync(sqlRoot, cancellationToken);
            var ignoredScripts = allScripts.Where(script => !script.IsExecutableMigration).ToList();
            var executableScripts = allScripts.Where(script => script.IsExecutableMigration).ToList();

            if (ignoredScripts.Count > 0)
            {
                Console.WriteLine($"Ignored scripts: {string.Join(", ", ignoredScripts.Select(script => script.Name))}");
            }

            var historyTableExists = await HistoryTableExistsAsync(connection, cancellationToken);
            var previouslyApplied = historyTableExists
                ? await LoadAppliedMigrationsAsync(connection, cancellationToken)
                : [];

            var previouslyAppliedSet = previouslyApplied.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var pendingScripts = executableScripts
                .Where(script => !previouslyAppliedSet.Contains(script.Name))
                .ToList();

            PrintScriptList("Already applied", previouslyApplied);
            PrintScriptList("Pending scripts", pendingScripts.Select(script => script.Name).ToList());

            if (dryRun)
            {
                Console.WriteLine(
                    $"Dry run complete. {pendingScripts.Count} pending script(s), {previouslyApplied.Count} previously applied.");
                return 0;
            }

            if (!historyTableExists)
            {
                await EnsureHistoryTableAsync(connection, cancellationToken);
            }

            var appliedThisRun = new List<string>();
            foreach (var script in pendingScripts)
            {
                Console.WriteLine($"Applying: {script.Name}");
                await ExecuteMigrationAsync(connection, script, cancellationToken);
                appliedThisRun.Add(script.Name);
            }

            PrintScriptList("Applied this run", appliedThisRun);
            Console.WriteLine(
                $"Migration run complete. Applied {appliedThisRun.Count} script(s); {previouslyApplied.Count + appliedThisRun.Count} total recorded.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Migration failed: {ex.Message}");
            return 1;
        }
    }

    private static void EnsureProductionIsAllowed(string[] args, string environmentName, string target)
    {
        var allowProduction =
            args.Contains(AllowProductionFlag, StringComparer.OrdinalIgnoreCase) ||
            string.Equals(
                Environment.GetEnvironmentVariable(AllowProductionEnvironmentVariable),
                "true",
                StringComparison.OrdinalIgnoreCase);

        if (string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase) && !allowProduction)
        {
            throw new InvalidOperationException(
                $"Production execution is blocked for {target}. Re-run with {AllowProductionFlag} or set {AllowProductionEnvironmentVariable}=true.");
        }
    }

    private static async Task<List<MigrationScript>> LoadMigrationScriptsAsync(
        string sqlRoot,
        CancellationToken cancellationToken)
    {
        var scripts = new List<MigrationScript>();

        foreach (var path in Directory.GetFiles(sqlRoot, "*.sql", SearchOption.TopDirectoryOnly))
        {
            var file = new FileInfo(path);
            if (string.IsNullOrWhiteSpace(file.Name) || !char.IsDigit(file.Name[0]))
            {
                continue;
            }

            var sql = await File.ReadAllTextAsync(file.FullName, cancellationToken);
            scripts.Add(new MigrationScript(file, sql, IsExecutableMigration(file.Name, sql)));
        }

        return scripts
            .OrderBy(script => GetLeadingNumber(script.Name))
            .ThenBy(script => script.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static bool IsExecutableMigration(string fileName, string sql)
    {
        if (fileName.Contains("schema_only", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (sql.Contains("GENERATES migration SQL for review", StringComparison.OrdinalIgnoreCase) ||
            sql.Contains("Schema Sync Generator", StringComparison.OrdinalIgnoreCase) ||
            sql.Contains("__schema_sync_output", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    private static async Task ExecuteMigrationAsync(
        MySqlConnection connection,
        MigrationScript script,
        CancellationToken cancellationToken)
    {
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var statement in SplitStatements(script.Sql))
            {
                await using var command = new MySqlCommand(statement, connection, transaction);
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            await using var insertCommand = new MySqlCommand(
                $"INSERT INTO {HistoryTableName} (migration_name) VALUES (@migrationName)",
                connection,
                transaction);
            insertCommand.Parameters.AddWithValue("@migrationName", script.Name);
            await insertCommand.ExecuteNonQueryAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw new InvalidOperationException($"Failed while applying {script.Name}: {ex.Message}", ex);
        }
    }

    private static async Task<bool> HistoryTableExistsAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = @tableName
            """;

        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@tableName", HistoryTableName);
        var result = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        return result > 0;
    }

    private static async Task EnsureHistoryTableAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var sql = $"""
            CREATE TABLE IF NOT EXISTS {HistoryTableName} (
              id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
              migration_name VARCHAR(255) NOT NULL,
              applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY ux_schema_migrations_name (migration_name)
            )
            """;
        await using var command = new MySqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<List<string>> LoadAppliedMigrationsAsync(
        MySqlConnection connection,
        CancellationToken cancellationToken)
    {
        var results = new List<string>();
        await using var command = new MySqlCommand(
            $"SELECT migration_name FROM {HistoryTableName} ORDER BY id",
            connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(reader.GetString(0));
        }

        return results;
    }

    private static string ResolveSqlRoot(string? sqlRootOverride)
    {
        if (!string.IsNullOrWhiteSpace(sqlRootOverride))
        {
            var overridePath = Path.GetFullPath(sqlRootOverride);
            if (!Directory.Exists(overridePath))
            {
                throw new InvalidOperationException($"SQL root was not found: {overridePath}");
            }

            return overridePath;
        }

        var baseDirectory = new DirectoryInfo(AppContext.BaseDirectory);
        foreach (var directory in EnumerateSelfAndAncestors(baseDirectory))
        {
            foreach (var candidate in EnumerateSqlCandidates(directory))
            {
                if (Directory.Exists(candidate) &&
                    Directory.GetFiles(candidate, "*.sql", SearchOption.TopDirectoryOnly).Length > 0)
                {
                    return candidate;
                }
            }
        }

        throw new InvalidOperationException(
            $"SQL root could not be resolved from {AppContext.BaseDirectory}. Use {SqlRootArgument} to specify it.");
    }

    private static IEnumerable<string> EnumerateSqlCandidates(DirectoryInfo directory)
    {
        yield return Path.Combine(directory.FullName, "sql");

        if (directory.Parent is not null)
        {
            yield return Path.Combine(directory.Parent.FullName, "sql");
        }
    }

    private static IEnumerable<DirectoryInfo> EnumerateSelfAndAncestors(DirectoryInfo start)
    {
        for (var current = start; current is not null; current = current.Parent)
        {
            yield return current;
        }
    }

    private static string DescribeTarget(string connectionString, string environmentName)
    {
        var builder = new MySqlConnectionStringBuilder(connectionString);
        var host = builder.Server;
        var port = builder.Port;
        var database = builder.Database;

        return $"{environmentName} [{host}:{port}/{database}]";
    }

    private static string ResolveEnvironmentName() =>
        Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ??
        Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ??
        "Production";

    private static int GetLeadingNumber(string fileName)
    {
        var prefix = new string(fileName.TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(prefix, out var number) ? number : int.MaxValue;
    }

    private static string? ReadArgument(string[] args, string name)
    {
        for (var index = 0; index < args.Length; index++)
        {
            var current = args[index];
            if (current.Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                if (index + 1 >= args.Length)
                {
                    throw new InvalidOperationException($"Argument {name} requires a value.");
                }

                return args[index + 1];
            }

            var prefix = $"{name}=";
            if (current.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return current[prefix.Length..];
            }
        }

        return null;
    }

    private static void PrintScriptList(string title, IReadOnlyCollection<string> scripts)
    {
        if (scripts.Count == 0)
        {
            Console.WriteLine($"{title}: none");
            return;
        }

        Console.WriteLine($"{title}: {string.Join(", ", scripts)}");
    }

    private static IEnumerable<string> SplitStatements(string sql) =>
        sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(statement => !string.IsNullOrWhiteSpace(statement));

    private sealed record MigrationScript(FileInfo File, string Sql, bool IsExecutableMigration)
    {
        public string Name => File.Name;
    }
}
