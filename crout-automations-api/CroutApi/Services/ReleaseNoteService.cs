using System.Text.RegularExpressions;
using CroutApi.Helpers;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public partial class ReleaseNoteService(
    IReleaseNoteRepository releaseNotes,
    ReleaseNotesHtmlSanitizer htmlSanitizer) : IReleaseNoteService
{
    public async Task<IEnumerable<ReleaseNote>> GetAllPublicAsync() =>
        await releaseNotes.GetAllPublicAsync();

    public async Task<(IEnumerable<ReleaseNote> Items, int Total, int Page, int PageSize)> GetPagedAsync(
        int page,
        int pageSize,
        string sortBy,
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize <= 0 ? 10 : pageSize;
        var normalizedSortBy = NormalizeSortBy(sortBy);
        var normalizedSortDirection = NormalizeSortDirection(sortDirection);
        var (items, total) = await releaseNotes.GetPagedAsync(normalizedPage, normalizedPageSize, normalizedSortBy, normalizedSortDirection);
        return (items, total, normalizedPage, normalizedPageSize);
    }

    public Task<ReleaseNote?> GetByIdAsync(int refRelease) =>
        releaseNotes.GetByIdAsync(refRelease);

    public async Task<ReleaseNote> CreateAsync(string releaseVersion, DateOnly releaseDate, string releaseNotesHtml)
    {
        var normalizedVersion = ValidateAndNormalizeVersion(releaseVersion);
        if (await releaseNotes.VersionExistsAsync(normalizedVersion))
        {
            throw new DuplicateReleaseVersionException(normalizedVersion);
        }

        var sanitizedHtml = htmlSanitizer.Sanitize(releaseNotesHtml);
        var refRelease = await releaseNotes.CreateAsync(new ReleaseNote
        {
            ReleaseVersion = normalizedVersion,
            ReleaseDate = releaseDate,
            ReleaseNotes = sanitizedHtml
        });

        return await releaseNotes.GetByIdAsync(refRelease)
            ?? throw new KeyNotFoundException("Release note not found after creation.");
    }

    public async Task<ReleaseNote> UpdateAsync(int refRelease, string releaseVersion, DateOnly releaseDate, string releaseNotesHtml)
    {
        var existing = await releaseNotes.GetByIdAsync(refRelease)
            ?? throw new KeyNotFoundException("Release note not found.");

        var normalizedVersion = ValidateAndNormalizeVersion(releaseVersion);
        if (await releaseNotes.VersionExistsAsync(normalizedVersion, refRelease))
        {
            throw new DuplicateReleaseVersionException(normalizedVersion);
        }

        existing.ReleaseVersion = normalizedVersion;
        existing.ReleaseDate = releaseDate;
        existing.ReleaseNotes = htmlSanitizer.Sanitize(releaseNotesHtml);

        await releaseNotes.UpdateAsync(existing);
        return await releaseNotes.GetByIdAsync(refRelease)
            ?? throw new KeyNotFoundException("Release note not found after update.");
    }

    public async Task DeleteAsync(int refRelease)
    {
        if (await releaseNotes.GetByIdAsync(refRelease) is null)
        {
            throw new KeyNotFoundException("Release note not found.");
        }

        await releaseNotes.DeleteAsync(refRelease);
    }

    private static string NormalizeSortBy(string? sortBy) =>
        string.Equals(sortBy, "releaseDate", StringComparison.OrdinalIgnoreCase)
            ? "releaseDate"
            : "releaseVersion";

    private static string NormalizeSortDirection(string? sortDirection) =>
        string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase)
            ? "asc"
            : "desc";

    private static string ValidateAndNormalizeVersion(string releaseVersion)
    {
        var normalized = string.IsNullOrWhiteSpace(releaseVersion)
            ? throw new ArgumentException("Release version is required.")
            : releaseVersion.Trim();

        if (!SemanticVersionRegex().IsMatch(normalized))
        {
            throw new ArgumentException("Release version must match semantic version format: x.y.z");
        }

        return normalized;
    }

    [GeneratedRegex(@"^\d+\.\d+\.\d+$", RegexOptions.CultureInvariant)]
    private static partial Regex SemanticVersionRegex();
}
