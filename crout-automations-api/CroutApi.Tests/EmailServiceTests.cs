using CroutApi.Services;
using Xunit;

namespace CroutApi.Tests;

public class EmailServiceTests
{
    [Fact]
    public void SubstitutePlaceholders_FormShareLinkTemplate_ReplacesAllThreePlaceholders()
    {
        const string template = "<p>{{companyName}} shared {{serviceName}}</p><a href=\"{{shareUrl}}\">Open</a>";

        var result = EmailService.SubstitutePlaceholders(
            template,
            ("companyName", "Acme Co"),
            ("serviceName", "Intake Form"),
            ("shareUrl", "https://automations.crout-holdings.com/forms/abc123"));

        Assert.Equal(
            "<p>Acme Co shared Intake Form</p><a href=\"https://automations.crout-holdings.com/forms/abc123\">Open</a>",
            result);
        Assert.DoesNotContain("{{", result);
    }

    [Fact]
    public void SubstitutePlaceholders_HtmlEncodesValues_PreventingInjectionViaCompanyOrServiceName()
    {
        const string template = "<p>{{companyName}}</p>";

        var result = EmailService.SubstitutePlaceholders(template, ("companyName", "<script>alert(1)</script>"));

        Assert.DoesNotContain("<script>", result);
        Assert.Contains("&lt;script&gt;", result);
    }

    [Fact]
    public async Task SendFormShareLinkAsync_WhenSmtpNotConfigured_ReturnsFalseWithoutThrowing()
    {
        Environment.SetEnvironmentVariable("SMTP_HOST", null);
        Environment.SetEnvironmentVariable("SMTP_FROM_EMAIL", null);
        var service = new EmailService(
            Microsoft.Extensions.Logging.Abstractions.NullLogger<EmailService>.Instance,
            new FakeWebHostEnvironment(),
            new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build());

        var result = await service.SendFormShareLinkAsync(
            "recipient@example.com", "https://automations.crout-holdings.com/forms/abc123", "Acme Co", "Intake Form");

        Assert.False(result);
    }

    private class FakeWebHostEnvironment : Microsoft.AspNetCore.Hosting.IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "CroutApi.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string EnvironmentName { get; set; } = "Test";
        public string WebRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
    }
}
