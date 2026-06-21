using CroutApi.DTOs;

namespace CroutApi.Repositories;

public interface IDevPortalRepository
{
    Task<DevDashboardDto> GetDashboardAsync(int userId);
    Task<(IEnumerable<DevPortalServiceDto> Items, int Total)> GetAssignedAsync(int userId, int page, int pageSize, string? search);
    Task<(IEnumerable<DevPortalServiceDto> Items, int Total)> GetAvailableAsync(int page, int pageSize, string? search);
    Task<DevPortalServiceDto?> GetGuideAsync(int userId, int userServiceId);
    Task<DevPortalServiceDto?> UpdateGuideStepAsync(int userId, int userServiceId, int step);
    Task<DevPortalServiceDto?> UpdateMaintenanceAsync(int userId, int userServiceId, bool isMaintenance);
    Task<int> ClaimAsync(int userId, int userServiceId);
}
