using System.Net;
using System.Net.Mail;
using System.Text;
using CroutApi.Models;

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

        using var client = new SmtpClient(host, port) { EnableSsl = enableSsl };
        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        using var message = new MailMessage
        {
            From = new MailAddress(from),
            Subject = $"Contact request: {request.Service}",
            Body = BuildBody(request),
            IsBodyHtml = false,
        };
        message.To.Add(to);
        message.ReplyToList.Add(new MailAddress(request.Email, request.Name));

        try
        {
            await client.SendMailAsync(message).WaitAsync(MailSendTimeout);
            return true;
        }
        catch (TimeoutException ex)
        {
            logger.LogError(ex, "Contact email timed out for {Email}", request.Email);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Contact email failed for {Email}", request.Email);
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
            await client.SendMailAsync(message).WaitAsync(MailSendTimeout);
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

    private static string BuildBody(ContactRequest request)
    {
        var body = new StringBuilder();
        body.AppendLine("New Contact Request");
        body.AppendLine("===================");
        body.AppendLine($"Name: {request.Name}");
        body.AppendLine($"Email: {request.Email}");
        body.AppendLine($"Phone: {request.Phone ?? "Not provided"}");
        body.AppendLine($"Business: {request.Business ?? "Not provided"}");
        body.AppendLine($"Service: {request.Service}");
        body.AppendLine($"Referral: {request.Referral ?? "Not provided"}");
        body.AppendLine($"Source: {request.Source ?? "Website"}");
        body.AppendLine();
        body.AppendLine("Message");
        body.AppendLine("-------");
        body.AppendLine(request.Message);

        if (!string.IsNullOrWhiteSpace(request.ConfigJson))
        {
            body.AppendLine();
            body.AppendLine("Selected Configuration");
            body.AppendLine("----------------------");
            body.AppendLine(request.ConfigJson);
        }

        return body.ToString();
    }

    private SmtpClient BuildClient(string host)
    {
        var port = int.TryParse(GetSetting("SMTP_PORT", "Mail:Smtp:Port"), out var parsedPort)
            ? parsedPort
            : 587;
        var enableSsl = !string.Equals(GetSetting("SMTP_ENABLE_SSL", "Mail:Smtp:EnableSsl"), "false", StringComparison.OrdinalIgnoreCase);
        var username = GetSetting("SMTP_USERNAME", "Mail:Smtp:Username");
        var password = GetSetting("SMTP_PASSWORD", "Mail:Smtp:Password");

        var client = new SmtpClient(host, port) { EnableSsl = enableSsl };
        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        return client;
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
}
