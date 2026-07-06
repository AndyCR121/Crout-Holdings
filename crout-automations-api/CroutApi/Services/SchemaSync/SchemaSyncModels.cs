using System.Globalization;

namespace CroutApi.Services.SchemaSync;

internal sealed class DatabaseSchemaSnapshot
{
    public string DatabaseName { get; init; } = string.Empty;
    public Dictionary<string, TableSchemaSnapshot> Tables { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

internal sealed class TableSchemaSnapshot
{
    public string TableName { get; init; } = string.Empty;
    public string TableType { get; init; } = "BASE TABLE";
    public string? Engine { get; init; }
    public string? Collation { get; init; }
    public string? CreateStatement { get; set; }
    public Dictionary<string, ColumnSchemaSnapshot> Columns { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    public PrimaryKeySchemaSnapshot? PrimaryKey { get; set; }
    public Dictionary<string, IndexSchemaSnapshot> Indexes { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, ForeignKeySchemaSnapshot> ForeignKeys { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

internal sealed class ColumnSchemaSnapshot
{
    public string TableName { get; init; } = string.Empty;
    public string ColumnName { get; init; } = string.Empty;
    public int OrdinalPosition { get; init; }
    public string DataType { get; init; } = string.Empty;
    public string FullColumnType { get; init; } = string.Empty;
    public long? CharacterMaximumLength { get; init; }
    public int? NumericPrecision { get; init; }
    public int? NumericScale { get; init; }
    public int? DateTimePrecision { get; init; }
    public bool IsNullable { get; init; }
    public string? DefaultValue { get; init; }
    public string? Extra { get; init; }
    public string? CharacterSet { get; init; }
    public string? Collation { get; init; }
    public string? Comment { get; init; }
}

internal sealed class PrimaryKeySchemaSnapshot
{
    public string ConstraintName { get; init; } = "PRIMARY";
    public List<string> Columns { get; init; } = [];
}

internal sealed class IndexSchemaSnapshot
{
    public string TableName { get; init; } = string.Empty;
    public string IndexName { get; init; } = string.Empty;
    public bool IsUnique { get; init; }
    public bool IsPrimary { get; init; }
    public string? IndexType { get; init; }
    public List<IndexColumnSchemaSnapshot> Columns { get; init; } = [];
}

internal sealed class IndexColumnSchemaSnapshot
{
    public string ColumnName { get; init; } = string.Empty;
    public int OrdinalPosition { get; init; }
    public int? PrefixLength { get; init; }
}

internal sealed class ForeignKeySchemaSnapshot
{
    public string TableName { get; init; } = string.Empty;
    public string ConstraintName { get; init; } = string.Empty;
    public List<string> Columns { get; init; } = [];
    public string ReferencedTableName { get; init; } = string.Empty;
    public List<string> ReferencedColumns { get; init; } = [];
    public string UpdateRule { get; init; } = string.Empty;
    public string DeleteRule { get; init; } = string.Empty;
}

internal enum SchemaDifferenceSeverity
{
    SafeAutoApply = 0,
    RequiresDataMigration = 1,
    ManualReviewRequired = 2,
    DestructiveBlocked = 3
}

internal enum SchemaDifferenceCategory
{
    MissingTable,
    ExtraTable,
    TableDefinitionMismatch,
    MissingColumn,
    ExtraColumn,
    ColumnTypeMismatch,
    ColumnLengthMismatch,
    ColumnPrecisionMismatch,
    ColumnScaleMismatch,
    ColumnNullabilityMismatch,
    ColumnDefaultMismatch,
    ColumnAutoIncrementMismatch,
    ColumnCharacterSetMismatch,
    ColumnCollationMismatch,
    PrimaryKeyMismatch,
    MissingUniqueConstraint,
    ExtraUniqueConstraint,
    MissingIndex,
    ExtraIndex,
    IndexDefinitionMismatch,
    MissingForeignKey,
    ExtraForeignKey,
    ForeignKeyDefinitionMismatch,
    UnknownOrUnsupported
}

internal sealed class SchemaDifference
{
    public SchemaDifferenceCategory Category { get; init; }
    public SchemaDifferenceSeverity Severity { get; set; }
    public string TableName { get; init; } = string.Empty;
    public string? ObjectName { get; init; }
    public string? SourceValue { get; init; }
    public string? TargetValue { get; init; }
    public string Explanation { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
    public bool CanGenerateSql { get; set; }
    public string? GeneratedSql { get; set; }
}

internal sealed class SchemaComparisonResult
{
    public DatabaseSchemaSnapshot Source { get; init; } = new();
    public DatabaseSchemaSnapshot Target { get; init; } = new();
    public DateTimeOffset ComparedAtUtc { get; init; } = DateTimeOffset.UtcNow;
    public List<SchemaDifference> Differences { get; init; } = [];
}

internal sealed class SchemaSyncPlan
{
    public string SourceDisplayName { get; init; } = string.Empty;
    public string TargetDisplayName { get; init; } = string.Empty;
    public DateTimeOffset ComparedAtUtc { get; init; }
    public List<SchemaDifference> Differences { get; init; } = [];
    public List<string> PreflightChecks { get; init; } = [];
    public string ReadableSummary { get; init; } = string.Empty;
    public string GeneratedSqlPreview { get; init; } = string.Empty;
    public string ApprovalState { get; init; } = "PendingReview";
    public string? GeneratedMigrationFileName { get; set; }
}

internal static class SchemaSnapshotNormalizer
{
    public static string NormalizeDataType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Trim().ToLowerInvariant() switch
        {
            "integer" => "int",
            "boolean" => "tinyint",
            _ => value.Trim().ToLowerInvariant()
        };
    }

    public static string NormalizeColumnType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim().ToLowerInvariant();
        normalized = normalized.Replace("integer", "int", StringComparison.Ordinal);
        while (normalized.Contains("  ", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("  ", " ", StringComparison.Ordinal);
        }

        normalized = normalized.Replace("( ", "(", StringComparison.Ordinal)
            .Replace(" )", ")", StringComparison.Ordinal)
            .Replace(" ,", ",", StringComparison.Ordinal)
            .Replace(", ", ",", StringComparison.Ordinal);

        return normalized;
    }

    public static string? NormalizeDefaultValue(string? value)
    {
        if (value is null)
        {
            return null;
        }

        var normalized = value.Trim();
        if (normalized.Length == 0)
        {
            return string.Empty;
        }

        while (normalized.StartsWith('(') && normalized.EndsWith(')') && normalized.Length > 2)
        {
            normalized = normalized[1..^1].Trim();
        }

        normalized = normalized.Replace(" ", string.Empty, StringComparison.Ordinal);
        var lower = normalized.ToLowerInvariant();
        if (lower is "current_timestamp" or "current_timestamp()" or "current_timestamp(0)")
        {
            return "current_timestamp";
        }

        return normalized;
    }

    public static string? NormalizeNullableString(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static bool HasAutoIncrement(ColumnSchemaSnapshot column) =>
        NormalizeNullableString(column.Extra)?.Contains("auto_increment", StringComparison.OrdinalIgnoreCase) == true;

    public static bool IsTextual(ColumnSchemaSnapshot column) =>
        NormalizeDataType(column.DataType) is "char" or "varchar" or "text" or "tinytext" or "mediumtext" or "longtext" or "enum" or "set";

    public static bool IsNumeric(ColumnSchemaSnapshot column) =>
        NormalizeDataType(column.DataType) is "tinyint" or "smallint" or "mediumint" or "int" or "bigint" or "decimal" or "numeric" or "float" or "double";

    public static bool IsUnsigned(ColumnSchemaSnapshot column) =>
        NormalizeColumnType(column.FullColumnType).Contains("unsigned", StringComparison.Ordinal);

    public static bool IsWideningChange(ColumnSchemaSnapshot source, ColumnSchemaSnapshot target)
    {
        var sourceType = NormalizeDataType(source.DataType);
        var targetType = NormalizeDataType(target.DataType);
        if (sourceType == "varchar" && targetType == "varchar")
        {
            return source.CharacterMaximumLength.HasValue &&
                   target.CharacterMaximumLength.HasValue &&
                   source.CharacterMaximumLength.Value > target.CharacterMaximumLength.Value;
        }

        if (sourceType == "bigint" && targetType == "int" && IsUnsigned(source) == IsUnsigned(target))
        {
            return true;
        }

        if (sourceType is "decimal" or "numeric" && targetType is "decimal" or "numeric" && IsUnsigned(source) == IsUnsigned(target))
        {
            return source.NumericPrecision.HasValue &&
                   target.NumericPrecision.HasValue &&
                   source.NumericScale == target.NumericScale &&
                   source.NumericPrecision.Value > target.NumericPrecision.Value;
        }

        return false;
    }

    public static string ToDisplayValue(ColumnSchemaSnapshot column)
    {
        var nullability = column.IsNullable ? "NULL" : "NOT NULL";
        var defaultPart = column.DefaultValue is null ? "DEFAULT <none>" : $"DEFAULT {column.DefaultValue}";
        return $"{NormalizeColumnType(column.FullColumnType)} {nullability} {defaultPart}".Trim();
    }

    public static string FormatValue(object? value)
    {
        if (value is null)
        {
            return "<null>";
        }

        return value switch
        {
            string text when text.Length == 0 => "<empty>",
            string text => text,
            bool boolean => boolean ? "true" : "false",
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? string.Empty
        };
    }
}
