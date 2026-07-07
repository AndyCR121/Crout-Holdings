using CroutApi.Models;

namespace CroutApi.Services;

public interface IReleaseNoteService
{
    Task<IEnumerable<ReleaseNote>> GetAllPublicAsync();
    Task<(IEnumerable<ReleaseNote> Items, int Total, int Page, int PageSize)> GetPagedAsync(int page, int pageSize, string sortBy, string sortDirection);
    Task<ReleaseNote?> GetByIdAsync(int refRelease);
    Task<ReleaseNote> CreateAsync(string releaseVersion, DateOnly releaseDate, string releaseNotes);
    Task<ReleaseNote> UpdateAsync(int refRelease, string releaseVersion, DateOnly releaseDate, string releaseNotes);
    Task DeleteAsync(int refRelease);
}
