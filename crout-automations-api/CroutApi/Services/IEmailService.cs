using CroutApi.Models;
using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IEmailService
{
    Task<bool> SendContactRequestAsync(ContactRequest request);
    Task<bool> SendPasswordResetOtpAsync(string email, string displayName, string otp);
    Task<bool> SendBookingConfirmationAsync(BookingDto booking);
}
