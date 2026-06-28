using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.DTOs.ServiceTriggers;
using CroutApi.Models;
using CroutApi.Repositories;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class ServiceTriggerService(IServiceTriggerRepository repo, IHttpClientFactory httpFactory, IOptions<N8nOptions> n8nOptions) : IServiceTriggerService
{
    public async Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId)
    {
        var configs = await repo.GetConfigsAsync(userId, companyId, serviceId);
        return configs.Select(ToDto);
    }

    public async Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames)
    {
        var config = await repo.GetConfigForExecutionAsync(userId, configId, companyId, userServiceId)
            ?? throw new UnauthorizedAccessException("Trigger config is not available for this service.");

        var requestPayload = BuildRequestPayload(config, payloadJson, fileNames);
        var baseUrl = n8nOptions.Value.BaseUrl;
        var apiKey = n8nOptions.Value.ApiKey;
        var liveReady = !string.IsNullOrWhiteSpace(baseUrl) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(config.EndpointPath);

        var status = "queued";
        var mode = liveReady ? "live" : "mock";
        string? error = null;
        JsonElement response;

        if (!liveReady)
        {
            response = Parse("""
            {"accepted":true,"mode":"mock","message":"Workflow queued locally because live n8n environment values are not configured."}
            """)!.Value;
        }
        else
        {
            try
            {
                response = await CallN8nAsync(baseUrl!, apiKey!, config.EndpointPath!, requestPayload);
            }
            catch (Exception ex)
            {
                status = "failed";
                error = ex.Message;
                mode = "live";
                response = Parse(JsonSerializer.Serialize(new { accepted = false, mode, message = "n8n call failed.", error }))!.Value;
            }
        }

        var execution = new ServiceTriggerExecution
        {
            ServiceTriggerConfigId = config.ServiceTriggerConfigId,
            UserId = userId,
            CompanyId = companyId,
            UserServiceId = userServiceId ?? config.UserServiceId,
            RequestPayload = requestPayload,
            ResponsePayload = response.GetRawText(),
            Status = status,
            Mode = mode,
            ErrorMessage = error
        };
        var executionId = await repo.CreateExecutionAsync(execution);

        var message = mode == "mock"
            ? "Workflow queued in mock mode. Configure backend n8n environment values for live execution."
            : status == "failed" ? "Workflow execution failed." : "Workflow sent to n8n.";
        return new ExecuteTriggerResponseDto(executionId, status, mode, message, response);
    }

    private static ServiceTriggerConfigDto ToDto(ServiceTriggerConfig config) => new(
        config.ServiceTriggerConfigId,
        config.ServiceId,
        config.UserServiceId,
        config.WorkflowId,
        config.TriggerType,
        config.Label,
        config.Description,
        config.Method,
        config.RequiresConfirmation,
        Parse(config.PayloadTemplate),
        Parse(config.FieldsJson),
        Parse(config.FileUploadJson),
        config.ResponseMode);

    private static string BuildRequestPayload(ServiceTriggerConfig config, string? payloadJson, IEnumerable<string> fileNames)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson);
        var payload = new
        {
            workflowId = config.WorkflowId,
            triggerType = config.TriggerType,
            payload = doc.RootElement.Clone(),
            files = fileNames.Select(name => new { name }).ToArray()
        };
        return JsonSerializer.Serialize(payload);
    }

    private async Task<JsonElement> CallN8nAsync(string baseUrl, string apiKey, string endpointPath, string requestPayload)
    {
        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        var url = new Uri(new Uri(baseUrl.TrimEnd('/') + "/"), endpointPath.TrimStart('/'));
        var response = await client.PostAsync(url, new StringContent(requestPayload, Encoding.UTF8, "application/json"));
        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"n8n returned {(int)response.StatusCode}.");
        return Parse(string.IsNullOrWhiteSpace(content) ? "{\"accepted\":true}" : content)!.Value;
    }

    private static JsonElement? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }
}
