using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IContactRequestRepository
{
    Task<int> CreateAsync(ContactRequest request);
}
