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
}
