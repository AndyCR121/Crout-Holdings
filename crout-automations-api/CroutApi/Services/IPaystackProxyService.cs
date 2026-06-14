namespace CroutApi.Services;

public interface IPaystackProxyService
{
    Task<object> GetSubscriptionsAsync(int userId);
    Task<object> GetCompanyBillingAsync(int userId);
    Task<object> InitialiseCardCaptureAsync(int userId, int companyId);
}
