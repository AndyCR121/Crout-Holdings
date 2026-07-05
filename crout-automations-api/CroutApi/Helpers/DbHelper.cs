using MySqlConnector;

namespace CroutApi.Helpers;

/// <summary>
/// Centralises MySQL connection creation.
/// Repositories call GetConnection() and manage lifetime themselves.
/// </summary>
public sealed class DbHelper
{
    private readonly string _connectionString;

    public DbHelper()
    {
        _connectionString = BuildConnectionStringFromEnvironment();
    }

    /// <summary>Returns a new (unopened) MySqlConnection — caller disposes.</summary>
    public MySqlConnection GetConnection() => new(_connectionString);

    public static string BuildConnectionStringFromEnvironment()
    {
        var host = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
        var port = Environment.GetEnvironmentVariable("DB_PORT") ?? "3306";
        var database = Environment.GetEnvironmentVariable("DB_NAME") ?? "crout_automations";
        var user = Environment.GetEnvironmentVariable("DB_USER") ?? "root";
        var password = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? string.Empty;

        return
            $"Server={host};Port={port};Database={database};" +
            $"User={user};Password={password};" +
            "AllowPublicKeyRetrieval=true;AllowUserVariables=true;SslMode=None;";
    }
}
