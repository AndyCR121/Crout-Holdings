using CroutApi.Models;

namespace CroutApi.Services;

public interface IEmailService
{
    Task<bool> SendContactRequestAsync(ContactRequest request);
}
