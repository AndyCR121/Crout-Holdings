using CroutApi.DTOs.Services;
using CroutApi.Models;

namespace CroutApi.Services;

public interface IServiceRequestService
{
    Task<ServiceRequest> SubmitAsync(int userId, SubmitServiceRequestDto dto);
}
