using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IIntegrationDefinitionRepository
{
    Task<IntegrationDefinition?> GetByIdAsync(int integrationId);
    Task<IEnumerable<IntegrationDefinition>> GetAllAsync(bool activeOnly);
    Task<int> CreateAsync(IntegrationDefinition definition);
    Task UpdateAsync(IntegrationDefinition definition);
    Task DeleteAsync(int integrationId);
}

