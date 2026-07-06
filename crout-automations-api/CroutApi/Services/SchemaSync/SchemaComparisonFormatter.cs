using System.Text;

namespace CroutApi.Services.SchemaSync;

internal sealed class SchemaComparisonFormatter
{
    public string FormatSummary(SchemaComparisonResult comparison)
    {
        var counts = comparison.Differences
            .GroupBy(item => item.Severity)
            .OrderBy(group => group.Key)
            .Select(group => $"{group.Key}: {group.Count()}");

        var summary = new StringBuilder();
        summary.Append($"Compared {comparison.Source.DatabaseName} to {comparison.Target.DatabaseName}. ");
        summary.Append($"Found {comparison.Differences.Count} difference(s). ");
        summary.Append(string.Join(", ", counts));
        return summary.ToString().Trim();
    }

    public List<string> BuildPreflightChecks(SchemaComparisonResult comparison) =>
        comparison.Differences
            .Where(item => item.Severity is SchemaDifferenceSeverity.RequiresDataMigration or SchemaDifferenceSeverity.ManualReviewRequired)
            .Select(item => $"{item.TableName}{(item.ObjectName is null ? string.Empty : $".{item.ObjectName}")}: {item.RecommendedAction}")
            .Distinct(StringComparer.Ordinal)
            .OrderBy(item => item, StringComparer.OrdinalIgnoreCase)
            .ToList();
}
