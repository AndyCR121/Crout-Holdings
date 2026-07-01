using MySqlConnector;

namespace CroutApi.Helpers;

public static class SchemaUpdater
{
    public static async Task<bool> TryRunAsync(string[] args, CancellationToken cancellationToken = default)
    {
        if (!args.Contains("--apply-migrations", StringComparer.OrdinalIgnoreCase))
            return false;

        var connectionString = ReadArgument(args, "--connection")
            ?? throw new InvalidOperationException("A target connection string is required via --connection.");
        var sqlRoot = ReadArgument(args, "--sql-root")
            ?? Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "sql"));

        if (!Directory.Exists(sqlRoot))
            throw new InvalidOperationException($"SQL root was not found: {sqlRoot}");

        await using var connection = new MySqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Target database is unreachable: {ex.Message}");
        }

        await EnsureHistoryTableAsync(connection, cancellationToken);
        var applied = (await LoadAppliedMigrationsAsync(connection, cancellationToken)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var migrations = Directory.GetFiles(sqlRoot, "*.sql")
            .Select(path => new FileInfo(path))
            .Where(file => char.IsDigit(file.Name[0]))
            .OrderBy(file => file.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var migration in migrations)
        {
            if (applied.Contains(migration.Name)) continue;
            var sql = await File.ReadAllTextAsync(migration.FullName, cancellationToken);
            await using var tx = await connection.BeginTransactionAsync(cancellationToken);
            try
            {
                foreach (var statement in SplitStatements(sql))
                {
                    await using var command = new MySqlCommand(statement, connection, tx);
                    await command.ExecuteNonQueryAsync(cancellationToken);
                }

                await using var insertCommand = new MySqlCommand(
                    "INSERT INTO SchemaMigrations (migration_name) VALUES (@migrationName)",
                    connection,
                    tx);
                insertCommand.Parameters.AddWithValue("@migrationName", migration.Name);
                await insertCommand.ExecuteNonQueryAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);
            }
            catch
            {
                await tx.RollbackAsync(cancellationToken);
                throw;
            }
        }

        return true;
    }

    private static async Task EnsureHistoryTableAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var sql = """
            CREATE TABLE IF NOT EXISTS SchemaMigrations (
              id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
              migration_name VARCHAR(255) NOT NULL,
              applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY ux_schema_migrations_name (migration_name)
            )
            """;
        await using var command = new MySqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<List<string>> LoadAppliedMigrationsAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var results = new List<string>();
        await using var command = new MySqlCommand("SELECT migration_name FROM SchemaMigrations ORDER BY id", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            results.Add(reader.GetString(0));
        return results;
    }

    private static string? ReadArgument(string[] args, string name)
    {
        for (var index = 0; index < args.Length - 1; index++)
        {
            if (args[index].Equals(name, StringComparison.OrdinalIgnoreCase))
                return args[index + 1];
        }

        return null;
    }

    private static IEnumerable<string> SplitStatements(string sql) =>
        sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(statement => !string.IsNullOrWhiteSpace(statement));
}
