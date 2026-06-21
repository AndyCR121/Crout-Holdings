using System.Text.Json;
using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class ContactRequestService(
    IContactRequestRepository repo,
    IEmailService emailer) : IContactRequestService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public async Task<ContactRequestResponseDto> SubmitAsync(SubmitContactRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Service) ||
            string.IsNullOrWhiteSpace(dto.Message))
        {
            throw new ArgumentException("Name, email, service and message are required.");
        }

        var request = new ContactRequest
        {
            Name = dto.Name.Trim(),
            Email = dto.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            Business = string.IsNullOrWhiteSpace(dto.Business) ? null : dto.Business.Trim(),
            Service = dto.Service.Trim(),
            Message = dto.Message.Trim(),
            Referral = string.IsNullOrWhiteSpace(dto.Referral) ? null : dto.Referral.Trim(),
            ConfigJson = dto.Config is null ? null : JsonSerializer.Serialize(dto.Config, JsonOptions),
            Source = string.IsNullOrWhiteSpace(dto.Source) ? "Crout Automations website" : dto.Source.Trim(),
        };

        var emailSent = await emailer.SendContactRequestAsync(request);
        request.EmailSent = emailSent;
        var id = await repo.CreateAsync(request);

        return new ContactRequestResponseDto(
            id,
            emailSent,
            emailSent
                ? "Message sent successfully."
                : "Message saved. Email delivery is not configured on the API container.");
    }
}
