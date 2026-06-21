using CroutApi.DTOs.ServiceTriggers;

namespace CroutApi.Services;

public interface IServiceTriggerService
{
    Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId);
    Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames);
}
