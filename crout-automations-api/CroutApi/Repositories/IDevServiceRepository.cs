using CroutApi.DTOs;
using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IDevServiceRepository
{
    Task<(IEnumerable<DevServiceViewDto> Items, int Total)> GetAllAsync(
        int page,
        int pageSize,
        string? search,
        int? developerId,
        int? companyId,
        int? serviceId,
        string? referral,
        bool? assigned,
        bool? active);

    Task<DevService?> GetByIdAsync(int devServiceId);
    Task<int> CreateAsync(DevService devService);
    Task UpdateAsync(DevService devService);
    Task DeactivateAsync(int devServiceId);
    Task<bool> UserServiceExistsAsync(int userServiceId);
}
