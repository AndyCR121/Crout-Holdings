using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IUserServiceCredentialRepository
{
    Task<UserServiceCredential?> GetAsync(int userServiceId, int integrationDefinitionId);
    Task<IReadOnlyList<UserServiceCredential>> GetByUserServiceIdAsync(int userServiceId);
    Task UpsertAsync(UserServiceCredential credential);
}
