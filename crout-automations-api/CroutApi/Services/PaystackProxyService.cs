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
///   5. GET  /api/paystack/companies   → customer authorizations now visible
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

    // ── Validate company belongs to user ────────────────────────────────────────────
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

    // ── Fetch reusable cards for a given email ──────────────────────────────────────────
    /// <summary>
    /// Deserializes card objects to plain CLR objects INSIDE the using block
    /// so they are never dependent on a disposed JsonDocument.
    /// Primary:  GET /customer/{email}  →  authorizations[]
    /// Fallback: GET /transaction?customer={code}  →  scan unique reusable auths
    /// </summary>
    private async Task<List<object>> FetchReusableCardsAsync(string email)
    {
        var cards = new List<object>();
        string? customerCode = null;

        // ── Primary: customer authorizations ────────────────────────────────────────────────
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

        // ── Fallback: scan transactions if authorizations[] was empty ───────────────────
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

    // ── Verify transaction ──────────────────────────────────────────────────────────────
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

        return new { verified = status == "success", status, message };
    }

    // ── Subscriptions ──────────────────────────────────────────────────────────────
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
                var subs = JsonSerializer.Deserialize<object>(data.GetRawText());
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

    // ── Per-company cards ─────────────────────────────────────────────────────────────
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

    // ── Initialise card-capture ─────────────────────────────────────────────────────────
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

    // ── Remove card ──────────────────────────────────────────────────────────────────
    /// <summary>
    /// Deactivates the authorization on Paystack so it can no longer be
    /// charged and no longer appears in the customer's authorization list.
    /// POST https://api.paystack.co/customer/deactivate_authorization
    /// { "authorization_code": "AUTH_xxx" }
    /// </summary>
    public async Task<object> RemoveCardAsync(int userId, int companyId, string authorizationCode)
    {
        // Ownership check — ensures the company belongs to this user
        await GetOwnedCompanyAsync(userId, companyId);
        AddAuth();

        var body = JsonSerializer.Serialize(new { authorization_code = authorizationCode });
        var response = await http.PostAsync(
            "https://api.paystack.co/customer/deactivate_authorization",
            new StringContent(body, Encoding.UTF8, "application/json"));

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var status  = doc.RootElement.TryGetProperty("status",  out var s) && s.GetBoolean();
        var message = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : null;

        return new { success = status, message };
    }

    // ── Set default card ─────────────────────────────────────────────────────────────
    /// <summary>
    /// Paystack does not have a native "set default authorization" endpoint.
    /// Strategy:
    ///   1. Verify ownership.
    ///   2. Confirm the authorization_code exists in the customer's reusable cards.
    ///   3. Return success:true — the frontend reorders optimistically.
    ///      The "default" card is purely a UI concept stored in list order;
    ///      future charge calls should always pass the chosen authorization_code
    ///      explicitly rather than relying on Paystack's implicit default.
    /// If you later store a preferred_authorization_code in your DB per company,
    /// add that persistence here.
    /// </summary>
    public async Task<object> SetDefaultCardAsync(int userId, int companyId, string authorizationCode)
    {
        var company = await GetOwnedCompanyAsync(userId, companyId);
        AddAuth();

        // Confirm the auth code exists for this customer
        var cards = await FetchReusableCardsAsync(company.Email!);
        var json  = JsonSerializer.Serialize(cards);
        var exists = json.Contains(authorizationCode, StringComparison.OrdinalIgnoreCase);

        if (!exists)
            return new { success = false, message = "Authorization code not found for this company." };

        // TODO (optional): persist preferred_authorization_code to your DB here
        // e.g. await companies.SetPreferredAuthAsync(companyId, authorizationCode);

        return new { success = true, message = "Default card updated." };
    }
}
