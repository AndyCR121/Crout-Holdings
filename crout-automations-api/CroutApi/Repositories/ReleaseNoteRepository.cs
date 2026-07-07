using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ReleaseNoteRepository(DbHelper db) : IReleaseNoteRepository
{
    public async Task<IEnumerable<ReleaseNote>> GetAllPublicAsync()
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<ReleaseNote>(
            $"""
            SELECT
              refRelease AS RefRelease,
              releaseVersion AS ReleaseVersion,
              releaseDate AS ReleaseDate,
              releaseNotes AS ReleaseNotes,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM ReleaseNotes
            ORDER BY {SemanticVersionOrderSql("DESC")}
            """);
    }

    public async Task<(IEnumerable<ReleaseNote> Items, int Total)> GetPagedAsync(int page, int pageSize, string sortBy, string sortDirection)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM ReleaseNotes");
        var orderBy = BuildOrderBy(sortBy, sortDirection);
        var items = await conn.QueryAsync<ReleaseNote>(
            $"""
            SELECT
              refRelease AS RefRelease,
              releaseVersion AS ReleaseVersion,
              releaseDate AS ReleaseDate,
              releaseNotes AS ReleaseNotes,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM ReleaseNotes
            ORDER BY {orderBy}
            LIMIT @pageSize OFFSET @offset
            """,
            new { pageSize, offset });

        return (items, total);
    }

    public async Task<ReleaseNote?> GetByIdAsync(int refRelease)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<ReleaseNote>(
            """
            SELECT
              refRelease AS RefRelease,
              releaseVersion AS ReleaseVersion,
              releaseDate AS ReleaseDate,
              releaseNotes AS ReleaseNotes,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM ReleaseNotes
            WHERE refRelease = @refRelease
            """,
            new { refRelease });
    }

    public async Task<bool> VersionExistsAsync(string releaseVersion, int? excludeRefRelease = null)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*)
            FROM ReleaseNotes
            WHERE releaseVersion = @releaseVersion
              AND (@excludeRefRelease IS NULL OR refRelease <> @excludeRefRelease)
            """,
            new { releaseVersion, excludeRefRelease }) > 0;
    }

    public async Task<int> CreateAsync(ReleaseNote releaseNote)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO ReleaseNotes (releaseVersion, releaseDate, releaseNotes, createdAt)
            VALUES (@ReleaseVersion, @ReleaseDate, @ReleaseNotes, UTC_TIMESTAMP());
            SELECT LAST_INSERT_ID();
            """,
            new
            {
                releaseNote.ReleaseVersion,
                ReleaseDate = releaseNote.ReleaseDate.ToDateTime(TimeOnly.MinValue),
                releaseNote.ReleaseNotes
            });
    }

    public async Task UpdateAsync(ReleaseNote releaseNote)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE ReleaseNotes
            SET releaseVersion = @ReleaseVersion,
                releaseDate = @ReleaseDate,
                releaseNotes = @ReleaseNotes,
                updatedAt = UTC_TIMESTAMP()
            WHERE refRelease = @RefRelease
            """,
            new
            {
                releaseNote.RefRelease,
                releaseNote.ReleaseVersion,
                ReleaseDate = releaseNote.ReleaseDate.ToDateTime(TimeOnly.MinValue),
                releaseNote.ReleaseNotes
            });
    }

    public async Task DeleteAsync(int refRelease)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM ReleaseNotes WHERE refRelease = @refRelease", new { refRelease });
    }

    private static string BuildOrderBy(string sortBy, string sortDirection)
    {
        var direction = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase) ? "ASC" : "DESC";
        return string.Equals(sortBy, "releaseDate", StringComparison.OrdinalIgnoreCase)
            ? $"releaseDate {direction}, refRelease {direction}"
            : $"{SemanticVersionOrderSql(direction)}, refRelease {direction}";
    }

    private static string SemanticVersionOrderSql(string direction) =>
        $"""
        CAST(SUBSTRING_INDEX(releaseVersion, '.', 1) AS UNSIGNED) {direction},
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(releaseVersion, '.', 2), '.', -1) AS UNSIGNED) {direction},
        CAST(SUBSTRING_INDEX(releaseVersion, '.', -1) AS UNSIGNED) {direction}
        """;
}
