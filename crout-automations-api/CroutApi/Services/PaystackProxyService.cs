using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.Repositories;

namespace CroutApi.Services;

/// <summary>
/// Server-side proxy for the Paystack API.
/// Secret key NEVER reaches the frontend.
///
/// Per-company billing model:
///   Each Company has its own Email used on Paystack.
///   Cards and subscriptions are scoped to that company's email.
///   Company emails must be unique (enforced at DB level).
/// </summary>
public class PaystackProxyService(
    IUserRepository    users,
    ICompanyRepository companies,
    IConfiguration     config,
    HttpClient         http) : IPaystackProxyService
{
    private string SecretKey =>
        config["Paystack:SecretKey"]
        ?? Environment.GetEnvironmentVariable("PAYSTACK_SECRET_KEY")
        ?? throw new InvalidOperationException(
            "Paystack secret key not configured. Set PAYSTACK_SECRET_KEY env var.");

    private void AddAuth() =>
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", SecretKey);

    // ── Validate company belongs to user ───────────────────────────────────────
    private async Task<CroutApi.Models.Company> GetOwnedCompanyAsync(int userId, int companyId)
    {
        var userCompanies = await companies.GetByUserAsync(userId);
        var company = userCompanies.FirstOrDefault(c => c.CompanyId == companyId)
            ?? throw new UnauthorizedAccessException("Company not found or does not belong to this user.");
        if (string.IsNullOrWhiteSpace(company.Email))
            throw new ArgumentException($"Company '{company.CompanyName}' has no email address set. Please update it in your profile.");
        return company;
    }

    // ── Subscriptions (across all user companies) ────────────────────────────
    public async Task<object> GetSubscriptionsAsync(int userId)
    {
        var userCompanies = await companies.GetByUserAsync(userId);
        AddAuth();

        var results = new List<object>();
        foreach (var company in userCompanies.Where(c => !string.IsNullOrWhiteSpace(c.Email)))
        {
            var response = await http.GetAsync(
                $"https://api.paystack.co/subscription?email={Uri.EscapeDataString(company.Email!)}");
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("data", out var data))
            {
                results.Add(new
                {
                    companyId   = company.CompanyId,
                    companyName = company.CompanyName,
                    email       = company.Email,
                    subscriptions = JsonSerializer.Deserialize<object>(data.GetRawText()),
                });
            }
        }
        return results;
    }

    // ── Per-company cards ───────────────────────────────────────────────────
    public async Task<object> GetCompanyBillingAsync(int userId)
    {
        var userCompanies = await companies.GetByUserAsync(userId);
        AddAuth();

        var results = new List<object>();
        foreach (var company in userCompanies)
        {
            var cards = new List<object>();

            if (!string.IsNullOrWhiteSpace(company.Email))
            {
                var response = await http.GetAsync(
                    $"https://api.paystack.co/customer/{Uri.EscapeDataString(company.Email!)}");
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("data", out var data) &&
                    data.TryGetProperty("authorizations", out var auths))
                {
                    var allCards = JsonSerializer.Deserialize<List<JsonElement>>(auths.GetRawText()) ?? [];
                    // Only return reusable cards
                    cards = allCards
                        .Where(c => c.TryGetProperty("reusable", out var r) && r.GetBoolean())
                        .Select(c => (object)JsonSerializer.Deserialize<object>(c.GetRawText())!)
                        .ToList();
                }
            }

            results.Add(new
            {
                companyId   = company.CompanyId,
                companyName = company.CompanyName,
                email       = company.Email ?? "",
                hasEmail    = !string.IsNullOrWhiteSpace(company.Email),
                cards,
            });
        }
        return results;
    }

    // ── Initialise card-capture for a specific company ───────────────────────
    public async Task<object> InitialiseCardCaptureAsync(int userId, int companyId)
    {
        var company = await GetOwnedCompanyAsync(userId, companyId);
        AddAuth();

        var body = JsonSerializer.Serialize(new
        {
            email    = company.Email,
            amount   = 5000,
            currency = "ZAR",
            channels = new[] { "card" },
            metadata = new
            {
                purpose    = "card_capture",
                user_id    = userId,
                company_id = companyId,
                custom_fields = new[]
                {
                    new { display_name = "Company", variable_name = "company", value = company.CompanyName },
                }
            },
        });

        var response = await http.PostAsync(
            "https://api.paystack.co/transaction/initialize",
            new StringContent(body, Encoding.UTF8, "application/json"));

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        // Return data + email so frontend can confirm which company this is for
        if (doc.RootElement.TryGetProperty("data", out var d))
        {
            var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(d.GetRawText())!;
            return new
            {
                access_code       = data.GetValueOrDefault("access_code").GetString(),
                reference         = data.GetValueOrDefault("reference").GetString(),
                authorization_url = data.GetValueOrDefault("authorization_url").GetString(),
                email             = company.Email,
                companyName       = company.CompanyName,
            };
        }
        return JsonSerializer.Deserialize<object>(json)!;
    }
}
