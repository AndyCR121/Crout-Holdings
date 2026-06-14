namespace CroutApi.Services;

public interface IPaystackProxyService
{
    Task<object> GetSubscriptionsAsync(int userId);
    Task<object> GetCardsAsync(int userId);
    Task<object> InitialiseCardCaptureAsync(int userId);
}
