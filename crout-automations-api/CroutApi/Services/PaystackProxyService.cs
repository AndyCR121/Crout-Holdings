using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.Repositories;

namespace CroutApi.Services;

/// <summary>
/// Server-side proxy for the Paystack API.
/// Secret key NEVER reaches the frontend.
///
/// Card-save flow:
///   1. POST /transaction/initialize  → access_code + reference
///   2. Frontend opens Paystack popup
///   3. Popup fires onSuccess(reference)
///   4. POST /api/paystack/verify      → commits authorization to customer record
///                                        then immediately refunds the R50 charge
///   5. GET  /api/paystack/companies   → customer authorizations now visible
/// </summary>
public class PaystackProxyService(
    IUserRepository    users,
    ICompanyRepository companies,
    IConfiguration     config,
    HttpClient         http) : IPaystackProxyService
{
    /// <summary>
    /// All bodies sent to Paystack MUST use camelCase — Paystack is case-sensitive.
    /// Using this explicitly avoids any dependency on the global ASP.NET serialiser config.
    /// </summary>
    private static readonly JsonSerializerOptions CamelCase = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private string SecretKey =>
        config["Paystack:SecretKey"]
        ?? Environment.GetEnvironmentVariable("PAYSTACK_SECRET_KEY")
        ?? throw new InvalidOperationException(
            "Paystack secret key not configured. Set PAYSTACK_SECRET_KEY env var.");

    private void AddAuth() =>
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", SecretKey);

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload, CamelCase), Encoding.UTF8, "application/json");

    // ── Validate company belongs to user ────────────────────────────────────────
    private async Task<CroutApi.Models.Company> GetOwnedCompanyAsync(int userId, int companyId)
    {
        var userCompanies = await companies.GetByUserAsync(userId);
        var company = userCompanies.FirstOrDefault(c => c.CompanyId == companyId)
            ?? throw new UnauthorizedAccessException("Company not found or does not belong to this user.");
        if (string.IsNullOrWhiteSpace(company.Email))
            throw new ArgumentException(
                $"Company '{company.CompanyName}' has no email address set. Please update it in your profile.");
        return company;
    }

    // ── Fetch reusable cards for a given email ────────────────────────────
    private async Task<List<object>> FetchReusableCardsAsync(string email)
    {
        var cards = new List<object>();
        string? customerCode = null;

        var custResponse = await http.GetAsync(
            $"https://api.paystack.co/customer/{Uri.EscapeDataString(email)}");
        var custJson = await custResponse.Content.ReadAsStringAsync();

        using (var custDoc = JsonDocument.Parse(custJson))
        {
            if (custDoc.RootElement.TryGetProperty("data", out var custData))
            {
                if (custData.TryGetProperty("customer_code", out var cc))
                    customerCode = cc.GetString();

                if (custData.TryGetProperty("authorizations", out var auths))
                {
                    foreach (var auth in auths.EnumerateArray())
                    {
                        if (!auth.TryGetProperty("reusable", out var r) || !r.GetBoolean()) continue;
                        var card = JsonSerializer.Deserialize<object>(auth.GetRawText());
                        if (card is not null) cards.Add(card);
                    }
                }
            }
        }

        if (cards.Count == 0 && !string.IsNullOrWhiteSpace(customerCode))
        {
            var txResponse = await http.GetAsync(
                $"https://api.paystack.co/transaction?customer={Uri.EscapeDataString(customerCode!)}&status=success&perPage=100");
            var txJson = await txResponse.Content.ReadAsStringAsync();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            using (var txDoc = JsonDocument.Parse(txJson))
            {
                if (txDoc.RootElement.TryGetProperty("data", out var txData))
                {
                    foreach (var tx in txData.EnumerateArray())
                    {
                        if (!tx.TryGetProperty("authorization", out var auth)) continue;
                        if (!auth.TryGetProperty("reusable", out var reusable) || !reusable.GetBoolean()) continue;
                        var authCode = auth.TryGetProperty("authorization_code", out var ac) ? ac.GetString() : null;
                        if (authCode is null || !seen.Add(authCode)) continue;
                        var card = JsonSerializer.Deserialize<object>(auth.GetRawText());
                        if (card is not null) cards.Add(card);
                    }
                }
            }
        }

        return cards;
    }

    // ── Verify transaction + auto-refund the R50 card-capture charge ──────────
    public async Task<object> VerifyTransactionAsync(string reference)
    {
        AddAuth();
        var response = await http.GetAsync(
            $"https://api.paystack.co/transaction/verify/{Uri.EscapeDataString(reference)}");
        var json = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(json);
        var status = doc.RootElement.TryGetProperty("data", out var data)
                     && data.TryGetProperty("status", out var s)
                     ? s.GetString() : "unknown";
        var message = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : null;

        // Card successfully captured — immediately refund the R50 tokenisation charge
        object? refundResult = null;
        if (status == "success")
        {
            try
            {
                refundResult = await RefundTransactionAsync(reference);
            }
            catch (Exception ex)
            {
                // Refund failure must NOT block the card from being saved.
                // Log and surface the warning so it can be investigated manually.
                refundResult = new { success = false, message = $"Refund failed: {ex.Message}" };
            }
        }

        return new { verified = status == "success", status, message, refund = refundResult };
    }

    // ── Refund transaction ─────────────────────────────────────────────────────
    public async Task<object> RefundTransactionAsync(string reference)
    {
        AddAuth();
        var response = await http.PostAsync(
            "https://api.paystack.co/refund",
            JsonBody(new
            {
                transaction    = reference,
                merchant_note  = "Auto-refund: R50 card tokenisation charge",
            }));

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var success = doc.RootElement.TryGetProperty("status", out var s) && s.GetBoolean();
        var message = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : null;

        return new { success, message };
    }

    // ── Subscriptions ──────────────────────────────────────────────────────────
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
            if (doc.RootElement.TryGetProperty("data", out var d))
            {
                var subs = JsonSerializer.Deserialize<object>(d.GetRawText());
                results.Add(new
                {
                    companyId     = company.CompanyId,
                    companyName   = company.CompanyName,
                    email         = company.Email,
                    subscriptions = subs,
                });
            }
        }
        return results;
    }

    // ── Per-company cards ──────────────────────────────────────────────────
    public async Task<object> GetCompanyBillingAsync(int userId)
    {
        var userCompanies = await companies.GetByUserAsync(userId);
        AddAuth();

        var results = new List<object>();
        foreach (var company in userCompanies)
        {
            var cards = new List<object>();
            if (!string.IsNullOrWhiteSpace(company.Email))
                cards = await FetchReusableCardsAsync(company.Email!);

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

    // ── Initialise card-capture ─────────────────────────────────────────────
    public async Task<object> InitialiseCardCaptureAsync(int userId, int companyId)
    {
        var company = await GetOwnedCompanyAsync(userId, companyId);
        AddAuth();

        var response = await http.PostAsync(
            "https://api.paystack.co/transaction/initialize",
            JsonBody(new
            {
                email    = company.Email,
                amount   = 5000,   // 5000 kobo = R50 ZAR (minimum for card tokenisation)
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
            }));

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

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

    // ── Remove card ───────────────────────────────────────────────────────────
    public async Task<object> RemoveCardAsync(int userId, int companyId, string authorizationCode)
    {
        await GetOwnedCompanyAsync(userId, companyId);
        AddAuth();

        var response = await http.PostAsync(
            "https://api.paystack.co/customer/deactivate_authorization",
            JsonBody(new { authorization_code = authorizationCode }));

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var status  = doc.RootElement.TryGetProperty("status",  out var s) && s.GetBoolean();
        var message = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : null;

        return new { success = status, message };
    }

    // ── Set default card ───────────────────────────────────────────────────────
    public async Task<object> SetDefaultCardAsync(int userId, int companyId, string authorizationCode)
    {
        var company = await GetOwnedCompanyAsync(userId, companyId);
        AddAuth();

        var cards  = await FetchReusableCardsAsync(company.Email!);
        var json   = JsonSerializer.Serialize(cards);
        var exists = json.Contains(authorizationCode, StringComparison.OrdinalIgnoreCase);

        if (!exists)
            return new { success = false, message = "Authorization code not found for this company." };

        // TODO (optional): persist preferred_authorization_code to your DB here
        return new { success = true, message = "Default card updated." };
    }
}
