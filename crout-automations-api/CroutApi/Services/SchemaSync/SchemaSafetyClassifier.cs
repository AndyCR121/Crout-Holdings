namespace CroutApi.Services.SchemaSync;

internal sealed class SchemaSafetyClassifier
{
    public void Classify(SchemaComparisonResult comparison)
    {
        foreach (var difference in comparison.Differences)
        {
            ClassifyDifference(comparison.Source, comparison.Target, difference);
        }
    }

    private static void ClassifyDifference(
        DatabaseSchemaSnapshot source,
        DatabaseSchemaSnapshot target,
        SchemaDifference difference)
    {
        switch (difference.Category)
        {
            case SchemaDifferenceCategory.MissingTable:
                difference.Severity = SchemaDifferenceSeverity.SafeAutoApply;
                difference.CanGenerateSql = true;
                break;

            case SchemaDifferenceCategory.ExtraTable:
            case SchemaDifferenceCategory.ExtraColumn:
            case SchemaDifferenceCategory.ExtraIndex:
            case SchemaDifferenceCategory.ExtraUniqueConstraint:
            case SchemaDifferenceCategory.ExtraForeignKey:
            case SchemaDifferenceCategory.PrimaryKeyMismatch:
                difference.Severity = SchemaDifferenceSeverity.DestructiveBlocked;
                difference.CanGenerateSql = false;
                break;

            case SchemaDifferenceCategory.MissingColumn:
                difference.Severity = IsSafeMissingColumn(source, target, difference)
                    ? SchemaDifferenceSeverity.SafeAutoApply
                    : SchemaDifferenceSeverity.RequiresDataMigration;
                difference.CanGenerateSql = difference.Severity == SchemaDifferenceSeverity.SafeAutoApply;
                if (!difference.CanGenerateSql)
                {
                    difference.RecommendedAction = "Review existing target rows before adding this column. Only nullable additions are auto-generated.";
                }
                break;

            case SchemaDifferenceCategory.MissingIndex:
                difference.Severity = SchemaDifferenceSeverity.SafeAutoApply;
                difference.CanGenerateSql = true;
                break;

            case SchemaDifferenceCategory.MissingUniqueConstraint:
            case SchemaDifferenceCategory.MissingForeignKey:
                difference.Severity = SchemaDifferenceSeverity.RequiresDataMigration;
                difference.CanGenerateSql = false;
                difference.RecommendedAction = "Preflight the target data before adding this constraint.";
                break;

            case SchemaDifferenceCategory.ColumnTypeMismatch:
            case SchemaDifferenceCategory.ColumnLengthMismatch:
            case SchemaDifferenceCategory.ColumnPrecisionMismatch:
            case SchemaDifferenceCategory.ColumnScaleMismatch:
                difference.Severity = IsSafeWideningChange(source, target, difference)
                    ? SchemaDifferenceSeverity.SafeAutoApply
                    : SchemaDifferenceSeverity.DestructiveBlocked;
                difference.CanGenerateSql = difference.Severity == SchemaDifferenceSeverity.SafeAutoApply;
                break;

            case SchemaDifferenceCategory.ColumnNullabilityMismatch:
                difference.Severity = SchemaDifferenceSeverity.RequiresDataMigration;
                difference.CanGenerateSql = false;
                difference.RecommendedAction = "Review and remediate target rows before changing nullability.";
                break;

            case SchemaDifferenceCategory.ColumnDefaultMismatch:
            case SchemaDifferenceCategory.ColumnAutoIncrementMismatch:
            case SchemaDifferenceCategory.ColumnCharacterSetMismatch:
            case SchemaDifferenceCategory.ColumnCollationMismatch:
            case SchemaDifferenceCategory.TableDefinitionMismatch:
            case SchemaDifferenceCategory.IndexDefinitionMismatch:
            case SchemaDifferenceCategory.ForeignKeyDefinitionMismatch:
            case SchemaDifferenceCategory.UnknownOrUnsupported:
            default:
                difference.Severity = SchemaDifferenceSeverity.ManualReviewRequired;
                difference.CanGenerateSql = false;
                break;
        }
    }

    private static bool IsSafeMissingColumn(
        DatabaseSchemaSnapshot source,
        DatabaseSchemaSnapshot target,
        SchemaDifference difference)
    {
        if (!source.Tables.TryGetValue(difference.TableName, out var sourceTable) ||
            !target.Tables.TryGetValue(difference.TableName, out _ ) ||
            difference.ObjectName is null ||
            !sourceTable.Columns.TryGetValue(difference.ObjectName, out var sourceColumn))
        {
            return false;
        }

        if (!sourceColumn.IsNullable)
        {
            return false;
        }

        return !SchemaSnapshotNormalizer.HasAutoIncrement(sourceColumn);
    }

    private static bool IsSafeWideningChange(
        DatabaseSchemaSnapshot source,
        DatabaseSchemaSnapshot target,
        SchemaDifference difference)
    {
        if (!source.Tables.TryGetValue(difference.TableName, out var sourceTable) ||
            !target.Tables.TryGetValue(difference.TableName, out var targetTable) ||
            difference.ObjectName is null ||
            !sourceTable.Columns.TryGetValue(difference.ObjectName, out var sourceColumn) ||
            !targetTable.Columns.TryGetValue(difference.ObjectName, out var targetColumn))
        {
            return false;
        }

        if (sourceColumn.IsNullable != targetColumn.IsNullable)
        {
            return false;
        }

        if (SchemaSnapshotNormalizer.NormalizeDefaultValue(sourceColumn.DefaultValue) !=
            SchemaSnapshotNormalizer.NormalizeDefaultValue(targetColumn.DefaultValue))
        {
            return false;
        }

        if (SchemaSnapshotNormalizer.HasAutoIncrement(sourceColumn) != SchemaSnapshotNormalizer.HasAutoIncrement(targetColumn))
        {
            return false;
        }

        if (!string.Equals(sourceColumn.CharacterSet, targetColumn.CharacterSet, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(sourceColumn.Collation, targetColumn.Collation, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return SchemaSnapshotNormalizer.IsWideningChange(sourceColumn, targetColumn);
    }
}
