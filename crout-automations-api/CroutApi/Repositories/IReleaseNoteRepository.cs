using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IReleaseNoteRepository
{
    Task<IEnumerable<ReleaseNote>> GetAllPublicAsync();
    Task<(IEnumerable<ReleaseNote> Items, int Total)> GetPagedAsync(int page, int pageSize, string sortBy, string sortDirection);
    Task<ReleaseNote?> GetByIdAsync(int refRelease);
    Task<bool> VersionExistsAsync(string releaseVersion, int? excludeRefRelease = null);
    Task<int> CreateAsync(ReleaseNote releaseNote);
    Task UpdateAsync(ReleaseNote releaseNote);
    Task DeleteAsync(int refRelease);
}
