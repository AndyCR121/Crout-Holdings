using CroutApi.DTOs.ServiceTriggers;

namespace CroutApi.Services;

public interface IServiceTriggerService
{
    Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null);
    Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames);
}
