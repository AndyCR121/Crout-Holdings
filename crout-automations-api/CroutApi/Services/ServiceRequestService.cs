using CroutApi.DTOs.Services;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class ServiceRequestService(
    IServiceRequestRepository repo,
    ICompanyRepository companies) : IServiceRequestService
{
    public async Task<ServiceRequest> SubmitAsync(int userId, SubmitServiceRequestDto dto)
    {
        // Verify company belongs to this user
        var company = await companies.GetByIdAsync(dto.CompanyId)
            ?? throw new KeyNotFoundException("Company not found.");
        if (company.UserId != userId)
            throw new UnauthorizedAccessException("Company does not belong to this user.");

        var request = new ServiceRequest
        {
            CompanyId = dto.CompanyId,
            ServiceId = dto.ServiceId,
            PackageId = dto.PackageId,
            RequestNote = dto.RequestNote,
        };
        request.RequestId = await repo.CreateAsync(request);
        return request;
    }
}
