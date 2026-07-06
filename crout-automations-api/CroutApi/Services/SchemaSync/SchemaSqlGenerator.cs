using System.Text;
using System.Text.RegularExpressions;

namespace CroutApi.Services.SchemaSync;

internal sealed class SchemaSqlGenerator
{
    public string GeneratePlanSql(SchemaComparisonResult comparison)
    {
        var statements = new List<string>();
        foreach (var difference in comparison.Differences.Where(item => item.CanGenerateSql))
        {
            var sql = GenerateDifferenceSql(comparison.Source, comparison.Target, difference);
            if (string.IsNullOrWhiteSpace(sql))
            {
                continue;
            }

            difference.GeneratedSql = sql;
            statements.Add(sql);
        }

        return string.Join(Environment.NewLine + Environment.NewLine, statements);
    }

    private static string? GenerateDifferenceSql(
        DatabaseSchemaSnapshot source,
        DatabaseSchemaSnapshot target,
        SchemaDifference difference)
    {
        return difference.Category switch
        {
            SchemaDifferenceCategory.MissingTable => GenerateCreateTableSql(source, difference),
            SchemaDifferenceCategory.MissingColumn => GenerateAddColumnSql(source, difference),
            SchemaDifferenceCategory.MissingIndex => GenerateAddIndexSql(source, difference),
            SchemaDifferenceCategory.ColumnTypeMismatch or
            SchemaDifferenceCategory.ColumnLengthMismatch or
            SchemaDifferenceCategory.ColumnPrecisionMismatch or
            SchemaDifferenceCategory.ColumnScaleMismatch => GenerateAlterColumnSql(source, target, difference),
            _ => null
        };
    }

    private static string GenerateCreateTableSql(DatabaseSchemaSnapshot source, SchemaDifference difference)
    {
        var table = source.Tables[difference.TableName];
        if (string.IsNullOrWhiteSpace(table.CreateStatement))
        {
            throw new InvalidOperationException($"Create statement for table '{table.TableName}' is not available.");
        }

        return $"-- SafeAutoApply: create missing table `{table.TableName}`{Environment.NewLine}{table.CreateStatement.TrimEnd()};";
    }

    private static string GenerateAddColumnSql(DatabaseSchemaSnapshot source, SchemaDifference difference)
    {
        var table = source.Tables[difference.TableName];
        var column = table.Columns[difference.ObjectName!];
        return
            $"-- SafeAutoApply: add missing nullable column `{column.ColumnName}` to `{table.TableName}`{Environment.NewLine}" +
            $"ALTER TABLE {QuoteIdentifier(table.TableName)} ADD COLUMN {BuildColumnDefinition(column)};";
    }

    private static string GenerateAddIndexSql(DatabaseSchemaSnapshot source, SchemaDifference difference)
    {
        var table = source.Tables[difference.TableName];
        var index = table.Indexes[difference.ObjectName!];
        var kind = index.IsUnique ? "UNIQUE INDEX" : "INDEX";
        var columns = string.Join(", ", index.Columns
            .OrderBy(column => column.OrdinalPosition)
            .Select(column => column.PrefixLength.HasValue
                ? $"{QuoteIdentifier(column.ColumnName)}({column.PrefixLength.Value})"
                : QuoteIdentifier(column.ColumnName)));

        return
            $"-- SafeAutoApply: add missing index `{index.IndexName}` on `{table.TableName}`{Environment.NewLine}" +
            $"ALTER TABLE {QuoteIdentifier(table.TableName)} ADD {kind} {QuoteIdentifier(index.IndexName)} ({columns});";
    }

    private static string GenerateAlterColumnSql(
        DatabaseSchemaSnapshot source,
        DatabaseSchemaSnapshot target,
        SchemaDifference difference)
    {
        var sourceColumn = source.Tables[difference.TableName].Columns[difference.ObjectName!];
        var targetColumn = target.Tables[difference.TableName].Columns[difference.ObjectName!];
        if (!SchemaSnapshotNormalizer.IsWideningChange(sourceColumn, targetColumn))
        {
            return string.Empty;
        }

        return
            $"-- SafeAutoApply: widen column `{sourceColumn.ColumnName}` on `{sourceColumn.TableName}`{Environment.NewLine}" +
            $"ALTER TABLE {QuoteIdentifier(sourceColumn.TableName)} MODIFY COLUMN {BuildColumnDefinition(sourceColumn)};";
    }

    private static string BuildColumnDefinition(ColumnSchemaSnapshot column)
    {
        var builder = new StringBuilder();
        builder.Append(QuoteIdentifier(column.ColumnName));
        builder.Append(' ');
        builder.Append(column.FullColumnType);

        if (SchemaSnapshotNormalizer.IsTextual(column))
        {
            if (!string.IsNullOrWhiteSpace(column.CharacterSet))
            {
                builder.Append(" CHARACTER SET ");
                builder.Append(column.CharacterSet);
            }

            if (!string.IsNullOrWhiteSpace(column.Collation))
            {
                builder.Append(" COLLATE ");
                builder.Append(column.Collation);
            }
        }

        builder.Append(column.IsNullable ? " NULL" : " NOT NULL");

        if (column.DefaultValue is not null)
        {
            builder.Append(" DEFAULT ");
            builder.Append(FormatDefaultValue(column.DefaultValue));
        }

        var extra = SchemaSnapshotNormalizer.NormalizeNullableString(column.Extra);
        if (!string.IsNullOrWhiteSpace(extra))
        {
            builder.Append(' ');
            builder.Append(extra);
        }

        if (!string.IsNullOrWhiteSpace(column.Comment))
        {
            builder.Append(" COMMENT ");
            builder.Append(QuoteLiteral(column.Comment));
        }

        return builder.ToString();
    }

    private static string FormatDefaultValue(string rawValue)
    {
        var normalized = SchemaSnapshotNormalizer.NormalizeDefaultValue(rawValue) ?? rawValue.Trim();
        if (Regex.IsMatch(normalized, @"^current_timestamp(\(\d+\))?$", RegexOptions.IgnoreCase))
        {
            return normalized.ToUpperInvariant();
        }

        if (Regex.IsMatch(normalized, @"^-?\d+(\.\d+)?$"))
        {
            return normalized;
        }

        if (string.Equals(normalized, "null", StringComparison.OrdinalIgnoreCase))
        {
            return "NULL";
        }

        return QuoteLiteral(rawValue);
    }

    private static string QuoteIdentifier(string identifier) => $"`{identifier.Replace("`", "``", StringComparison.Ordinal)}`";

    private static string QuoteLiteral(string value) => $"'{value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("'", "''", StringComparison.Ordinal)}'";
}
