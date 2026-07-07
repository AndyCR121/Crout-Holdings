using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IIntegrationDefinitionService
{
    Task<IEnumerable<IntegrationDefinitionDto>> GetAllAsync(bool activeOnly);
    Task<IntegrationDefinitionDto> CreateAsync(UpsertIntegrationDefinitionDto dto);
    Task<IntegrationDefinitionDto> UpdateAsync(int integrationId, UpsertIntegrationDefinitionDto dto);
    Task DeleteAsync(int integrationId);
}

