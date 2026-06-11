using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IServiceRequestRepository
{
    Task<int> CreateAsync(ServiceRequest request);
}
