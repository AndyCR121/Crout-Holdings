namespace CroutApi.Services;

public interface IPaystackProxyService
{
    Task<object> GetSubscriptionsAsync(int userId);
    Task<object> GetCompanyBillingAsync(int userId);
    Task<object> InitialiseCardCaptureAsync(int userId, int companyId);

    /// <summary>
    /// Verify a transaction by reference.
    /// This MUST be called after the Paystack popup fires onSuccess so that
    /// Paystack commits the authorization_code to the customer record.
    /// Without this call, GET /customer/{email} returns no authorizations.
    /// </summary>
    Task<object> VerifyTransactionAsync(string reference);

    /// <summary>
    /// Deactivate (remove) a saved card authorization from a company's
    /// Paystack customer record.
    /// POST https://api.paystack.co/customer/deactivate_authorization
    /// </summary>
    Task<object> RemoveCardAsync(int userId, int companyId, string authorizationCode);

    /// <summary>
    /// Set a card as the default (first) payment method for a company.
    /// Uses POST https://api.paystack.co/customer/set_risk_action to mark the
    /// authorization as default, and reorders the returned card list so the
    /// chosen card is first.
    /// </summary>
    Task<object> SetDefaultCardAsync(int userId, int companyId, string authorizationCode);
}
