using System.Collections.Concurrent;
using System.Data;
using System.Text.RegularExpressions;
using CroutApi.DTOs;
using CroutApi.Helpers;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace CroutApi.Services;

public sealed class DatabaseManagementOptions
{
    public List<DatabaseManagementTargetOptions> Targets { get; set; } = [];
}

public sealed class DatabaseManagementTargetOptions
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string EnvironmentName { get; set; } = string.Empty;
    public string HostEnvVar { get; set; } = "DB_HOST";
    public string PortEnvVar { get; set; } = "DB_PORT";
    public string UserEnvVar { get; set; } = "DB_USER";
    public string PasswordEnvVar { get; set; } = "DB_PASSWORD";
    public string DatabaseEnvVar { get; set; } = "DB_NAME";
    public string DefaultHost { get; set; } = "localhost";
    public string DefaultPort { get; set; } = "3306";
    public string DefaultUser { get; set; } = "root";
    public string DefaultDatabase { get; set; } = "crout_automations";
    public bool AllowSqlUpdates { get; set; } = true;
    public bool AllowMigrationSource { get; set; } = true;
    public bool AllowMigrationDestination { get; set; } = true;
}

public class DatabaseManagementService(
    ILogger<DatabaseManagementService> logger,
    IOptions<DatabaseManagementOptions> options) : IDatabaseManagementService
{
    private static readonly Regex DatabaseNamePattern = new("^[A-Za-z0-9_\\-]+$", RegexOptions.Compiled);
    private static readonly ConcurrentDictionary<string, SqlUpdaterSummaryDto> LatestSqlResults = new(StringComparer.OrdinalIgnoreCase);
    private static readonly ConcurrentDictionary<string, byte> ActiveMigrationDestinations = new(StringComparer.OrdinalIgnoreCase);
    private static readonly ConcurrentDictionary<string, DatabaseMigrationOperationState> MigrationOperations = new(StringComparer.OrdinalIgnoreCase);

    public Task<IReadOnlyList<DatabaseManagementTargetDto>> GetTargetsAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var targets = options.Value.Targets
            .Select(target => ResolveTarget(target, null))
            .Select(target => target.SafeDto)
            .ToList();

        return Task.FromResult<IReadOnlyList<DatabaseManagementTargetDto>>(targets);
    }

    public async Task<SqlUpdatePreviewDto> GetSqlUpdatePreviewAsync(string targetKey, CancellationToken cancellationToken = default)
    {
        var target = ResolveTargetOption(targetKey);
        if (!target.AllowSqlUpdates)
        {
            throw new ArgumentException("The selected target is not enabled for SQL updates.");
        }

        var resolved = ResolveTarget(target, null);
        var preview = await SchemaUpdater.RunCurrentEnvironmentAsync(
            new SchemaUpdaterExecutionOptions
            {
                DryRun = true,
                AllowProduction = true,
                EnvironmentName = resolved.EnvironmentName,
                ConnectionStringOverride = resolved.ConnectionString,
                DatabaseTargetOverride = resolved.DatabaseLabel,
                TargetKey = resolved.Key,
                TargetDisplayName = resolved.DisplayName,
                UseExecutionLock = false
            },
            logger,
            cancellationToken);

        return new SqlUpdatePreviewDto
        {
            Target = resolved.SafeDto,
            Preview = preview.ToDto(),
            LatestResult = await GetLatestSqlUpdateResultAsync(targetKey, cancellationToken)
        };
    }

    public Task<SqlUpdaterSummaryDto?> GetLatestSqlUpdateResultAsync(string targetKey, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        LatestSqlResults.TryGetValue(targetKey, out var result);
        return Task.FromResult(result);
    }

    public async Task<SqlUpdaterSummaryDto> RunSqlUpdateAsync(RunSqlUpdateRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.TargetKey))
        {
            throw new ArgumentException("A target environment is required.");
        }

        if (!request.ConfirmExecution)
        {
            throw new ArgumentException("Confirmation is required before running SQL updates.");
        }

        var target = ResolveTargetOption(request.TargetKey);
        if (!target.AllowSqlUpdates)
        {
            throw new ArgumentException("The selected target is not enabled for SQL updates.");
        }

        var resolved = ResolveTarget(target, null);
        if (!string.Equals(request.ConfirmationText?.Trim(), resolved.DatabaseLabel, StringComparison.Ordinal))
        {
            throw new ArgumentException("The confirmation text did not match the selected database target.");
        }

        var result = await SchemaUpdater.RunCurrentEnvironmentAsync(
            new SchemaUpdaterExecutionOptions
            {
                DryRun = false,
                AllowProduction = true,
                EnvironmentName = resolved.EnvironmentName,
                ConnectionStringOverride = resolved.ConnectionString,
                DatabaseTargetOverride = resolved.DatabaseLabel,
                TargetKey = resolved.Key,
                TargetDisplayName = resolved.DisplayName
            },
            logger,
            cancellationToken);

        var dto = result.ToDto();
        LatestSqlResults[resolved.Key] = dto;
        return dto;
    }

    public async Task<DatabaseMigrationValidationDto> ValidateMigrationAsync(ValidateDatabaseMigrationRequestDto request, CancellationToken cancellationToken = default)
    {
        var source = ResolveTargetForMigration(request.Source, allowSource: true, allowDestination: false);
        var destination = ResolveTargetForMigration(request.Destination, allowSource: false, allowDestination: true);
        var validation = new DatabaseMigrationValidationDto
        {
            Source = source.SafeDto,
            Destination = destination.SafeDto
        };

        if (string.Equals(source.IdentityKey, destination.IdentityKey, StringComparison.OrdinalIgnoreCase))
        {
            validation.Errors.Add("Source and destination must be different databases.");
            return validation;
        }

        try
        {
            await using var sourceConnection = new MySqlConnection(source.ConnectionString);
            await sourceConnection.OpenAsync(cancellationToken);
            validation.SourceTableCount = await CountTablesAsync(sourceConnection, source.DatabaseName, cancellationToken);
        }
        catch (Exception ex)
        {
            validation.Errors.Add($"Source database could not be reached: {ex.Message}");
        }

        try
        {
            await using var destinationConnection = new MySqlConnection(destination.ConnectionString);
            await destinationConnection.OpenAsync(cancellationToken);
            validation.DestinationExists = true;
            validation.DestinationTableCount = await CountTablesAsync(destinationConnection, destination.DatabaseName, cancellationToken);
        }
        catch (Exception ex)
        {
            validation.Errors.Add($"Destination database could not be reached: {ex.Message}");
        }

        if (validation.SourceTableCount == 0)
        {
            validation.Warnings.Add("The source database contains no base tables.");
        }

        if (validation.DestinationTableCount > 0)
        {
            validation.Warnings.Add("The destination database currently contains objects that will be replaced during migration.");
        }

        validation.IsValid = validation.Errors.Count == 0;
        return validation;
    }

    public async Task<DatabaseMigrationOperationDto> StartMigrationAsync(StartDatabaseMigrationRequestDto request, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateMigrationAsync(request, cancellationToken);
        var operation = new DatabaseMigrationOperationState
        {
            OperationId = Guid.NewGuid().ToString("N"),
            Status = validation.IsValid ? "Queued" : "ValidationFailed",
            CreatedAtUtc = DateTimeOffset.UtcNow,
            Validation = validation
        };

        if (!validation.IsValid)
        {
            MigrationOperations[operation.OperationId] = operation;
            return operation.ToDto();
        }

        if (!request.ConfirmExecution || !request.AcknowledgeDestinationChange)
        {
            throw new ArgumentException("Explicit confirmation is required before starting a database migration.");
        }

        var sourceLabel = validation.Source?.DatabaseLabel ?? string.Empty;
        var destinationLabel = validation.Destination?.DatabaseLabel ?? string.Empty;
        if (!string.Equals(request.SourceConfirmationText?.Trim(), sourceLabel, StringComparison.Ordinal) ||
            !string.Equals(request.DestinationConfirmationText?.Trim(), destinationLabel, StringComparison.Ordinal))
        {
            throw new ArgumentException("The source or destination confirmation text did not match the selected databases.");
        }

        var destinationKey = validation.Destination?.DatabaseLabel ?? operation.OperationId;
        if (!ActiveMigrationDestinations.TryAdd(destinationKey, 0))
        {
            operation.Status = "Conflict";
            operation.ErrorMessage = "A migration is already running for the selected destination database.";
            MigrationOperations[operation.OperationId] = operation;
            return operation.ToDto();
        }

        MigrationOperations[operation.OperationId] = operation;
        _ = Task.Run(
            async () =>
            {
                try
                {
                    operation.Status = "Running";
                    operation.StartedAtUtc = DateTimeOffset.UtcNow;
                    await RunMigrationInternalAsync(operation, CancellationToken.None);
                    operation.Status = operation.ErrorMessage is null ? "Succeeded" : "Failed";
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Database migration {OperationId} failed.", operation.OperationId);
                    operation.ErrorMessage = ex.Message;
                    operation.Status = "Failed";
                }
                finally
                {
                    operation.CompletedAtUtc = DateTimeOffset.UtcNow;
                    ActiveMigrationDestinations.TryRemove(destinationKey, out _);
                }
            },
            CancellationToken.None);

        return operation.ToDto();
    }

    public Task<DatabaseMigrationOperationDto?> GetMigrationStatusAsync(string operationId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(
            MigrationOperations.TryGetValue(operationId, out var state)
                ? state.ToDto()
                : null);
    }

    private async Task RunMigrationInternalAsync(DatabaseMigrationOperationState operation, CancellationToken cancellationToken)
    {
        var source = ResolveTargetForMigration(
            new MigrationDatabaseSelectionDto
            {
                TargetKey = operation.Validation!.Source!.Key,
                DatabaseNameOverride = operation.Validation.Source.DatabaseName
            },
            allowSource: true,
            allowDestination: false);
        var destination = ResolveTargetForMigration(
            new MigrationDatabaseSelectionDto
            {
                TargetKey = operation.Validation!.Destination!.Key,
                DatabaseNameOverride = operation.Validation.Destination.DatabaseName
            },
            allowSource: false,
            allowDestination: true);

        var summary = new DatabaseMigrationSummaryDto
        {
            SourceDatabaseLabel = source.DatabaseLabel,
            DestinationDatabaseLabel = destination.DatabaseLabel,
            StartedAtUtc = operation.StartedAtUtc ?? DateTimeOffset.UtcNow
        };

        operation.Source = source.SafeDto;
        operation.Destination = destination.SafeDto;

        await using var sourceConnection = new MySqlConnection(source.ConnectionString);
        await using var destinationConnection = new MySqlConnection(destination.ConnectionString);

        await AddStepAsync(operation, "Connect source", async step =>
        {
            await sourceConnection.OpenAsync(cancellationToken);
            step.Message = source.DatabaseLabel;
        });

        await AddStepAsync(operation, "Connect destination", async step =>
        {
            await destinationConnection.OpenAsync(cancellationToken);
            step.Message = destination.DatabaseLabel;
        });

        List<string> sourceTables = [];
        List<string> sourceViews = [];

        await AddStepAsync(operation, "Inspect source schema", async step =>
        {
            sourceTables = await LoadObjectNamesAsync(sourceConnection, source.DatabaseName, "BASE TABLE", cancellationToken);
            sourceViews = await LoadObjectNamesAsync(sourceConnection, source.DatabaseName, "VIEW", cancellationToken);
            summary.SourceTableCount = sourceTables.Count;
            step.Message = $"{sourceTables.Count} tables, {sourceViews.Count} views";
        });

        await AddStepAsync(operation, "Clear destination schema", async step =>
        {
            var destinationViews = await LoadObjectNamesAsync(destinationConnection, destination.DatabaseName, "VIEW", cancellationToken);
            var destinationTables = await LoadObjectNamesAsync(destinationConnection, destination.DatabaseName, "BASE TABLE", cancellationToken);
            summary.DestinationTableCount = destinationTables.Count;

            await ExecuteNonQueryAsync(destinationConnection, "SET FOREIGN_KEY_CHECKS = 0;", cancellationToken);
            foreach (var viewName in destinationViews)
            {
                await ExecuteNonQueryAsync(destinationConnection, $"DROP VIEW IF EXISTS {QuoteIdentifier(viewName)};", cancellationToken);
            }

            foreach (var tableName in destinationTables)
            {
                await ExecuteNonQueryAsync(destinationConnection, $"DROP TABLE IF EXISTS {QuoteIdentifier(tableName)};", cancellationToken);
            }

            await ExecuteNonQueryAsync(destinationConnection, "SET FOREIGN_KEY_CHECKS = 1;", cancellationToken);
            step.Message = $"{destinationTables.Count} tables and {destinationViews.Count} views removed";
        });

        await AddStepAsync(operation, "Recreate tables", async step =>
        {
            foreach (var tableName in sourceTables)
            {
                var createSql = await GetCreateStatementAsync(sourceConnection, tableName, isView: false, cancellationToken);
                await ExecuteNonQueryAsync(destinationConnection, createSql, cancellationToken);
                summary.TablesRecreated++;
            }

            step.Message = $"{summary.TablesRecreated} tables recreated";
        });

        await AddStepAsync(operation, "Copy table data", async step =>
        {
            await ExecuteNonQueryAsync(destinationConnection, "SET FOREIGN_KEY_CHECKS = 0;", cancellationToken);
            foreach (var tableName in sourceTables)
            {
                summary.RowsCopied += await CopyTableDataAsync(sourceConnection, destinationConnection, tableName, cancellationToken);
            }
            await ExecuteNonQueryAsync(destinationConnection, "SET FOREIGN_KEY_CHECKS = 1;", cancellationToken);
            step.Message = $"{summary.RowsCopied} rows copied";
        });

        await AddStepAsync(operation, "Recreate views", async step =>
        {
            foreach (var viewName in sourceViews)
            {
                var createSql = await GetCreateStatementAsync(sourceConnection, viewName, isView: true, cancellationToken);
                await ExecuteNonQueryAsync(destinationConnection, createSql, cancellationToken);
                summary.ViewsRecreated++;
            }

            step.Message = $"{summary.ViewsRecreated} views recreated";
        });

        summary.Success = true;
        summary.EndedAtUtc = DateTimeOffset.UtcNow;
        operation.Summary = summary;
    }

    private static async Task AddStepAsync(
        DatabaseMigrationOperationState operation,
        string name,
        Func<DatabaseMigrationStepDto, Task> action)
    {
        var step = new DatabaseMigrationStepDto
        {
            Name = name,
            Status = "Running",
            StartedAtUtc = DateTimeOffset.UtcNow
        };

        operation.Steps.Add(step);
        try
        {
            await action(step);
            step.Status = "Succeeded";
        }
        catch (Exception ex)
        {
            step.Status = "Failed";
            step.Message = ex.Message;
            operation.ErrorMessage = ex.Message;
            operation.Summary ??= new DatabaseMigrationSummaryDto
            {
                SourceDatabaseLabel = operation.Validation?.Source?.DatabaseLabel ?? string.Empty,
                DestinationDatabaseLabel = operation.Validation?.Destination?.DatabaseLabel ?? string.Empty,
                StartedAtUtc = operation.StartedAtUtc ?? DateTimeOffset.UtcNow,
                EndedAtUtc = DateTimeOffset.UtcNow,
                Success = false,
                ErrorMessage = ex.Message
            };
            operation.Summary.Success = false;
            operation.Summary.ErrorMessage = ex.Message;
            operation.Summary.EndedAtUtc = DateTimeOffset.UtcNow;
            throw;
        }
        finally
        {
            step.CompletedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    private DatabaseManagementTargetOptions ResolveTargetOption(string targetKey)
    {
        var target = options.Value.Targets.FirstOrDefault(item =>
            string.Equals(item.Key, targetKey, StringComparison.OrdinalIgnoreCase));

        return target ?? throw new ArgumentException("The selected database target is not configured.");
    }

    private ResolvedDatabaseTarget ResolveTargetForMigration(
        MigrationDatabaseSelectionDto selection,
        bool allowSource,
        bool allowDestination)
    {
        if (string.IsNullOrWhiteSpace(selection.TargetKey))
        {
            throw new ArgumentException("A database target is required.");
        }

        var target = ResolveTargetOption(selection.TargetKey);
        if (allowSource && !target.AllowMigrationSource)
        {
            throw new ArgumentException("The selected source target is not enabled for migration.");
        }

        if (allowDestination && !target.AllowMigrationDestination)
        {
            throw new ArgumentException("The selected destination target is not enabled for migration.");
        }

        return ResolveTarget(target, selection.DatabaseNameOverride);
    }

    private ResolvedDatabaseTarget ResolveTarget(DatabaseManagementTargetOptions target, string? databaseOverride)
    {
        var host = ResolveValue(target.HostEnvVar, target.DefaultHost);
        var port = ResolveValue(target.PortEnvVar, target.DefaultPort);
        var user = ResolveValue(target.UserEnvVar, target.DefaultUser);
        var password = ResolveValue(target.PasswordEnvVar, string.Empty);
        var database = string.IsNullOrWhiteSpace(databaseOverride)
            ? ResolveValue(target.DatabaseEnvVar, target.DefaultDatabase)
            : NormalizeDatabaseName(databaseOverride);

        return new ResolvedDatabaseTarget(
            target.Key,
            target.DisplayName,
            string.IsNullOrWhiteSpace(target.EnvironmentName) ? target.DisplayName : target.EnvironmentName,
            host,
            port,
            database,
            DbHelper.BuildConnectionString(host, port, database, user, password),
            target.AllowSqlUpdates,
            target.AllowMigrationSource,
            target.AllowMigrationDestination);
    }

    private static string NormalizeDatabaseName(string databaseName)
    {
        var value = databaseName.Trim();
        if (!DatabaseNamePattern.IsMatch(value))
        {
            throw new ArgumentException("Database names may only contain letters, numbers, dashes, and underscores.");
        }

        return value;
    }

    private static string ResolveValue(string environmentVariable, string fallback, bool required = false)
    {
        var value = Environment.GetEnvironmentVariable(environmentVariable);
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value.Trim();
        }

        if (required && string.IsNullOrWhiteSpace(fallback))
        {
            throw new InvalidOperationException($"The required environment variable '{environmentVariable}' is not set.");
        }

        return fallback;
    }

    private static async Task<int> CountTablesAsync(MySqlConnection connection, string databaseName, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = @databaseName
              AND table_type = 'BASE TABLE'
            """;

        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@databaseName", databaseName);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }

    private static async Task<List<string>> LoadObjectNamesAsync(
        MySqlConnection connection,
        string databaseName,
        string tableType,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = @databaseName
              AND table_type = @tableType
            ORDER BY table_name
            """;

        var items = new List<string>();
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@databaseName", databaseName);
        command.Parameters.AddWithValue("@tableType", tableType);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(reader.GetString(0));
        }

        return items;
    }

    private static async Task<string> GetCreateStatementAsync(
        MySqlConnection connection,
        string objectName,
        bool isView,
        CancellationToken cancellationToken)
    {
        var sql = isView
            ? $"SHOW CREATE VIEW {QuoteIdentifier(objectName)}"
            : $"SHOW CREATE TABLE {QuoteIdentifier(objectName)}";

        await using var command = new MySqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException($"Definition for '{objectName}' could not be loaded.");
        }

        var ordinal = isView ? 1 : 1;
        var createStatement = reader.GetString(ordinal);
        return isView
            ? Regex.Replace(createStatement, @"\sDEFINER=`[^`]+`@`[^`]+`", string.Empty, RegexOptions.IgnoreCase)
            : createStatement;
    }

    private static async Task<long> CopyTableDataAsync(
        MySqlConnection source,
        MySqlConnection destination,
        string tableName,
        CancellationToken cancellationToken)
    {
        var totalRows = 0L;
        await using var command = new MySqlCommand($"SELECT * FROM {QuoteIdentifier(tableName)}", source);
        await using var reader = await command.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
        var columns = Enumerable.Range(0, reader.FieldCount)
            .Select(reader.GetName)
            .ToList();

        var rows = new List<object?[]>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var values = new object[reader.FieldCount];
            reader.GetValues(values);
            rows.Add(values);

            if (rows.Count >= 200)
            {
                totalRows += await InsertRowsAsync(destination, tableName, columns, rows, cancellationToken);
                rows.Clear();
            }
        }

        if (rows.Count > 0)
        {
            totalRows += await InsertRowsAsync(destination, tableName, columns, rows, cancellationToken);
        }

        return totalRows;
    }

    private static async Task<int> InsertRowsAsync(
        MySqlConnection connection,
        string tableName,
        IReadOnlyList<string> columns,
        IReadOnlyList<object?[]> rows,
        CancellationToken cancellationToken)
    {
        if (rows.Count == 0)
        {
            return 0;
        }

        var columnList = string.Join(", ", columns.Select(QuoteIdentifier));
        var valueGroups = new List<string>(rows.Count);
        await using var command = connection.CreateCommand();

        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            var valueNames = new List<string>(columns.Count);
            for (var columnIndex = 0; columnIndex < columns.Count; columnIndex++)
            {
                var parameterName = $"@p_{rowIndex}_{columnIndex}";
                valueNames.Add(parameterName);
                command.Parameters.AddWithValue(parameterName, rows[rowIndex][columnIndex] ?? DBNull.Value);
            }

            valueGroups.Add($"({string.Join(", ", valueNames)})");
        }

        command.CommandText = $"INSERT INTO {QuoteIdentifier(tableName)} ({columnList}) VALUES {string.Join(", ", valueGroups)};";
        await command.ExecuteNonQueryAsync(cancellationToken);
        return rows.Count;
    }

    private static async Task ExecuteNonQueryAsync(MySqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = new MySqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string QuoteIdentifier(string identifier) => $"`{identifier.Replace("`", "``", StringComparison.Ordinal)}`";

    private sealed record ResolvedDatabaseTarget(
        string Key,
        string DisplayName,
        string EnvironmentName,
        string Host,
        string Port,
        string DatabaseName,
        string ConnectionString,
        bool AllowSqlUpdates,
        bool AllowMigrationSource,
        bool AllowMigrationDestination)
    {
        public string ServerLabel => $"{Host}:{Port}";
        public string DatabaseLabel => $"{DisplayName} [{ServerLabel}/{DatabaseName}]";
        public string IdentityKey => $"{ServerLabel}/{DatabaseName}";
        public DatabaseManagementTargetDto SafeDto => new()
        {
            Key = Key,
            DisplayName = DisplayName,
            EnvironmentName = EnvironmentName,
            ServerLabel = ServerLabel,
            DatabaseName = DatabaseName,
            DatabaseLabel = DatabaseLabel,
            AllowSqlUpdates = AllowSqlUpdates,
            AllowMigrationSource = AllowMigrationSource,
            AllowMigrationDestination = AllowMigrationDestination
        };
    }

    private sealed class DatabaseMigrationOperationState
    {
        public string OperationId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTimeOffset CreatedAtUtc { get; set; }
        public DateTimeOffset? StartedAtUtc { get; set; }
        public DateTimeOffset? CompletedAtUtc { get; set; }
        public DatabaseManagementTargetDto? Source { get; set; }
        public DatabaseManagementTargetDto? Destination { get; set; }
        public string? ErrorMessage { get; set; }
        public DatabaseMigrationValidationDto? Validation { get; set; }
        public DatabaseMigrationSummaryDto? Summary { get; set; }
        public List<DatabaseMigrationStepDto> Steps { get; set; } = [];

        public DatabaseMigrationOperationDto ToDto() => new()
        {
            OperationId = OperationId,
            Status = Status,
            CreatedAtUtc = CreatedAtUtc,
            StartedAtUtc = StartedAtUtc,
            CompletedAtUtc = CompletedAtUtc,
            Source = Source ?? Validation?.Source,
            Destination = Destination ?? Validation?.Destination,
            ErrorMessage = ErrorMessage,
            Validation = Validation,
            Summary = Summary,
            Steps = [.. Steps]
        };
    }
}
