using System.Reflection;
using CroutApi.Services.SchemaSync;
using Xunit;

namespace CroutApi.Tests;

public class SchemaSyncTests
{
    private readonly SchemaComparer _comparer = new();
    private readonly SchemaSafetyClassifier _classifier = new();
    private readonly SchemaSqlGenerator _sqlGenerator = new();

    [Fact]
    public void Compare_IgnoresEquivalentTypeAndDefaultFormatting()
    {
        var source = Snapshot(Table("users", columns:
        [
            Column("users", "created_at", 1, "timestamp", "TIMESTAMP", isNullable: false, defaultValue: "CURRENT_TIMESTAMP")
        ]));
        var target = Snapshot(Table("users", columns:
        [
            Column("users", "created_at", 1, "timestamp", "timestamp", isNullable: false, defaultValue: "current_timestamp()")
        ]));

        var comparison = _comparer.Compare(source, target);

        Assert.DoesNotContain(comparison.Differences, item =>
            item.Category is SchemaDifferenceCategory.ColumnTypeMismatch or SchemaDifferenceCategory.ColumnDefaultMismatch);
    }

    [Fact]
    public void Compare_DetectsMissingAndExtraTables()
    {
        var source = Snapshot(Table("users"));
        var target = Snapshot(Table("audit_log"));

        var comparison = Classify(_comparer.Compare(source, target));

        Assert.Contains(comparison.Differences, item => item.Category == SchemaDifferenceCategory.MissingTable);
        Assert.Contains(comparison.Differences, item =>
            item.Category == SchemaDifferenceCategory.ExtraTable &&
            item.Severity == SchemaDifferenceSeverity.DestructiveBlocked);
    }

    [Fact]
    public void Compare_DetectsMissingAndExtraColumns()
    {
        var source = Snapshot(Table("users", columns:
        [
            Column("users", "id", 1, "int", "int", isNullable: false),
            Column("users", "nickname", 2, "varchar", "varchar(255)")
        ]));
        var target = Snapshot(Table("users", columns:
        [
            Column("users", "id", 1, "int", "int", isNullable: false),
            Column("users", "legacy_code", 2, "varchar", "varchar(50)")
        ]));

        var comparison = Classify(_comparer.Compare(source, target));

        Assert.Contains(comparison.Differences, item =>
            item.Category == SchemaDifferenceCategory.MissingColumn &&
            item.ObjectName == "nickname");
        Assert.Contains(comparison.Differences, item =>
            item.Category == SchemaDifferenceCategory.ExtraColumn &&
            item.ObjectName == "legacy_code" &&
            item.Severity == SchemaDifferenceSeverity.DestructiveBlocked);
    }

    [Fact]
    public void Classifier_AllowsSafeVarcharWideningButBlocksShrinksAndNumericNarrowing()
    {
        var wideningSource = Snapshot(Table("users", columns:
        [
            Column("users", "nickname", 1, "varchar", "varchar(255)")
        ]));
        var wideningTarget = Snapshot(Table("users", columns:
        [
            Column("users", "nickname", 1, "varchar", "varchar(100)")
        ]));

        var widening = Classify(_comparer.Compare(wideningSource, wideningTarget));
        Assert.Contains(widening.Differences, item =>
            item.ObjectName == "nickname" &&
            item.Severity == SchemaDifferenceSeverity.SafeAutoApply &&
            item.CanGenerateSql);

        var shrinkingSource = Snapshot(Table("users", columns:
        [
            Column("users", "nickname", 1, "varchar", "varchar(100)")
        ]));
        var shrinkingTarget = Snapshot(Table("users", columns:
        [
            Column("users", "nickname", 1, "varchar", "varchar(255)")
        ]));

        var shrinking = Classify(_comparer.Compare(shrinkingSource, shrinkingTarget));
        Assert.Contains(shrinking.Differences, item =>
            item.ObjectName == "nickname" &&
            item.Severity == SchemaDifferenceSeverity.DestructiveBlocked);

        var numericSource = Snapshot(Table("orders", columns:
        [
            Column("orders", "quantity", 1, "int", "int")
        ]));
        var numericTarget = Snapshot(Table("orders", columns:
        [
            Column("orders", "quantity", 1, "bigint", "bigint")
        ]));

        var numeric = Classify(_comparer.Compare(numericSource, numericTarget));
        Assert.Contains(numeric.Differences, item =>
            item.ObjectName == "quantity" &&
            item.Severity == SchemaDifferenceSeverity.DestructiveBlocked);
    }

    [Fact]
    public void Classifier_DoesNotAutoGenerateNullableToNotNullChanges()
    {
        var source = Snapshot(Table("users", columns:
        [
            Column("users", "nickname", 1, "varchar", "varchar(255)", isNullable: false)
        ]));
        var target = Snapshot(Table("users", columns:
        [
            Column("users", "nickname", 1, "varchar", "varchar(255)", isNullable: true)
        ]));

        var comparison = Classify(_comparer.Compare(source, target));
        var sql = _sqlGenerator.GeneratePlanSql(comparison);

        Assert.Contains(comparison.Differences, item =>
            item.Category == SchemaDifferenceCategory.ColumnNullabilityMismatch &&
            item.Severity == SchemaDifferenceSeverity.RequiresDataMigration &&
            !item.CanGenerateSql);
        Assert.DoesNotContain("nickname", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Compare_DetectsIndexAndForeignKeyDifferences()
    {
        var sourceTable = Table(
            "users",
            columns:
            [
                Column("users", "company_id", 1, "int", "int"),
                Column("users", "email", 2, "varchar", "varchar(255)")
            ],
            indexes:
            [
                Index("users", "ix_users_company_email", false, [("company_id", null), ("email", 20)])
            ],
            foreignKeys:
            [
                ForeignKey("users", "fk_users_company", ["company_id"], "companies", ["id"])
            ]);

        var targetTable = Table(
            "users",
            columns:
            [
                Column("users", "company_id", 1, "int", "int"),
                Column("users", "email", 2, "varchar", "varchar(255)")
            ],
            indexes:
            [
                Index("users", "ix_users_company_email", false, [("email", 20), ("company_id", null)])
            ],
            foreignKeys:
            [
                ForeignKey("users", "fk_users_company", ["company_id"], "organisations", ["id"])
            ]);

        var missingForeignKeyComparison = Classify(_comparer.Compare(
            Snapshot(sourceTable),
            Snapshot(Table("users", columns: targetTable.Columns.Values.ToArray(), indexes: targetTable.Indexes.Values.ToArray()))));
        Assert.Contains(missingForeignKeyComparison.Differences, item =>
            item.Category == SchemaDifferenceCategory.MissingForeignKey);

        var mismatchComparison = Classify(_comparer.Compare(Snapshot(sourceTable), Snapshot(targetTable)));
        Assert.Contains(mismatchComparison.Differences, item => item.Category == SchemaDifferenceCategory.IndexDefinitionMismatch);
        Assert.Contains(mismatchComparison.Differences, item => item.Category == SchemaDifferenceCategory.ForeignKeyDefinitionMismatch);
    }

    [Fact]
    public void Classifier_BlocksPrimaryKeyMismatches()
    {
        var source = Snapshot(Table("users", primaryKey: ["id"]));
        var target = Snapshot(Table("users", primaryKey: ["tenant_id", "id"]));

        var comparison = Classify(_comparer.Compare(source, target));

        Assert.Contains(comparison.Differences, item =>
            item.Category == SchemaDifferenceCategory.PrimaryKeyMismatch &&
            item.Severity == SchemaDifferenceSeverity.DestructiveBlocked);
    }

    [Fact]
    public void SqlGenerator_OnlyIncludesSafeDifferences()
    {
        var source = Snapshot(
            Table("accounts", columns:
            [
                Column("accounts", "id", 1, "int", "int", isNullable: false),
                Column("accounts", "notes", 2, "varchar", "varchar(255)"),
                Column("accounts", "nickname", 3, "varchar", "varchar(255)")
            ],
            indexes:
            [
                Index("accounts", "ix_accounts_notes", false, [("notes", null)])
            ]),
            Table("new_table"));

        var target = Snapshot(Table("accounts", columns:
        [
            Column("accounts", "id", 1, "int", "int", isNullable: false),
            Column("accounts", "notes", 2, "varchar", "varchar(100)", isNullable: false)
        ]));

        source.Tables["new_table"].CreateStatement = "CREATE TABLE `new_table` (\n  `id` int NOT NULL\n) ENGINE=InnoDB";

        var comparison = Classify(_comparer.Compare(source, target));
        var sql = _sqlGenerator.GeneratePlanSql(comparison);

        Assert.Contains("CREATE TABLE `new_table`", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ADD COLUMN `nickname`", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ADD INDEX `ix_accounts_notes`", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("MODIFY COLUMN `notes`", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GeneratedMigrationFileName_FollowsNumberedConvention()
    {
        var tempDirectory = Directory.CreateTempSubdirectory();
        try
        {
            File.WriteAllText(Path.Combine(tempDirectory.FullName, "01_schema.sql"), "-- test");
            File.WriteAllText(Path.Combine(tempDirectory.FullName, "16_seed.sql"), "-- test");

            var method = typeof(SchemaSyncPlanService).GetMethod(
                "GetNextMigrationFileName",
                BindingFlags.NonPublic | BindingFlags.Static);

            Assert.NotNull(method);
            var fileName = Assert.IsType<string>(method!.Invoke(null, [tempDirectory.FullName]));

            Assert.Matches(@"^17_schema_sync_\d{14}\.sql$", fileName);
        }
        finally
        {
            tempDirectory.Delete(recursive: true);
        }
    }

    private SchemaComparisonResult Classify(SchemaComparisonResult comparison)
    {
        _classifier.Classify(comparison);
        return comparison;
    }

    private static DatabaseSchemaSnapshot Snapshot(params TableSchemaSnapshot[] tables) =>
        new()
        {
            DatabaseName = "test_db",
            Tables = tables.ToDictionary(table => table.TableName, StringComparer.OrdinalIgnoreCase)
        };

    private static TableSchemaSnapshot Table(
        string name,
        ColumnSchemaSnapshot[]? columns = null,
        string[]? primaryKey = null,
        IndexSchemaSnapshot[]? indexes = null,
        ForeignKeySchemaSnapshot[]? foreignKeys = null)
    {
        var table = new TableSchemaSnapshot
        {
            TableName = name,
            TableType = "BASE TABLE",
            Engine = "InnoDB",
            Collation = "utf8mb4_general_ci",
            Columns = (columns ?? [])
                .ToDictionary(column => column.ColumnName, StringComparer.OrdinalIgnoreCase),
            Indexes = (indexes ?? [])
                .ToDictionary(index => index.IndexName, StringComparer.OrdinalIgnoreCase),
            ForeignKeys = (foreignKeys ?? [])
                .ToDictionary(foreignKey => foreignKey.ConstraintName, StringComparer.OrdinalIgnoreCase)
        };

        if (primaryKey is not null)
        {
            table.PrimaryKey = new PrimaryKeySchemaSnapshot
            {
                Columns = [.. primaryKey]
            };
        }

        return table;
    }

    private static ColumnSchemaSnapshot Column(
        string tableName,
        string name,
        int ordinalPosition,
        string dataType,
        string fullColumnType,
        bool isNullable = true,
        string? defaultValue = null) =>
        new()
        {
            TableName = tableName,
            ColumnName = name,
            OrdinalPosition = ordinalPosition,
            DataType = dataType,
            FullColumnType = fullColumnType,
            CharacterMaximumLength = fullColumnType.StartsWith("varchar(", StringComparison.OrdinalIgnoreCase)
                ? int.Parse(fullColumnType[8..^1])
                : null,
            NumericPrecision = dataType switch
            {
                "decimal" => 10,
                "numeric" => 10,
                _ => null
            },
            NumericScale = dataType switch
            {
                "decimal" => 2,
                "numeric" => 2,
                _ => null
            },
            IsNullable = isNullable,
            DefaultValue = defaultValue
        };

    private static IndexSchemaSnapshot Index(string tableName, string name, bool isUnique, (string ColumnName, int? PrefixLength)[] columns) =>
        new()
        {
            TableName = tableName,
            IndexName = name,
            IsUnique = isUnique,
            IndexType = "BTREE",
            Columns = columns
                .Select((column, index) => new IndexColumnSchemaSnapshot
                {
                    ColumnName = column.ColumnName,
                    OrdinalPosition = index + 1,
                    PrefixLength = column.PrefixLength
                })
                .ToList()
        };

    private static ForeignKeySchemaSnapshot ForeignKey(
        string tableName,
        string name,
        string[] columns,
        string referencedTable,
        string[] referencedColumns) =>
        new()
        {
            TableName = tableName,
            ConstraintName = name,
            Columns = [.. columns],
            ReferencedTableName = referencedTable,
            ReferencedColumns = [.. referencedColumns],
            UpdateRule = "RESTRICT",
            DeleteRule = "RESTRICT"
        };
}
