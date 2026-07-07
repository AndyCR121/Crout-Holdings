using System.Text;
using System.Text.RegularExpressions;
using CroutApi.DTOs;
using CroutApi.Helpers;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace CroutApi.Services.SchemaSync;

public sealed class SchemaSyncPlanService(
    ILogger<SchemaSyncPlanService> logger,
    IOptions<DatabaseManagementOptions> options) : ISchemaSyncPlanService
{
    private static readonly Regex DatabaseNamePattern = new("^[A-Za-z0-9_\\-]+$", RegexOptions.Compiled);
    private static readonly Regex MigrationFileNamePattern = new("^\\d+_schema_sync_\\d{14}\\.sql$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private readonly SchemaMetadataReader _metadataReader = new();
    private readonly SchemaComparer _comparer = new();
    private readonly SchemaSafetyClassifier _classifier = new();
    private readonly SchemaSqlGenerator _sqlGenerator = new();
    private readonly SchemaComparisonFormatter _formatter = new();

    public async Task<SchemaComparisonResponseDto> CompareAsync(
        SchemaComparisonRequestDto request,
        CancellationToken cancellationToken = default) =>
        new()
        {
            Plan = await BuildPlanAsync(request, generatedMigrationFileName: null, cancellationToken)
        };

    public Task<SchemaSyncPlanDto> CreatePlanAsync(
        SchemaComparisonRequestDto request,
        CancellationToken cancellationToken = default) =>
        BuildPlanAsync(request, generatedMigrationFileName: null, cancellationToken);

    public async Task<SchemaSyncPlanDto> GenerateMigrationAsync(
        GenerateSchemaSyncMigrationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var source = ResolveTarget(request.Source, allowSource: true, allowDestination: false);
        var target = ResolveTarget(request.Target, allowSource: false, allowDestination: true);
        if (!request.ConfirmGeneration)
        {
            throw new ArgumentException("Explicit confirmation is required before generating a schema sync migration file.");
        }

        if (!string.Equals(request.ConfirmationText?.Trim(), target.SafeDto.DatabaseLabel, StringComparison.Ordinal))
        {
            throw new ArgumentException("The confirmation text did not match the selected target database.");
        }

        var plan = await BuildPlanAsync(request, generatedMigrationFileName: null, cancellationToken);
        if (string.IsNullOrWhiteSpace(plan.GeneratedSqlPreview))
        {
            throw new ArgumentException("No safe auto-apply SQL is available to generate.");
        }

        var sqlRoot = SchemaUpdater.ResolveSqlRootPath();
        var fileName = GetNextMigrationFileName(sqlRoot);
        var filePath = Path.Combine(sqlRoot, fileName);
        var fileContents = BuildMigrationFileContents(source.SafeDto, target.SafeDto, plan.GeneratedSqlPreview);
        await File.WriteAllTextAsync(filePath, fileContents, Encoding.UTF8, cancellationToken);
        logger.LogInformation(
            "Generated schema sync migration {FileName} for {TargetDatabase}",
            fileName,
            target.SafeDto.DatabaseLabel);

        plan.GeneratedMigrationFileName = fileName;
        plan.ApprovalState = "MigrationGenerated";
        return plan;
    }

    public async Task<SchemaSyncMigrationFileDto?> GetGeneratedMigrationFileAsync(
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var trimmedFileName = fileName?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedFileName) || !MigrationFileNamePattern.IsMatch(trimmedFileName))
        {
            throw new ArgumentException("The requested migration file name is invalid.");
        }

        var sqlRoot = SchemaUpdater.ResolveSqlRootPath();
        var filePath = Path.Combine(sqlRoot, trimmedFileName);
        if (!File.Exists(filePath))
        {
            return null;
        }

        return new SchemaSyncMigrationFileDto
        {
            FileName = trimmedFileName,
            Content = await File.ReadAllBytesAsync(filePath, cancellationToken)
        };
    }

    private async Task<SchemaSyncPlanDto> BuildPlanAsync(
        SchemaComparisonRequestDto request,
        string? generatedMigrationFileName,
        CancellationToken cancellationToken)
    {
        var source = ResolveTarget(request.Source, allowSource: true, allowDestination: false);
        var target = ResolveTarget(request.Target, allowSource: false, allowDestination: true);
        if (string.Equals(source.IdentityKey, target.IdentityKey, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Source and target must resolve to different databases.");
        }

        await using var sourceConnection = new MySqlConnection(source.ConnectionString);
        await using var targetConnection = new MySqlConnection(target.ConnectionString);
        await sourceConnection.OpenAsync(cancellationToken);
        await targetConnection.OpenAsync(cancellationToken);

        var sourceSnapshot = await _metadataReader.ReadAsync(sourceConnection, source.DatabaseName, cancellationToken);
        var targetSnapshot = await _metadataReader.ReadAsync(targetConnection, target.DatabaseName, cancellationToken);
        var comparison = _comparer.Compare(sourceSnapshot, targetSnapshot);
        _classifier.Classify(comparison);
        var sqlPreview = _sqlGenerator.GeneratePlanSql(comparison);
        var readableSummary = _formatter.FormatSummary(comparison);
        var preflightChecks = _formatter.BuildPreflightChecks(comparison);

        return new SchemaSyncPlanDto
        {
            Source = source.SafeDto,
            Target = target.SafeDto,
            ComparedAtUtc = comparison.ComparedAtUtc,
            ReadableSummary = readableSummary,
            ApprovalState = generatedMigrationFileName is null ? "PendingReview" : "MigrationGenerated",
            GeneratedMigrationFileName = generatedMigrationFileName,
            GeneratedSqlPreview = sqlPreview,
            PreflightChecks = preflightChecks,
            SeverityCounts = comparison.Differences
                .GroupBy(item => item.Severity.ToString())
                .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
                .Select(group => new SchemaCountDto { Key = group.Key, Count = group.Count() })
                .ToList(),
            CategoryCounts = comparison.Differences
                .GroupBy(item => item.Category.ToString())
                .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
                .Select(group => new SchemaCountDto { Key = group.Key, Count = group.Count() })
                .ToList(),
            Differences = comparison.Differences
                .OrderBy(item => item.Severity)
                .ThenBy(item => item.TableName, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.ObjectName, StringComparer.OrdinalIgnoreCase)
                .Select(item => new SchemaDifferenceDto
                {
                    Category = item.Category.ToString(),
                    Severity = item.Severity.ToString(),
                    TableName = item.TableName,
                    ObjectName = item.ObjectName,
                    SourceValue = item.SourceValue,
                    TargetValue = item.TargetValue,
                    Explanation = item.Explanation,
                    RecommendedAction = item.RecommendedAction,
                    CanGenerateSql = item.CanGenerateSql,
                    GeneratedSql = item.GeneratedSql
                })
                .ToList()
        };
    }

    private DatabaseManagementTargetOptions ResolveTargetOption(string targetKey)
    {
        var target = options.Value.Targets.FirstOrDefault(item =>
            string.Equals(item.Key, targetKey, StringComparison.OrdinalIgnoreCase));

        return target ?? throw new ArgumentException("The selected database target is not configured.");
    }

    private ResolvedSchemaSyncTarget ResolveTarget(
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
            throw new ArgumentException("The selected source target is not enabled for schema sync.");
        }

        if (allowDestination && !target.AllowMigrationDestination)
        {
            throw new ArgumentException("The selected target target is not enabled for schema sync.");
        }

        var host = ResolveValue(target.HostEnvVar, target.DefaultHost);
        var port = ResolveValue(target.PortEnvVar, target.DefaultPort);
        var user = ResolveValue(target.UserEnvVar, target.DefaultUser);
        var password = ResolveValue(target.PasswordEnvVar, string.Empty);
        var database = string.IsNullOrWhiteSpace(selection.DatabaseNameOverride)
            ? ResolveValue(target.DatabaseEnvVar, target.DefaultDatabase)
            : NormalizeDatabaseName(selection.DatabaseNameOverride);

        return new ResolvedSchemaSyncTarget(
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

    private static string BuildMigrationFileContents(
        DatabaseManagementTargetDto source,
        DatabaseManagementTargetDto target,
        string sqlPreview)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"-- Schema sync reviewed migration generated on {DateTimeOffset.UtcNow:O}");
        builder.AppendLine($"-- Source: {source.DatabaseLabel}");
        builder.AppendLine($"-- Target: {target.DatabaseLabel}");
        builder.AppendLine("-- Generated only from SafeAutoApply differences.");
        builder.AppendLine();
        builder.AppendLine(sqlPreview.Trim());
        if (!sqlPreview.TrimEnd().EndsWith(';'))
        {
            builder.AppendLine(";");
        }

        return builder.ToString();
    }

    private static string GetNextMigrationFileName(string sqlRoot)
    {
        var maxPrefix = Directory.GetFiles(sqlRoot, "*.sql", SearchOption.TopDirectoryOnly)
            .Select(path => Path.GetFileName(path))
            .Select(GetLeadingNumber)
            .Where(number => number >= 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"{maxPrefix + 1:D2}_schema_sync_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.sql";
    }

    private static int GetLeadingNumber(string fileName)
    {
        var prefix = new string(fileName.TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(prefix, out var number) ? number : -1;
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

    private static string ResolveValue(string environmentVariable, string fallback)
    {
        var value = Environment.GetEnvironmentVariable(environmentVariable);
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private sealed record ResolvedSchemaSyncTarget(
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
        public string IdentityKey => $"{ServerLabel}/{DatabaseName}";
        public DatabaseManagementTargetDto SafeDto => new()
        {
            Key = Key,
            DisplayName = DisplayName,
            EnvironmentName = EnvironmentName,
            ServerLabel = ServerLabel,
            DatabaseName = DatabaseName,
            DatabaseLabel = $"{DisplayName} [{ServerLabel}/{DatabaseName}]",
            AllowSqlUpdates = AllowSqlUpdates,
            AllowMigrationSource = AllowMigrationSource,
            AllowMigrationDestination = AllowMigrationDestination
        };
    }
}
