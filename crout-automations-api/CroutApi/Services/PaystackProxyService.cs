using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.Repositories;

namespace CroutApi.Services;

/// <summary>
/// Server-side proxy for the Paystack API.
/// Secret key NEVER reaches the frontend.
///
/// Card fetching flow (Paystack):
///   1. GET /customer/{email} — reads authorizations[] directly from the customer object.
///      Each JsonElement is .Clone()'d before the JsonDocument is disposed so the
///      data survives outside the using block.
///   2. If authorizations is empty/missing, fall back to
///      GET /transaction?customer={code}&status=success — scan for unique reusable
///      authorizations. Also cloned before disposal.
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

    // ── Validate company belongs to user ─────────────────────────────────────
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

    // ── Fetch reusable cards for a given email ────────────────────────────────
    /// <summary>
    /// Returns a deduplicated list of reusable authorization objects as cloned
    /// JsonElements (safe to use after their source JsonDocument is disposed).
    ///
    /// Primary:  GET /customer/{email}  →  authorizations[]
    /// Fallback: GET /transaction?customer={code}&amp;status=success  →  scan for unique auths
    /// </summary>
    private async Task<List<JsonElement>> FetchReusableCardsAsync(string email)
    {
        // ── Step 1: fetch customer record ───────────────────────────────────────
        var custResponse = await http.GetAsync(
            $"https://api.paystack.co/customer/{Uri.EscapeDataString(email)}");
        var custJson = await custResponse.Content.ReadAsStringAsync();

        var cards = new List<JsonElement>();
        string? customerCode = null;

        // Parse customer doc — clone every element we need BEFORE disposing
        using (var custDoc = JsonDocument.Parse(custJson))
        {
            if (!custDoc.RootElement.TryGetProperty("data", out var custData))
                return cards; // no data at all — email not on Paystack yet

            // Grab customer_code for fallback
            if (custData.TryGetProperty("customer_code", out var cc))
                customerCode = cc.GetString();

            // Primary path: authorizations[] on the customer object
            if (custData.TryGetProperty("authorizations", out var auths))
            {
                foreach (var auth in auths.EnumerateArray())
                {
                    if (!auth.TryGetProperty("reusable", out var r) || !r.GetBoolean())
                        continue;
                    // .Clone() copies the element out of the document's memory buffer
                    cards.Add(auth.Clone());
                }
            }
        } // custDoc disposed here — safe because we cloned above

        // ── Step 2: fallback — scan transactions if no cards found yet ────────────
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

                        var authCode = auth.TryGetProperty("authorization_code", out var ac)
                            ? ac.GetString() : null;
                        if (authCode is null || !seen.Add(authCode)) continue;

                        // Clone before txDoc is disposed
                        cards.Add(auth.Clone());
                    }
                }
            } // txDoc disposed here — safe because we cloned above
        }

        return cards;
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
                // Deserialize immediately while doc is still in scope
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

    // ── Per-company cards ─────────────────────────────────────────────────────
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
                var fetched = await FetchReusableCardsAsync(company.Email!);
                // Deserialize each cloned element into a plain object for JSON serialization
                cards = fetched
                    .Select(el => JsonSerializer.Deserialize<object>(el.GetRawText())!)
                    .ToList();
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

    // ── Initialise card-capture for a specific company ────────────────────────
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
            // Deserialize while doc is in scope
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
