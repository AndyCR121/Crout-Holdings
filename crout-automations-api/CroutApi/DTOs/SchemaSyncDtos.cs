namespace CroutApi.DTOs;

public class SchemaComparisonRequestDto
{
    public MigrationDatabaseSelectionDto Source { get; set; } = new();
    public MigrationDatabaseSelectionDto Target { get; set; } = new();
}

public class GenerateSchemaSyncMigrationRequestDto : SchemaComparisonRequestDto
{
    public bool ConfirmGeneration { get; set; }
    public string? ConfirmationText { get; set; }
}

public class RunDatabaseMigrationsRequestDto
{
    public string TargetKey { get; set; } = string.Empty;
    public bool ConfirmExecution { get; set; }
    public string? ConfirmationText { get; set; }
}

public class SchemaSyncCountDto
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class SchemaDifferenceDto
{
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public string? ObjectName { get; set; }
    public string? SourceValue { get; set; }
    public string? TargetValue { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
    public bool CanGenerateSql { get; set; }
    public string? GeneratedSql { get; set; }
}

public class SchemaSyncPlanDto
{
    public DatabaseManagementTargetDto? Source { get; set; }
    public DatabaseManagementTargetDto? Target { get; set; }
    public DateTimeOffset ComparedAtUtc { get; set; }
    public string ReadableSummary { get; set; } = string.Empty;
    public string ApprovalState { get; set; } = string.Empty;
    public string? GeneratedMigrationFileName { get; set; }
    public string GeneratedSqlPreview { get; set; } = string.Empty;
    public List<string> PreflightChecks { get; set; } = [];
    public List<SchemaCountDto> SeverityCounts { get; set; } = [];
    public List<SchemaCountDto> CategoryCounts { get; set; } = [];
    public List<SchemaDifferenceDto> Differences { get; set; } = [];
}

public class SchemaComparisonResponseDto
{
    public SchemaSyncPlanDto? Plan { get; set; }
}

public class SchemaCountDto
{
    public string Key { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class SchemaSyncMigrationFileDto
{
    public string FileName { get; set; } = string.Empty;
    public byte[] Content { get; set; } = [];
}
