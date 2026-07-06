namespace CroutApi.Services.SchemaSync;

internal sealed class SchemaComparer
{
    public SchemaComparisonResult Compare(DatabaseSchemaSnapshot source, DatabaseSchemaSnapshot target)
    {
        var differences = new List<SchemaDifference>();

        foreach (var sourceTable in source.Tables.Values.OrderBy(table => table.TableName, StringComparer.OrdinalIgnoreCase))
        {
            if (!target.Tables.TryGetValue(sourceTable.TableName, out var targetTable))
            {
                differences.Add(new SchemaDifference
                {
                    Category = SchemaDifferenceCategory.MissingTable,
                    TableName = sourceTable.TableName,
                    ObjectName = sourceTable.TableName,
                    SourceValue = DescribeTable(sourceTable),
                    TargetValue = "<missing>",
                    Explanation = "The target schema is missing a table that exists in the source schema.",
                    RecommendedAction = "Create the missing table in the target schema."
                });
                continue;
            }

            CompareTableDefinition(sourceTable, targetTable, differences);
            CompareColumns(sourceTable, targetTable, differences);
            ComparePrimaryKeys(sourceTable, targetTable, differences);
            CompareIndexes(sourceTable, targetTable, differences);
            CompareForeignKeys(sourceTable, targetTable, differences);
        }

        foreach (var targetTable in target.Tables.Values.OrderBy(table => table.TableName, StringComparer.OrdinalIgnoreCase))
        {
            if (source.Tables.ContainsKey(targetTable.TableName))
            {
                continue;
            }

            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ExtraTable,
                TableName = targetTable.TableName,
                ObjectName = targetTable.TableName,
                SourceValue = "<missing>",
                TargetValue = DescribeTable(targetTable),
                Explanation = "The target schema contains a table that is not present in the source schema.",
                RecommendedAction = "Review whether the extra table must be preserved manually or retired outside the auto-sync flow."
            });
        }

        return new SchemaComparisonResult
        {
            Source = source,
            Target = target,
            ComparedAtUtc = DateTimeOffset.UtcNow,
            Differences = differences
        };
    }

    private static void CompareTableDefinition(
        TableSchemaSnapshot sourceTable,
        TableSchemaSnapshot targetTable,
        ICollection<SchemaDifference> differences)
    {
        if (!string.Equals(sourceTable.TableType, targetTable.TableType, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(sourceTable.Engine, targetTable.Engine, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(sourceTable.Collation, targetTable.Collation, StringComparison.OrdinalIgnoreCase))
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.TableDefinitionMismatch,
                TableName = sourceTable.TableName,
                ObjectName = sourceTable.TableName,
                SourceValue = DescribeTable(sourceTable),
                TargetValue = DescribeTable(targetTable),
                Explanation = "The table type, engine, or collation differs between source and target.",
                RecommendedAction = "Review the table-level definition before syncing."
            });
        }
    }

    private static void CompareColumns(
        TableSchemaSnapshot sourceTable,
        TableSchemaSnapshot targetTable,
        ICollection<SchemaDifference> differences)
    {
        foreach (var sourceColumn in sourceTable.Columns.Values.OrderBy(column => column.OrdinalPosition))
        {
            if (!targetTable.Columns.TryGetValue(sourceColumn.ColumnName, out var targetColumn))
            {
                differences.Add(new SchemaDifference
                {
                    Category = SchemaDifferenceCategory.MissingColumn,
                    TableName = sourceTable.TableName,
                    ObjectName = sourceColumn.ColumnName,
                    SourceValue = SchemaSnapshotNormalizer.ToDisplayValue(sourceColumn),
                    TargetValue = "<missing>",
                    Explanation = "The target schema is missing a column that exists in the source schema.",
                    RecommendedAction = "Add the missing column to the target schema."
                });
                continue;
            }

            CompareColumnDefinition(sourceColumn, targetColumn, differences);
        }

        foreach (var targetColumn in targetTable.Columns.Values.OrderBy(column => column.OrdinalPosition))
        {
            if (sourceTable.Columns.ContainsKey(targetColumn.ColumnName))
            {
                continue;
            }

            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ExtraColumn,
                TableName = sourceTable.TableName,
                ObjectName = targetColumn.ColumnName,
                SourceValue = "<missing>",
                TargetValue = SchemaSnapshotNormalizer.ToDisplayValue(targetColumn),
                Explanation = "The target schema contains a column that is not present in the source schema.",
                RecommendedAction = "Review whether the extra column must be preserved or retired manually."
            });
        }
    }

    private static void CompareColumnDefinition(
        ColumnSchemaSnapshot sourceColumn,
        ColumnSchemaSnapshot targetColumn,
        ICollection<SchemaDifference> differences)
    {
        var sourceType = SchemaSnapshotNormalizer.NormalizeDataType(sourceColumn.DataType);
        var targetType = SchemaSnapshotNormalizer.NormalizeDataType(targetColumn.DataType);
        var sourceFullType = SchemaSnapshotNormalizer.NormalizeColumnType(sourceColumn.FullColumnType);
        var targetFullType = SchemaSnapshotNormalizer.NormalizeColumnType(targetColumn.FullColumnType);

        if (!string.Equals(sourceType, targetType, StringComparison.Ordinal) ||
            !string.Equals(sourceFullType, targetFullType, StringComparison.Ordinal))
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnTypeMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = sourceFullType,
                TargetValue = targetFullType,
                Explanation = "The column data type differs between source and target.",
                RecommendedAction = "Review whether the column can be widened safely or needs a manual data migration."
            });
        }

        if (sourceColumn.CharacterMaximumLength != targetColumn.CharacterMaximumLength)
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnLengthMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = SchemaSnapshotNormalizer.FormatValue(sourceColumn.CharacterMaximumLength),
                TargetValue = SchemaSnapshotNormalizer.FormatValue(targetColumn.CharacterMaximumLength),
                Explanation = "The column maximum length differs between source and target.",
                RecommendedAction = "Review whether the length change widens capacity safely or requires manual work."
            });
        }

        if (sourceColumn.NumericPrecision != targetColumn.NumericPrecision)
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnPrecisionMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = SchemaSnapshotNormalizer.FormatValue(sourceColumn.NumericPrecision),
                TargetValue = SchemaSnapshotNormalizer.FormatValue(targetColumn.NumericPrecision),
                Explanation = "The numeric precision differs between source and target.",
                RecommendedAction = "Review whether the precision change preserves existing data safely."
            });
        }

        if (sourceColumn.NumericScale != targetColumn.NumericScale)
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnScaleMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = SchemaSnapshotNormalizer.FormatValue(sourceColumn.NumericScale),
                TargetValue = SchemaSnapshotNormalizer.FormatValue(targetColumn.NumericScale),
                Explanation = "The numeric scale differs between source and target.",
                RecommendedAction = "Review whether the scale change can alter stored values."
            });
        }

        if (sourceColumn.IsNullable != targetColumn.IsNullable)
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnNullabilityMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = sourceColumn.IsNullable ? "NULL" : "NOT NULL",
                TargetValue = targetColumn.IsNullable ? "NULL" : "NOT NULL",
                Explanation = "The column nullability differs between source and target.",
                RecommendedAction = "Review whether existing target rows satisfy the intended nullability."
            });
        }

        var sourceDefault = SchemaSnapshotNormalizer.NormalizeDefaultValue(sourceColumn.DefaultValue);
        var targetDefault = SchemaSnapshotNormalizer.NormalizeDefaultValue(targetColumn.DefaultValue);
        if (!string.Equals(sourceDefault, targetDefault, StringComparison.Ordinal))
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnDefaultMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = sourceDefault ?? "<null>",
                TargetValue = targetDefault ?? "<null>",
                Explanation = "The column default differs between source and target.",
                RecommendedAction = "Review whether the default change alters runtime behavior or existing writes."
            });
        }

        if (SchemaSnapshotNormalizer.HasAutoIncrement(sourceColumn) != SchemaSnapshotNormalizer.HasAutoIncrement(targetColumn))
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnAutoIncrementMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = SchemaSnapshotNormalizer.HasAutoIncrement(sourceColumn) ? "auto_increment" : "<none>",
                TargetValue = SchemaSnapshotNormalizer.HasAutoIncrement(targetColumn) ? "auto_increment" : "<none>",
                Explanation = "The auto-increment behavior differs between source and target.",
                RecommendedAction = "Review auto-increment changes manually."
            });
        }

        if (!string.Equals(
                SchemaSnapshotNormalizer.NormalizeNullableString(sourceColumn.CharacterSet),
                SchemaSnapshotNormalizer.NormalizeNullableString(targetColumn.CharacterSet),
                StringComparison.OrdinalIgnoreCase))
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnCharacterSetMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = sourceColumn.CharacterSet ?? "<null>",
                TargetValue = targetColumn.CharacterSet ?? "<null>",
                Explanation = "The character set differs between source and target.",
                RecommendedAction = "Review whether the character set change affects stored text semantics."
            });
        }

        if (!string.Equals(
                SchemaSnapshotNormalizer.NormalizeNullableString(sourceColumn.Collation),
                SchemaSnapshotNormalizer.NormalizeNullableString(targetColumn.Collation),
                StringComparison.OrdinalIgnoreCase))
        {
            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ColumnCollationMismatch,
                TableName = sourceColumn.TableName,
                ObjectName = sourceColumn.ColumnName,
                SourceValue = sourceColumn.Collation ?? "<null>",
                TargetValue = targetColumn.Collation ?? "<null>",
                Explanation = "The collation differs between source and target.",
                RecommendedAction = "Review whether the collation change affects sorting or comparisons."
            });
        }
    }

    private static void ComparePrimaryKeys(
        TableSchemaSnapshot sourceTable,
        TableSchemaSnapshot targetTable,
        ICollection<SchemaDifference> differences)
    {
        var sourceColumns = sourceTable.PrimaryKey?.Columns ?? [];
        var targetColumns = targetTable.PrimaryKey?.Columns ?? [];
        if (sourceColumns.SequenceEqual(targetColumns, StringComparer.OrdinalIgnoreCase))
        {
            return;
        }

        differences.Add(new SchemaDifference
        {
            Category = SchemaDifferenceCategory.PrimaryKeyMismatch,
            TableName = sourceTable.TableName,
            ObjectName = "PRIMARY",
            SourceValue = string.Join(", ", sourceColumns),
            TargetValue = string.Join(", ", targetColumns),
            Explanation = "The primary key definition differs between source and target.",
            RecommendedAction = "Review primary key changes manually."
        });
    }

    private static void CompareIndexes(
        TableSchemaSnapshot sourceTable,
        TableSchemaSnapshot targetTable,
        ICollection<SchemaDifference> differences)
    {
        foreach (var sourceIndex in sourceTable.Indexes.Values.OrderBy(index => index.IndexName, StringComparer.OrdinalIgnoreCase))
        {
            if (!targetTable.Indexes.TryGetValue(sourceIndex.IndexName, out var targetIndex))
            {
                differences.Add(new SchemaDifference
                {
                    Category = sourceIndex.IsUnique
                        ? SchemaDifferenceCategory.MissingUniqueConstraint
                        : SchemaDifferenceCategory.MissingIndex,
                    TableName = sourceTable.TableName,
                    ObjectName = sourceIndex.IndexName,
                    SourceValue = DescribeIndex(sourceIndex),
                    TargetValue = "<missing>",
                    Explanation = sourceIndex.IsUnique
                        ? "The target schema is missing a unique constraint from the source schema."
                        : "The target schema is missing a non-unique index from the source schema.",
                    RecommendedAction = sourceIndex.IsUnique
                        ? "Review target data before adding the unique constraint."
                        : "Add the missing non-unique index to the target schema."
                });
                continue;
            }

            if (!IndexEquals(sourceIndex, targetIndex))
            {
                differences.Add(new SchemaDifference
                {
                    Category = SchemaDifferenceCategory.IndexDefinitionMismatch,
                    TableName = sourceTable.TableName,
                    ObjectName = sourceIndex.IndexName,
                    SourceValue = DescribeIndex(sourceIndex),
                    TargetValue = DescribeIndex(targetIndex),
                    Explanation = "The index definition differs between source and target.",
                    RecommendedAction = "Review index changes manually."
                });
            }
        }

        foreach (var targetIndex in targetTable.Indexes.Values.OrderBy(index => index.IndexName, StringComparer.OrdinalIgnoreCase))
        {
            if (sourceTable.Indexes.ContainsKey(targetIndex.IndexName))
            {
                continue;
            }

            differences.Add(new SchemaDifference
            {
                Category = targetIndex.IsUnique
                    ? SchemaDifferenceCategory.ExtraUniqueConstraint
                    : SchemaDifferenceCategory.ExtraIndex,
                TableName = sourceTable.TableName,
                ObjectName = targetIndex.IndexName,
                SourceValue = "<missing>",
                TargetValue = DescribeIndex(targetIndex),
                Explanation = targetIndex.IsUnique
                    ? "The target schema contains a unique constraint that is not present in the source schema."
                    : "The target schema contains a non-unique index that is not present in the source schema.",
                RecommendedAction = "Review whether the extra target index must be preserved or retired manually."
            });
        }
    }

    private static void CompareForeignKeys(
        TableSchemaSnapshot sourceTable,
        TableSchemaSnapshot targetTable,
        ICollection<SchemaDifference> differences)
    {
        foreach (var sourceForeignKey in sourceTable.ForeignKeys.Values.OrderBy(foreignKey => foreignKey.ConstraintName, StringComparer.OrdinalIgnoreCase))
        {
            if (!targetTable.ForeignKeys.TryGetValue(sourceForeignKey.ConstraintName, out var targetForeignKey))
            {
                differences.Add(new SchemaDifference
                {
                    Category = SchemaDifferenceCategory.MissingForeignKey,
                    TableName = sourceTable.TableName,
                    ObjectName = sourceForeignKey.ConstraintName,
                    SourceValue = DescribeForeignKey(sourceForeignKey),
                    TargetValue = "<missing>",
                    Explanation = "The target schema is missing a foreign key from the source schema.",
                    RecommendedAction = "Review target data before adding the foreign key."
                });
                continue;
            }

            if (!ForeignKeyEquals(sourceForeignKey, targetForeignKey))
            {
                differences.Add(new SchemaDifference
                {
                    Category = SchemaDifferenceCategory.ForeignKeyDefinitionMismatch,
                    TableName = sourceTable.TableName,
                    ObjectName = sourceForeignKey.ConstraintName,
                    SourceValue = DescribeForeignKey(sourceForeignKey),
                    TargetValue = DescribeForeignKey(targetForeignKey),
                    Explanation = "The foreign key definition differs between source and target.",
                    RecommendedAction = "Review foreign key changes manually."
                });
            }
        }

        foreach (var targetForeignKey in targetTable.ForeignKeys.Values.OrderBy(foreignKey => foreignKey.ConstraintName, StringComparer.OrdinalIgnoreCase))
        {
            if (sourceTable.ForeignKeys.ContainsKey(targetForeignKey.ConstraintName))
            {
                continue;
            }

            differences.Add(new SchemaDifference
            {
                Category = SchemaDifferenceCategory.ExtraForeignKey,
                TableName = sourceTable.TableName,
                ObjectName = targetForeignKey.ConstraintName,
                SourceValue = "<missing>",
                TargetValue = DescribeForeignKey(targetForeignKey),
                Explanation = "The target schema contains a foreign key that is not present in the source schema.",
                RecommendedAction = "Review whether the extra foreign key must be preserved or retired manually."
            });
        }
    }

    private static bool IndexEquals(IndexSchemaSnapshot source, IndexSchemaSnapshot target)
    {
        if (source.IsUnique != target.IsUnique ||
            !string.Equals(source.IndexType, target.IndexType, StringComparison.OrdinalIgnoreCase) ||
            source.Columns.Count != target.Columns.Count)
        {
            return false;
        }

        for (var index = 0; index < source.Columns.Count; index++)
        {
            var sourceColumn = source.Columns[index];
            var targetColumn = target.Columns[index];
            if (!string.Equals(sourceColumn.ColumnName, targetColumn.ColumnName, StringComparison.OrdinalIgnoreCase) ||
                sourceColumn.PrefixLength != targetColumn.PrefixLength ||
                sourceColumn.OrdinalPosition != targetColumn.OrdinalPosition)
            {
                return false;
            }
        }

        return true;
    }

    private static bool ForeignKeyEquals(ForeignKeySchemaSnapshot source, ForeignKeySchemaSnapshot target) =>
        string.Equals(source.ReferencedTableName, target.ReferencedTableName, StringComparison.OrdinalIgnoreCase) &&
        source.Columns.SequenceEqual(target.Columns, StringComparer.OrdinalIgnoreCase) &&
        source.ReferencedColumns.SequenceEqual(target.ReferencedColumns, StringComparer.OrdinalIgnoreCase) &&
        string.Equals(source.UpdateRule, target.UpdateRule, StringComparison.OrdinalIgnoreCase) &&
        string.Equals(source.DeleteRule, target.DeleteRule, StringComparison.OrdinalIgnoreCase);

    private static string DescribeTable(TableSchemaSnapshot table) =>
        $"{table.TableType}; Engine={table.Engine ?? "<null>"}; Collation={table.Collation ?? "<null>"}";

    private static string DescribeIndex(IndexSchemaSnapshot index)
    {
        var columns = index.Columns
            .OrderBy(column => column.OrdinalPosition)
            .Select(column => column.PrefixLength.HasValue
                ? $"{column.ColumnName}({column.PrefixLength.Value})"
                : column.ColumnName);
        return $"{(index.IsUnique ? "UNIQUE" : "INDEX")} [{string.Join(", ", columns)}]";
    }

    private static string DescribeForeignKey(ForeignKeySchemaSnapshot foreignKey) =>
        $"({string.Join(", ", foreignKey.Columns)}) -> {foreignKey.ReferencedTableName} ({string.Join(", ", foreignKey.ReferencedColumns)}) ON UPDATE {foreignKey.UpdateRule} ON DELETE {foreignKey.DeleteRule}";
}
