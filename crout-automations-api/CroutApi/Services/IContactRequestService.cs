using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IContactRequestService
{
    Task<ContactRequestResponseDto> SubmitAsync(SubmitContactRequestDto dto);
}
