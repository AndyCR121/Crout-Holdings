using System.Net;
using System.Net.Mail;
using System.Text;
using CroutApi.Models;

namespace CroutApi.Services;

public class EmailService(ILogger<EmailService> logger) : IEmailService
{
    public async Task<bool> SendContactRequestAsync(ContactRequest request)
    {
        var host = Environment.GetEnvironmentVariable("SMTP_HOST");
        var to = Environment.GetEnvironmentVariable("CONTACT_TO_EMAIL");
        var from = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? to;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(to) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogWarning("Contact email skipped because SMTP_HOST, CONTACT_TO_EMAIL, or SMTP_FROM_EMAIL is not configured.");
            return false;
        }

        var port = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var parsedPort)
            ? parsedPort
            : 587;
        var enableSsl = !string.Equals(Environment.GetEnvironmentVariable("SMTP_ENABLE_SSL"), "false", StringComparison.OrdinalIgnoreCase);
        var username = Environment.GetEnvironmentVariable("SMTP_USERNAME");
        var password = Environment.GetEnvironmentVariable("SMTP_PASSWORD");

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
            await client.SendMailAsync(message);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Contact email failed for {Email}", request.Email);
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
}
