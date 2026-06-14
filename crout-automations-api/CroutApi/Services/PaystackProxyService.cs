using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.Repositories;

namespace CroutApi.Services;

/// <summary>
/// Server-side proxy for Paystack API.
/// The secret key NEVER reaches the frontend — all Paystack calls go through here.
///
/// Email strategy:
///   Users are looked up by their COMPANY email (Companies.Email).
///   This is the email they use on Paystack when subscribing.
///   Company emails must be unique (enforced at registration — see UserRepository).
///   If a user has no company, we fall back to their personal User.Email.
/// </summary>
public class PaystackProxyService(
    IUserRepository      users,
    ICompanyRepository   companies,
    IConfiguration       config,
    HttpClient           http) : IPaystackProxyService
{
    private string SecretKey =>
        config["Paystack:SecretKey"]
        ?? Environment.GetEnvironmentVariable("PAYSTACK_SECRET_KEY")
        ?? throw new InvalidOperationException(
            "Paystack secret key not configured. "
            + "Set PAYSTACK_SECRET_KEY env var or Paystack:SecretKey in appsettings.");

    private void AddAuth() =>
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", SecretKey);

    // ── Resolve the billing email for a user ──────────────────────────────────
    /// <summary>
    /// Returns the company email if the user has a company, otherwise their personal email.
    /// This email must match what they used when subscribing on Paystack.
    /// </summary>
    private async Task<string> ResolveBillingEmailAsync(int userId)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        // Try to get the company email first
        var company = await companies.GetByUserIdAsync(userId);
        if (company is not null && !string.IsNullOrWhiteSpace(company.Email))
            return company.Email;

        // Fallback to personal email
        return user.Email;
    }

    // ── Subscriptions ───────────────────────────────────────────────────────
    public async Task<object> GetSubscriptionsAsync(int userId)
    {
        var email = await ResolveBillingEmailAsync(userId);
        AddAuth();
        var response = await http.GetAsync(
            $"https://api.paystack.co/subscription?email={Uri.EscapeDataString(email)}");
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<object>(json)!;
    }

    // ── Saved Cards (Authorizations) ─────────────────────────────────────────
    public async Task<object> GetCardsAsync(int userId)
    {
        var email = await ResolveBillingEmailAsync(userId);
        AddAuth();
        var response = await http.GetAsync(
            $"https://api.paystack.co/customer/{Uri.EscapeDataString(email)}");
        var json = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.TryGetProperty("data", out var data) &&
            data.TryGetProperty("authorizations", out var auths))
        {
            return JsonSerializer.Deserialize<object>(auths.GetRawText())!;
        }
        return Array.Empty<object>();
    }

    // ── Initialise card-capture transaction ─────────────────────────────────
    public async Task<object> InitialiseCardCaptureAsync(int userId)
    {
        var email = await ResolveBillingEmailAsync(userId);
        AddAuth();

        var body = JsonSerializer.Serialize(new
        {
            email    = email,
            amount   = 5000,
            currency = "ZAR",
            channels = new[] { "card" },
            metadata = new
            {
                purpose = "card_capture",
                user_id = userId,
                custom_fields = new[]
                {
                    new { display_name = "Purpose", variable_name = "purpose", value = "Card capture" }
                }
            },
        });

        var response = await http.PostAsync(
            "https://api.paystack.co/transaction/initialize",
            new StringContent(body, Encoding.UTF8, "application/json"));

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        if (doc.RootElement.TryGetProperty("data", out var d))
            return JsonSerializer.Deserialize<object>(d.GetRawText())!;

        return JsonSerializer.Deserialize<object>(json)!;
    }
}
