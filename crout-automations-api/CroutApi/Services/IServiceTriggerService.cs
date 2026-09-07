using CroutApi.DTOs;
using CroutApi.DTOs.ServiceTriggers;
using CroutApi.Models;

namespace CroutApi.Services;

public interface IServiceTriggerService
{
    Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null);
    Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames);

    /// <summary>Public-share-link submission path — see ServiceTriggerService.ExecutePublicCustomFormAsync for why this takes no userId.</summary>
    Task<ExecuteTriggerResponseDto> ExecutePublicCustomFormAsync(Integration integration, CustomFormAccessContextDto context, string? payloadJson);

    /// <summary>Builds the same rendering config the authenticated renderer uses, for the public share-link page to consume identically.</summary>
    ServiceTriggerConfigDto? BuildPublicCustomFormConfig(CustomFormAccessContextDto context);
}
