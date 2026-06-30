using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IDevUserServiceFormService
{
    Task<DevUserServiceFormDto?> GetAsync(int developerUserId, int userServiceId);
    Task<DevUserServiceFormDto> CreateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto);
    Task<DevUserServiceFormDto> UpdateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto);
    Task DeleteAsync(int developerUserId, int userServiceId);
}
