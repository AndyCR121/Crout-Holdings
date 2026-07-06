using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

namespace CroutApi.Services.SchemaSync;

internal sealed class SchemaMetadataReader
{
    private static readonly HashSet<string> SystemSchemas = new(StringComparer.OrdinalIgnoreCase)
    {
        "mysql",
        "information_schema",
        "performance_schema",
        "sys"
    };

    public async Task<DatabaseSchemaSnapshot> ReadAsync(
        MySqlConnection connection,
        string databaseName,
        CancellationToken cancellationToken)
    {
        if (SystemSchemas.Contains(databaseName))
        {
            throw new ArgumentException("System schemas are not supported for schema sync.");
        }

        var command = new CommandDefinition(
            """
            SELECT table_name, table_type, engine, table_collation
            FROM information_schema.tables
            WHERE table_schema = @databaseName
            ORDER BY table_name
            """,
            new { databaseName },
            cancellationToken: cancellationToken);

        var tables = (await connection.QueryAsync<TableRow>(command))
            .ToDictionary(
                row => row.table_name,
                row => new TableSchemaSnapshot
                {
                    TableName = row.table_name,
                    TableType = row.table_type,
                    Engine = row.engine,
                    Collation = row.table_collation
                },
                StringComparer.OrdinalIgnoreCase);

        await LoadColumnsAsync(connection, databaseName, tables, cancellationToken);
        await LoadIndexesAsync(connection, databaseName, tables, cancellationToken);
        await LoadForeignKeysAsync(connection, databaseName, tables, cancellationToken);
        await LoadCreateStatementsAsync(connection, tables.Values, cancellationToken);

        return new DatabaseSchemaSnapshot
        {
            DatabaseName = databaseName,
            Tables = tables
        };
    }

    private static async Task LoadColumnsAsync(
        MySqlConnection connection,
        string databaseName,
        Dictionary<string, TableSchemaSnapshot> tables,
        CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(
            """
            SELECT table_name,
                   column_name,
                   ordinal_position,
                   data_type,
                   column_type,
                   character_maximum_length,
                   numeric_precision,
                   numeric_scale,
                   datetime_precision,
                   is_nullable,
                   column_default,
                   extra,
                   character_set_name,
                   collation_name,
                   column_comment
            FROM information_schema.columns
            WHERE table_schema = @databaseName
            ORDER BY table_name, ordinal_position
            """,
            new { databaseName },
            cancellationToken: cancellationToken);

        foreach (var row in await connection.QueryAsync<ColumnRow>(command))
        {
            if (!tables.TryGetValue(row.table_name, out var table))
            {
                continue;
            }

            var column = new ColumnSchemaSnapshot
            {
                TableName = row.table_name,
                ColumnName = row.column_name,
                OrdinalPosition = row.ordinal_position,
                DataType = row.data_type,
                FullColumnType = row.column_type,
                CharacterMaximumLength = row.character_maximum_length,
                NumericPrecision = row.numeric_precision,
                NumericScale = row.numeric_scale,
                DateTimePrecision = row.datetime_precision,
                IsNullable = string.Equals(row.is_nullable, "YES", StringComparison.OrdinalIgnoreCase),
                DefaultValue = row.column_default,
                Extra = row.extra,
                CharacterSet = row.character_set_name,
                Collation = row.collation_name,
                Comment = row.column_comment
            };

            table.Columns[column.ColumnName] = column;
        }
    }

    private static async Task LoadIndexesAsync(
        MySqlConnection connection,
        string databaseName,
        Dictionary<string, TableSchemaSnapshot> tables,
        CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(
            """
            SELECT table_name,
                   index_name,
                   non_unique,
                   index_type,
                   seq_in_index,
                   column_name,
                   sub_part
            FROM information_schema.statistics
            WHERE table_schema = @databaseName
            ORDER BY table_name, index_name, seq_in_index
            """,
            new { databaseName },
            cancellationToken: cancellationToken);

        foreach (var row in await connection.QueryAsync<IndexRow>(command))
        {
            if (!tables.TryGetValue(row.table_name, out var table))
            {
                continue;
            }

            if (!table.Indexes.TryGetValue(row.index_name, out var index))
            {
                index = new IndexSchemaSnapshot
                {
                    TableName = row.table_name,
                    IndexName = row.index_name,
                    IsUnique = row.non_unique == 0,
                    IsPrimary = string.Equals(row.index_name, "PRIMARY", StringComparison.OrdinalIgnoreCase),
                    IndexType = row.index_type
                };
                table.Indexes[row.index_name] = index;
            }

            index.Columns.Add(new IndexColumnSchemaSnapshot
            {
                ColumnName = row.column_name,
                OrdinalPosition = row.seq_in_index,
                PrefixLength = row.sub_part
            });
        }

        foreach (var table in tables.Values)
        {
            var primary = table.Indexes.Values.FirstOrDefault(index => index.IsPrimary);
            if (primary is null)
            {
                continue;
            }

            table.PrimaryKey = new PrimaryKeySchemaSnapshot
            {
                Columns = primary.Columns
                    .OrderBy(column => column.OrdinalPosition)
                    .Select(column => column.ColumnName)
                    .ToList()
            };

            table.Indexes.Remove(primary.IndexName);
        }
    }

    private static async Task LoadForeignKeysAsync(
        MySqlConnection connection,
        string databaseName,
        Dictionary<string, TableSchemaSnapshot> tables,
        CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(
            """
            SELECT kcu.table_name,
                   kcu.constraint_name,
                   kcu.ordinal_position,
                   kcu.column_name,
                   kcu.referenced_table_name,
                   kcu.referenced_column_name,
                   rc.update_rule,
                   rc.delete_rule
            FROM information_schema.key_column_usage kcu
            JOIN information_schema.referential_constraints rc
              ON rc.constraint_schema = kcu.constraint_schema
             AND rc.table_name = kcu.table_name
             AND rc.constraint_name = kcu.constraint_name
            WHERE kcu.table_schema = @databaseName
              AND kcu.referenced_table_name IS NOT NULL
            ORDER BY kcu.table_name, kcu.constraint_name, kcu.ordinal_position
            """,
            new { databaseName },
            cancellationToken: cancellationToken);

        foreach (var row in await connection.QueryAsync<ForeignKeyRow>(command))
        {
            if (!tables.TryGetValue(row.table_name, out var table))
            {
                continue;
            }

            if (!table.ForeignKeys.TryGetValue(row.constraint_name, out var foreignKey))
            {
                foreignKey = new ForeignKeySchemaSnapshot
                {
                    TableName = row.table_name,
                    ConstraintName = row.constraint_name,
                    ReferencedTableName = row.referenced_table_name,
                    UpdateRule = row.update_rule,
                    DeleteRule = row.delete_rule
                };
                table.ForeignKeys[row.constraint_name] = foreignKey;
            }

            foreignKey.Columns.Add(row.column_name);
            foreignKey.ReferencedColumns.Add(row.referenced_column_name);
        }
    }

    private static async Task LoadCreateStatementsAsync(
        MySqlConnection connection,
        IEnumerable<TableSchemaSnapshot> tables,
        CancellationToken cancellationToken)
    {
        foreach (var table in tables.Where(table => string.Equals(table.TableType, "BASE TABLE", StringComparison.OrdinalIgnoreCase)))
        {
            await using var command = new MySqlCommand($"SHOW CREATE TABLE {QuoteIdentifier(table.TableName)}", connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                var createStatement = reader.GetString(1);
                table.CreateStatement = Regex.Replace(createStatement, @"\sAUTO_INCREMENT=\d+", string.Empty, RegexOptions.IgnoreCase);
            }
        }
    }

    private static string QuoteIdentifier(string identifier) => $"`{identifier.Replace("`", "``", StringComparison.Ordinal)}`";

    private sealed class TableRow
    {
        public string table_name { get; set; } = string.Empty;
        public string table_type { get; set; } = string.Empty;
        public string? engine { get; set; }
        public string? table_collation { get; set; }
    }

    private sealed class ColumnRow
    {
        public string table_name { get; set; } = string.Empty;
        public string column_name { get; set; } = string.Empty;
        public int ordinal_position { get; set; }
        public string data_type { get; set; } = string.Empty;
        public string column_type { get; set; } = string.Empty;
        public long? character_maximum_length { get; set; }
        public int? numeric_precision { get; set; }
        public int? numeric_scale { get; set; }
        public int? datetime_precision { get; set; }
        public string is_nullable { get; set; } = string.Empty;
        public string? column_default { get; set; }
        public string? extra { get; set; }
        public string? character_set_name { get; set; }
        public string? collation_name { get; set; }
        public string? column_comment { get; set; }
    }

    private sealed class IndexRow
    {
        public string table_name { get; set; } = string.Empty;
        public string index_name { get; set; } = string.Empty;
        public int non_unique { get; set; }
        public string? index_type { get; set; }
        public int seq_in_index { get; set; }
        public string column_name { get; set; } = string.Empty;
        public int? sub_part { get; set; }
    }

    private sealed class ForeignKeyRow
    {
        public string table_name { get; set; } = string.Empty;
        public string constraint_name { get; set; } = string.Empty;
        public string column_name { get; set; } = string.Empty;
        public string referenced_table_name { get; set; } = string.Empty;
        public string referenced_column_name { get; set; } = string.Empty;
        public string update_rule { get; set; } = string.Empty;
        public string delete_rule { get; set; } = string.Empty;
    }
}
