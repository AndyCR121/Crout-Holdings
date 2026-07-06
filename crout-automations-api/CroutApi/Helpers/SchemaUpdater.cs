using System.Diagnostics;
using System.Collections.Concurrent;
using CroutApi.DTOs;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CroutApi.Helpers;

public static class SchemaUpdater
{
    private const string ApplyFlag = "--apply-migrations";
    private const string DryRunFlag = "--dry-run";
    private const string AllowProductionFlag = "--allow-production";
    private const string AllowProductionEnvironmentVariable = "SCHEMA_UPDATER_ALLOW_PRODUCTION";
    private const string HistoryTableName = "SchemaMigrations";
    private static readonly ConcurrentDictionary<string, byte> ActiveTargets = new(StringComparer.OrdinalIgnoreCase);

    public static async Task<int?> TryRunAsync(string[] args, CancellationToken cancellationToken = default)
    {
        if (!args.Contains(ApplyFlag, StringComparer.OrdinalIgnoreCase))
        {
            return null;
        }

        var result = await RunCurrentEnvironmentAsync(
            new SchemaUpdaterExecutionOptions
            {
                DryRun = args.Contains(DryRunFlag, StringComparer.OrdinalIgnoreCase),
                AllowProduction =
                    args.Contains(AllowProductionFlag, StringComparer.OrdinalIgnoreCase) ||
                    string.Equals(
                        Environment.GetEnvironmentVariable(AllowProductionEnvironmentVariable),
                        "true",
                        StringComparison.OrdinalIgnoreCase)
            },
            logger: null,
            cancellationToken);

        PrintConsoleSummary(result);
        return result.Success ? 0 : 1;
    }

    public static async Task<SchemaUpdaterExecutionResult> RunCurrentEnvironmentAsync(
        SchemaUpdaterExecutionOptions options,
        ILogger? logger,
        CancellationToken cancellationToken = default)
    {
        var startedAtUtc = DateTimeOffset.UtcNow;
        var environmentName = ResolveEnvironmentName(options.EnvironmentName);
        var connectionString = options.ConnectionStringOverride ?? DbHelper.BuildConnectionStringFromEnvironment();
        var databaseTarget = options.DatabaseTargetOverride ?? DescribeTarget(connectionString, environmentName);
        var executionKey = BuildExecutionKey(connectionString);

        if (options.UseExecutionLock && !ActiveTargets.TryAdd(executionKey, 0))
        {
            return new SchemaUpdaterExecutionResult
            {
                TargetKey = options.TargetKey ?? string.Empty,
                TargetDisplayName = options.TargetDisplayName ?? string.Empty,
                EnvironmentName = environmentName,
                DatabaseTarget = databaseTarget,
                DryRun = options.DryRun,
                Success = false,
                ErrorMessage = "SQL updater is already running.",
                DurationMs = 0,
                StartedAtUtc = startedAtUtc,
                EndedAtUtc = startedAtUtc
            };
        }

        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = new SchemaUpdaterExecutionResult
            {
                TargetKey = options.TargetKey ?? string.Empty,
                TargetDisplayName = options.TargetDisplayName ?? string.Empty,
                EnvironmentName = environmentName,
                DatabaseTarget = databaseTarget,
                DryRun = options.DryRun,
                StartedAtUtc = startedAtUtc
            };

            if (string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase) && !options.AllowProduction)
            {
                result.ErrorMessage =
                    $"Production execution is blocked for {databaseTarget}. Re-run the CLI with {AllowProductionFlag} or set {AllowProductionEnvironmentVariable}=true.";
                return Complete(result, stopwatch);
            }

            result.SqlRoot = options.SqlRootOverride ?? ResolveSqlRoot();
            logger?.LogInformation("SQL updater resolved folder {SqlRoot} for {DatabaseTarget}", result.SqlRoot, databaseTarget);

            var allScripts = await LoadMigrationScriptsAsync(result.SqlRoot, cancellationToken);
            result.DiscoveredScripts = allScripts
                .Where(script => script.IsExecutableMigration)
                .Select(script => script.Name)
                .ToList();
            result.ExecutionOrder = [.. result.DiscoveredScripts];
            result.IgnoredScripts = allScripts
                .Where(script => !script.IsExecutableMigration)
                .Select(script => script.Name)
                .ToList();

            await using var connection = new MySqlConnection(connectionString);
            try
            {
                await connection.OpenAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                result.ErrorMessage = $"Target database is unreachable: {ex.Message}";
                logger?.LogError(ex, "SQL updater could not connect to {DatabaseTarget}", databaseTarget);
                return Complete(result, stopwatch);
            }

            var historyTableExists = await HistoryTableExistsAsync(connection, cancellationToken);
            var previouslyApplied = historyTableExists
                ? await LoadAppliedMigrationsAsync(connection, cancellationToken)
                : [];
            var appliedSet = previouslyApplied.ToHashSet(StringComparer.OrdinalIgnoreCase);

            result.PendingScripts = result.DiscoveredScripts.Where(name => !appliedSet.Contains(name)).ToList();
            result.SkippedScripts = previouslyApplied.Where(result.DiscoveredScripts.Contains).ToList();
            result.ScriptResults.AddRange(result.SkippedScripts.Select(name => new SqlUpdaterScriptResultDto
            {
                FileName = name,
                Status = "Skipped",
                DurationMs = 0
            }));
            result.ScriptResults.AddRange(result.IgnoredScripts.Select(name => new SqlUpdaterScriptResultDto
            {
                FileName = name,
                Status = "Ignored",
                DurationMs = 0
            }));

            logger?.LogInformation(
                "SQL updater discovered {DiscoveredCount} executable scripts, {PendingCount} pending, {SkippedCount} skipped for {DatabaseTarget}",
                result.DiscoveredScripts.Count,
                result.PendingScripts.Count,
                result.SkippedScripts.Count,
                databaseTarget);

            if (options.DryRun)
            {
                result.Success = true;
                return Complete(result, stopwatch);
            }

            if (!historyTableExists)
            {
                await EnsureHistoryTableAsync(connection, cancellationToken);
            }

            foreach (var script in allScripts.Where(script => script.IsExecutableMigration && result.PendingScripts.Contains(script.Name)))
            {
                var scriptStopwatch = Stopwatch.StartNew();
                logger?.LogInformation("Applying SQL script {ScriptName} to {DatabaseTarget}", script.Name, databaseTarget);

                try
                {
                    await ExecuteMigrationAsync(connection, script, cancellationToken);
                    scriptStopwatch.Stop();

                    result.ExecutedScripts.Add(script.Name);
                    result.ScriptResults.Add(new SqlUpdaterScriptResultDto
                    {
                        FileName = script.Name,
                        Status = "Applied",
                        DurationMs = scriptStopwatch.ElapsedMilliseconds
                    });

                    logger?.LogInformation(
                        "Applied SQL script {ScriptName} to {DatabaseTarget} in {DurationMs}ms",
                        script.Name,
                        databaseTarget,
                        scriptStopwatch.ElapsedMilliseconds);
                }
                catch (Exception ex)
                {
                    scriptStopwatch.Stop();

                    result.FailedScript = script.Name;
                    result.ErrorMessage = ex.Message;
                    result.ScriptResults.Add(new SqlUpdaterScriptResultDto
                    {
                        FileName = script.Name,
                        Status = "Failed",
                        DurationMs = scriptStopwatch.ElapsedMilliseconds,
                        ErrorMessage = ex.Message
                    });

                    logger?.LogError(
                        ex,
                        "Failed SQL script {ScriptName} for {DatabaseTarget} after {DurationMs}ms",
                        script.Name,
                        databaseTarget,
                        scriptStopwatch.ElapsedMilliseconds);

                    return Complete(result, stopwatch);
                }
            }

            result.Success = true;
            return Complete(result, stopwatch);
        }
        finally
        {
            stopwatch.Stop();
            if (options.UseExecutionLock)
            {
                ActiveTargets.TryRemove(executionKey, out _);
            }
        }
    }

    private static SchemaUpdaterExecutionResult Complete(SchemaUpdaterExecutionResult result, Stopwatch stopwatch)
    {
        result.DurationMs = stopwatch.ElapsedMilliseconds;
        result.EndedAtUtc = DateTimeOffset.UtcNow;
        result.Success = result.Success && string.IsNullOrWhiteSpace(result.ErrorMessage);
        return result;
    }

    private static void PrintConsoleSummary(SchemaUpdaterExecutionResult result)
    {
        if (!string.IsNullOrWhiteSpace(result.SqlRoot))
        {
            Console.WriteLine($"SQL folder: {result.SqlRoot}");
        }

        Console.WriteLine($"Database target: {result.DatabaseTarget}");
        Console.WriteLine($"Mode: {(result.DryRun ? "dry-run" : "apply")}");
        PrintList("Discovered scripts", result.DiscoveredScripts);
        PrintList("Ignored scripts", result.IgnoredScripts);
        PrintList("Pending scripts", result.PendingScripts);
        PrintList("Skipped scripts", result.SkippedScripts);
        PrintList("Executed scripts", result.ExecutedScripts);

        if (!string.IsNullOrWhiteSpace(result.FailedScript))
        {
            Console.WriteLine($"Failed script: {result.FailedScript}");
        }

        if (!string.IsNullOrWhiteSpace(result.ErrorMessage))
        {
            Console.Error.WriteLine($"Migration failed: {result.ErrorMessage}");
            return;
        }

        Console.WriteLine(
            $"Migration {(result.DryRun ? "dry run" : "run")} complete in {result.DurationMs}ms. Success: {result.Success}.");
    }

    private static void PrintList(string title, IReadOnlyCollection<string> values)
    {
        if (values.Count == 0)
        {
            Console.WriteLine($"{title}: none");
            return;
        }

        Console.WriteLine($"{title}: {string.Join(", ", values)}");
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

    public static string ResolveSqlRootPath() => ResolveSqlRoot();

    private static string ResolveSqlRoot()
    {
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

        throw new InvalidOperationException($"SQL root could not be resolved from {AppContext.BaseDirectory}.");
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
        return $"{environmentName} [{builder.Server}:{builder.Port}/{builder.Database}]";
    }

    private static string ResolveEnvironmentName(string? overrideEnvironmentName = null) =>
        overrideEnvironmentName ??
        Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ??
        Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ??
        "Production";

    private static string BuildExecutionKey(string connectionString)
    {
        var builder = new MySqlConnectionStringBuilder(connectionString);
        return $"{builder.Server}:{builder.Port}/{builder.Database}";
    }

    private static int GetLeadingNumber(string fileName)
    {
        var prefix = new string(fileName.TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(prefix, out var number) ? number : int.MaxValue;
    }

    private static IEnumerable<string> SplitStatements(string sql) =>
        sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(statement => !string.IsNullOrWhiteSpace(statement));

    private sealed record MigrationScript(FileInfo File, string Sql, bool IsExecutableMigration)
    {
        public string Name => File.Name;
    }
}

public sealed class SchemaUpdaterExecutionOptions
{
    public bool DryRun { get; init; }
    public bool AllowProduction { get; init; }
    public string? EnvironmentName { get; init; }
    public string? ConnectionStringOverride { get; init; }
    public string? DatabaseTargetOverride { get; init; }
    public string? SqlRootOverride { get; init; }
    public string? TargetKey { get; init; }
    public string? TargetDisplayName { get; init; }
    public bool UseExecutionLock { get; init; } = true;
}

public sealed class SchemaUpdaterExecutionResult
{
    public string TargetKey { get; set; } = string.Empty;
    public string TargetDisplayName { get; set; } = string.Empty;
    public string EnvironmentName { get; set; } = string.Empty;
    public string DatabaseTarget { get; set; } = string.Empty;
    public string? SqlRoot { get; set; }
    public bool DryRun { get; set; }
    public bool Success { get; set; }
    public long DurationMs { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset EndedAtUtc { get; set; }
    public List<string> DiscoveredScripts { get; set; } = [];
    public List<string> IgnoredScripts { get; set; } = [];
    public List<string> PendingScripts { get; set; } = [];
    public List<string> ExecutedScripts { get; set; } = [];
    public List<string> SkippedScripts { get; set; } = [];
    public List<string> ExecutionOrder { get; set; } = [];
    public string? FailedScript { get; set; }
    public string? ErrorMessage { get; set; }
    public List<SqlUpdaterScriptResultDto> ScriptResults { get; set; } = [];

    public SqlUpdaterSummaryDto ToDto() => new()
    {
        TargetKey = TargetKey,
        TargetDisplayName = TargetDisplayName,
        EnvironmentName = EnvironmentName,
        DatabaseTarget = DatabaseTarget,
        DryRun = DryRun,
        Success = Success,
        DurationMs = DurationMs,
        StartedAtUtc = StartedAtUtc,
        EndedAtUtc = EndedAtUtc,
        DiscoveredScripts = [.. DiscoveredScripts],
        IgnoredScripts = [.. IgnoredScripts],
        PendingScripts = [.. PendingScripts],
        ExecutedScripts = [.. ExecutedScripts],
        SkippedScripts = [.. SkippedScripts],
        ExecutionOrder = [.. ExecutionOrder],
        FailedScript = FailedScript,
        ErrorMessage = ErrorMessage,
        ScriptResults = [.. ScriptResults]
    };
}
