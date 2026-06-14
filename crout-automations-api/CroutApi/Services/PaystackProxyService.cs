using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class PaystackProxyService(
    IUserRepository users,
    IConfiguration config,
    HttpClient http) : IPaystackProxyService
{
    private string SecretKey =>
        config["Paystack:SecretKey"]
        ?? Environment.GetEnvironmentVariable("PAYSTACK_SECRET_KEY")
        ?? throw new InvalidOperationException("Paystack secret key not configured. Set Paystack:SecretKey in appsettings or PAYSTACK_SECRET_KEY env var.");

    private void AddAuth()
    {
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", SecretKey);
    }

    // ── Subscriptions ────────────────────────────────────────────────────────
    public async Task<object> GetSubscriptionsAsync(int userId)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        AddAuth();
        var response = await http.GetAsync(
            $"https://api.paystack.co/subscription?email={Uri.EscapeDataString(user.Email)}");
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<object>(json)!;
    }

    // ── Saved Cards (Authorizations) ──────────────────────────────────────────
    public async Task<object> GetCardsAsync(int userId)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        AddAuth();
        var response = await http.GetAsync(
            $"https://api.paystack.co/customer/{Uri.EscapeDataString(user.Email)}");
        var json = await response.Content.ReadAsStringAsync();

        // Extract authorizations array from nested customer object
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.TryGetProperty("data", out var data) &&
            data.TryGetProperty("authorizations", out var auths))
        {
            return JsonSerializer.Deserialize<object>(auths.GetRawText())!;
        }
        return Array.Empty<object>();
    }

    // ── Initialise card-capture transaction ───────────────────────────────────
    public async Task<object> InitialiseCardCaptureAsync(int userId)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        AddAuth();

        // R50 minimum charge — Paystack requires > R0 to tokenize a card.
        // This is a real charge; handle refunds in your Paystack dashboard
        // or use a R0-plan subscription flow if you prefer zero-charge capture.
        var body = JsonSerializer.Serialize(new
        {
            email    = user.Email,
            amount   = 5000,          // amount in kobo/cents — R50.00
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

        // Return just the data object { access_code, reference, authorization_url }
        if (doc.RootElement.TryGetProperty("data", out var d))
            return JsonSerializer.Deserialize<object>(d.GetRawText())!;

        return JsonSerializer.Deserialize<object>(json)!;
    }
}
