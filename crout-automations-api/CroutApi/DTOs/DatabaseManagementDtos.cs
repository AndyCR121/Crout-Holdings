namespace CroutApi.DTOs;

public class DatabaseManagementTargetDto
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string EnvironmentName { get; set; } = string.Empty;
    public string ServerLabel { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public string DatabaseLabel { get; set; } = string.Empty;
    public bool AllowSqlUpdates { get; set; }
    public bool AllowMigrationSource { get; set; }
    public bool AllowMigrationDestination { get; set; }
}

public class SqlUpdatePreviewDto
{
    public DatabaseManagementTargetDto? Target { get; set; }
    public SqlUpdaterSummaryDto? Preview { get; set; }
    public SqlUpdaterSummaryDto? LatestResult { get; set; }
}

public class RunSqlUpdateRequestDto
{
    public string TargetKey { get; set; } = string.Empty;
    public bool ConfirmExecution { get; set; }
    public string? ConfirmationText { get; set; }
}

public class MigrationDatabaseSelectionDto
{
    public string TargetKey { get; set; } = string.Empty;
    public string? DatabaseNameOverride { get; set; }
}

public class ValidateDatabaseMigrationRequestDto
{
    public MigrationDatabaseSelectionDto Source { get; set; } = new();
    public MigrationDatabaseSelectionDto Destination { get; set; } = new();
}

public class StartDatabaseMigrationRequestDto : ValidateDatabaseMigrationRequestDto
{
    public bool ConfirmExecution { get; set; }
    public bool AcknowledgeDestinationChange { get; set; }
    public string? SourceConfirmationText { get; set; }
    public string? DestinationConfirmationText { get; set; }
}

public class DatabaseMigrationValidationDto
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = [];
    public List<string> Warnings { get; set; } = [];
    public DatabaseManagementTargetDto? Source { get; set; }
    public DatabaseManagementTargetDto? Destination { get; set; }
    public int SourceTableCount { get; set; }
    public int DestinationTableCount { get; set; }
    public bool DestinationExists { get; set; }
}

public class DatabaseMigrationOperationDto
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
}

public class DatabaseMigrationSummaryDto
{
    public string SourceDatabaseLabel { get; set; } = string.Empty;
    public string DestinationDatabaseLabel { get; set; } = string.Empty;
    public bool Success { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset EndedAtUtc { get; set; }
    public int SourceTableCount { get; set; }
    public int DestinationTableCount { get; set; }
    public int TablesRecreated { get; set; }
    public int ViewsRecreated { get; set; }
    public long RowsCopied { get; set; }
    public string? ErrorMessage { get; set; }
}

public class DatabaseMigrationStepDto
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
}
