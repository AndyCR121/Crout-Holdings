using CroutApi.Models;
using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IEmailService
{
    Task<bool> SendContactRequestAsync(ContactRequest request);
    Task<bool> SendPasswordResetOtpAsync(string email, string displayName, string otp);
    Task<bool> SendBookingConfirmationAsync(BookingDto booking, string? calendarEmail = null);

    /// <summary>
    /// Sends one Custom Form share-link email to one recipient. Callers with multiple
    /// recipients call this once per address sequentially (see design.md D8) — there is no
    /// batch/bulk variant, matching this project's existing multi-recipient pattern.
    /// </summary>
    Task<bool> SendFormShareLinkAsync(string recipientEmail, string shareUrl, string companyName, string serviceName);
}
