using MySql.Data.MySqlClient;
using Dapper;

namespace CroutApi.Helpers;

/// <summary>
/// Centralises MySQL connection creation and Dapper query helpers.
/// All data access uses this class - no raw connection strings elsewhere.
/// </summary>
public sealed class DbHelper
{
    private readonly string _connectionString;

    public DbHelper()
    {
        var host     = Environment.GetEnvironmentVariable("DB_HOST")     ?? "localhost";
        var port     = Environment.GetEnvironmentVariable("DB_PORT")     ?? "3306";
        var database = Environment.GetEnvironmentVariable("DB_NAME")     ?? "crout_automations";
        var user     = Environment.GetEnvironmentVariable("DB_USER")     ?? "root";
        var password = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "";

        _connectionString =
            $"Server={host};Port={port};Database={database};" +
            $"User={user};Password={password};" +
            "AllowPublicKeyRetrieval=true;SslMode=none;";
    }

    /// <summary>Opens and returns a new MySQL connection.</summary>
    public MySqlConnection OpenConnection()
    {
        var conn = new MySqlConnection(_connectionString);
        conn.Open();
        return conn;
    }

    public IEnumerable<T> Query<T>(string sql, object? param = null)
    {
        using var conn = OpenConnection();
        return conn.Query<T>(sql, param);
    }

    public T? QueryFirstOrDefault<T>(string sql, object? param = null)
    {
        using var conn = OpenConnection();
        return conn.QueryFirstOrDefault<T>(sql, param);
    }

    public int Execute(string sql, object? param = null)
    {
        using var conn = OpenConnection();
        return conn.Execute(sql, param);
    }

    public long ExecuteInsert(string sql, object? param = null)
    {
        using var conn = OpenConnection();
        conn.Execute(sql, param);
        return conn.LastInsertedId;
    }
}
