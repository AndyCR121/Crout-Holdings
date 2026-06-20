using CroutApi.DTOs;

namespace CroutApi.Repositories;

public interface IDevPortalRepository
{
    Task<DevDashboardDto> GetDashboardAsync(int userId);
    Task<(IEnumerable<DevPortalServiceDto> Items, int Total)> GetAssignedAsync(int userId, int page, int pageSize, string? search);
    Task<(IEnumerable<DevPortalServiceDto> Items, int Total)> GetAvailableAsync(int page, int pageSize, string? search);
    Task<int> ClaimAsync(int userId, int userServiceId);
}
