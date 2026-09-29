using System.Net;
using System.Net.Mail;
using CroutApi.Models;
using CroutApi.DTOs;

namespace CroutApi.Services;

public class EmailService(ILogger<EmailService> logger, IWebHostEnvironment env, IConfiguration config) : IEmailService
{
    private static readonly TimeSpan MailSendTimeout = TimeSpan.FromSeconds(8);

    public async Task<bool> SendContactRequestAsync(ContactRequest request)
    {
        var host = GetSetting("SMTP_HOST", "Mail:Smtp:Host");
        var to = GetSetting("CONTACT_TO_EMAIL", "Mail:Contact:ToEmail");
        var from = GetSetting("SMTP_FROM_EMAIL", "Mail:Smtp:FromEmail") ?? to;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(to) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogWarning("Contact email skipped because SMTP_HOST, CONTACT_TO_EMAIL, or SMTP_FROM_EMAIL is not configured.");
            return false;
        }

        var port = int.TryParse(GetSetting("SMTP_PORT", "Mail:Smtp:Port"), out var parsedPort)
            ? parsedPort
            : 587;
        var enableSsl = !string.Equals(GetSetting("SMTP_ENABLE_SSL", "Mail:Smtp:EnableSsl"), "false", StringComparison.OrdinalIgnoreCase);
        var username = GetSetting("SMTP_USERNAME", "Mail:Smtp:Username");
        var password = GetSetting("SMTP_PASSWORD", "Mail:Smtp:Password");

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Timeout = (int)MailSendTimeout.TotalMilliseconds
        };
        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        using var message = new MailMessage
        {
            From = new MailAddress(from),
            Subject = $"Contact request: {request.Service}",
            Body = BuildContactRequestEmail(request),
            IsBodyHtml = true,
        };
        message.To.Add(to);

        try
        {
            logger.LogInformation(
                "Attempting contact email send for service {Service} from source {Source}.",
                request.Service,
                request.Source ?? "Website");

            await SendWithTimeoutAsync(client, message);
            logger.LogInformation(
                "Contact email delivered for service {Service}.",
                request.Service);
            return true;
        }
        catch (TimeoutException ex)
        {
            logger.LogError(ex, "Contact email timed out for service {Service}", request.Service);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Contact email failed for service {Service}", request.Service);
            return false;
        }
    }

    public async Task<bool> SendPasswordResetOtpAsync(string email, string displayName, string otp)
    {
        var host = GetSetting("SMTP_HOST", "Mail:Smtp:Host");
        var from = GetSetting("SMTP_FROM_EMAIL", "Mail:Smtp:FromEmail");

        if (env.IsDevelopment())
        {
            logger.LogInformation("Password reset email suppressed in development for {Email}. OTP: {Otp}", email, otp);
            return true;
        }

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogWarning("Password reset email skipped because SMTP_HOST or SMTP_FROM_EMAIL is not configured.");
            return false;
        }

        using var client = BuildClient(host);
        using var message = new MailMessage
        {
            From = new MailAddress(from),
            Subject = "Your Crout Automations password reset code",
            Body = BuildPasswordResetBody(displayName, otp),
            IsBodyHtml = true,
        };
        message.To.Add(email);

        try
        {
            await SendWithTimeoutAsync(client, message);
            return true;
        }
        catch (TimeoutException ex)
        {
            logger.LogError(ex, "Password reset email timed out for {Email}", email);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Password reset email failed for {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendBookingConfirmationAsync(BookingDto booking, string? calendarEmail = null)
    {
        var host = GetSetting("SMTP_HOST", "Mail:Smtp:Host");
        var from = GetSetting("SMTP_FROM_EMAIL", "Mail:Smtp:FromEmail");
        var owner = calendarEmail ?? GetSetting("BOOKING_TO_EMAIL", "Mail:Booking:ToEmail") ?? GetSetting("CONTACT_TO_EMAIL", "Mail:Contact:ToEmail");
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(owner)) { logger.LogWarning("Booking emails skipped because SMTP or booking recipient settings are missing."); return false; }
        var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(booking.StartsAt, DateTimeKind.Utc), GetSouthAfricaTimeZone());
        var time = local.ToString("dddd, d MMMM yyyy 'at' HH:mm") + " SAST";
        try
        {
            using var client = BuildClient(host);
            using var clientMessage = new MailMessage(from, booking.ClientEmail, "Your Crout Automations consultation is confirmed", RenderTemplate("BookingClientConfirmation.html", ("clientName", booking.ClientName), ("appointmentTime", time), ("platform", booking.Platform))) { IsBodyHtml = true };
            using var ownerMessage = new MailMessage(from, owner, $"New consultation booking — {booking.ClientName}", $"New consultation booking\n\nClient: {booking.ClientName}\nEmail: {booking.ClientEmail}\nWhen: {time}") { IsBodyHtml = false };
            ownerMessage.Body = RenderTemplate("BookingOwnerNotification.html", ("clientName", booking.ClientName), ("clientEmail", booking.ClientEmail), ("appointmentTime", time), ("platform", booking.Platform));
            ownerMessage.IsBodyHtml = true;
            await SendWithTimeoutAsync(client, clientMessage);
            await SendWithTimeoutAsync(client, ownerMessage);
            return true;
        }
        catch (Exception ex) { logger.LogError(ex, "Booking confirmation email failed for booking {BookingId}", booking.BookingId); return false; }
    }

    public async Task<bool> SendFormShareLinkAsync(string recipientEmail, string shareUrl, string companyName, string serviceName)
    {
        var host = GetSetting("SMTP_HOST", "Mail:Smtp:Host");
        var from = GetSetting("SMTP_FROM_EMAIL", "Mail:Smtp:FromEmail");
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogWarning("Form share-link email skipped because SMTP_HOST or SMTP_FROM_EMAIL is not configured.");
            return false;
        }

        try
        {
            using var client = BuildClient(host);
            using var message = new MailMessage(from, recipientEmail, $"{companyName} shared a form with you", RenderTemplate(
                "FormShareLinkNotification.html",
                ("companyName", companyName),
                ("serviceName", serviceName),
                ("shareUrl", shareUrl)))
            { IsBodyHtml = true };
            // Deliberately not logged: the rendered body/subject contain the raw share URL,
            // which must never reach application logs (see design.md D8 risk note).
            await SendWithTimeoutAsync(client, message);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Form share-link email failed for service {ServiceName}", serviceName);
            return false;
        }
    }

    private string BuildContactRequestEmail(ContactRequest request)
    {
        var message = request.Message;
        if (!string.IsNullOrWhiteSpace(request.ConfigJson)) message += $"\n\nSelected configuration:\n{request.ConfigJson}";
        return RenderTemplate("ContactRequestNotification.html", ("name", request.Name), ("email", request.Email), ("phone", request.Phone ?? "Not provided"), ("business", request.Business ?? "Not provided"), ("service", request.Service), ("source", request.Source ?? "Website"), ("message", message), ("configuration", string.Empty));
    }

    private string RenderTemplate(string templateName, params (string Key, string? Value)[] values)
    {
        var template = File.ReadAllText(Path.Combine(env.ContentRootPath, "Templates", templateName));
        return SubstitutePlaceholders(template, values);
    }

    /// <summary>Pure substitution step of <see cref="RenderTemplate"/>, split out so it's unit-testable without touching disk/SMTP.</summary>
    internal static string SubstitutePlaceholders(string template, params (string Key, string? Value)[] values)
    {
        foreach (var (key, value) in values) template = template.Replace($"{{{{{key}}}}}", WebUtility.HtmlEncode(value ?? string.Empty));
        return template;
    }

    private SmtpClient BuildClient(string host)
    {
        var port = int.TryParse(GetSetting("SMTP_PORT", "Mail:Smtp:Port"), out var parsedPort)
            ? parsedPort
            : 587;
        var enableSsl = !string.Equals(GetSetting("SMTP_ENABLE_SSL", "Mail:Smtp:EnableSsl"), "false", StringComparison.OrdinalIgnoreCase);
        var username = GetSetting("SMTP_USERNAME", "Mail:Smtp:Username");
        var password = GetSetting("SMTP_PASSWORD", "Mail:Smtp:Password");

        var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Timeout = (int)MailSendTimeout.TotalMilliseconds
        };
        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        return client;
    }

    private static Task SendWithTimeoutAsync(SmtpClient client, MailMessage message)
    {
        return Task.Run(() => client.Send(message));
    }

    private string BuildPasswordResetBody(string displayName, string otp)
    {
        var templatePath = Path.Combine(env.ContentRootPath, "Templates", "PasswordResetOtp.html");
        var template = File.ReadAllText(templatePath);

        return template
            .Replace("{{displayName}}", WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(displayName) ? "there" : displayName))
            .Replace("{{otp}}", WebUtility.HtmlEncode(otp));
    }

    private string? GetSetting(string environmentVariable, string configurationKey)
    {
        return Environment.GetEnvironmentVariable(environmentVariable)
            ?? config[configurationKey];
    }

    private static TimeZoneInfo GetSouthAfricaTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Africa/Johannesburg"); }
    }
}
