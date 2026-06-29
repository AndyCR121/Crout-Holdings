using CroutApi.DTOs;
using Microsoft.AspNetCore.Http;

namespace CroutApi.Services;

public interface ICustomFormService
{
    Task<CustomFormConfigDto?> GetManagementConfigAsync(int integrationId, int callerUserId, bool isAdmin);
    Task<CustomFormConfigDto> SaveDraftAsync(int integrationId, int callerUserId, bool isAdmin, SaveCustomFormDraftDto dto);
    Task<CustomFormConfigDto> PublishAsync(int integrationId, int callerUserId, bool isAdmin);
    Task<CustomFormConfigDto> UnpublishAsync(int integrationId, int callerUserId, bool isAdmin);
    Task DeleteAsync(int integrationId, int callerUserId, bool isAdmin);
    Task<CustomFormConfigDto?> GetPublishedAsync(int userServiceId, int callerUserId);
    Task<CustomFormFileUploadResultDto> UploadFileAsync(int userServiceId, int callerUserId, IFormFile file);
    Task<CustomFormSubmissionResponseDto> SubmitAsync(int userServiceId, int callerUserId, SubmitCustomFormDto dto, CancellationToken cancellationToken = default);
}
