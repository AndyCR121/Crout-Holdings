using CroutApi.Models;
using CroutApi.DTOs;

namespace CroutApi.Repositories;

public interface IUserServiceRepository
{
    Task<IEnumerable<UserService>> GetByCompanyAsync(int companyId);
    Task<decimal> GetSubscriptionAmountAsync(int userServiceId);
    Task<UserService?> GetByIdAsync(int userServiceId);
    Task<int> CreateAsync(UserService userService);
    Task UpdateConfigAsync(int userServiceId, string config, int status);
    Task<(IEnumerable<AdminClientServiceRowDto> Items, int Total)> AdminGetAllAsync(int page, int pageSize, string? search, int? userId, int? companyId, int? serviceId, bool? active);
    Task<AdminClientServiceRowDto?> AdminGetRowByIdAsync(int userServiceId);
    Task<int> AdminCreateAsync(UserService userService);
    Task AdminUpdateAsync(int userServiceId, AdminUpdateClientServiceConfigDto dto);
    Task AdminDeactivateAsync(int userServiceId);
    Task<(IEnumerable<AdminPaystackMappingRowDto> Items, int Total)> AdminGetPaystackMappingsAsync(int page, int pageSize, string? search, string? mappingStatus);
    Task AdminUpdatePaystackMappingAsync(int userServiceId, AdminMapPaystackSubscriptionDto dto);
}
