namespace CroutApi.DTOs;

public class RunSqlUpdaterRequestDto
{
    public bool ConfirmExecution { get; set; }
}

public class SqlUpdaterSummaryDto
{
    public string EnvironmentName { get; set; } = string.Empty;
    public string DatabaseTarget { get; set; } = string.Empty;
    public bool DryRun { get; set; }
    public bool Success { get; set; }
    public long DurationMs { get; set; }
    public List<string> DiscoveredScripts { get; set; } = [];
    public List<string> IgnoredScripts { get; set; } = [];
    public List<string> PendingScripts { get; set; } = [];
    public List<string> ExecutedScripts { get; set; } = [];
    public List<string> SkippedScripts { get; set; } = [];
    public string? FailedScript { get; set; }
    public string? ErrorMessage { get; set; }
    public List<SqlUpdaterScriptResultDto> ScriptResults { get; set; } = [];
}

public class SqlUpdaterScriptResultDto
{
    public string FileName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public long DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
}
