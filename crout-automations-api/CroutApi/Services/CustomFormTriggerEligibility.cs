using System.Text.Json.Nodes;
using CroutApi.DTOs;
using CroutApi.Models;

namespace CroutApi.Services;

/// <summary>
/// Shared "does this service have a confirmed Custom Form trigger add-on" check.
/// Extracted so the authenticated renderer path and the share-link path can never drift.
/// </summary>
public static class CustomFormTriggerEligibility
{
    public static bool HasConfirmedCustomFormTrigger(string? configJson)
    {
        if (string.IsNullOrWhiteSpace(configJson)) return false;

        try
        {
            var config = JsonNode.Parse(configJson) as JsonObject;
            if (config is null) return false;

            if (config["trigger"] is JsonArray triggerValues
                && triggerValues.OfType<JsonValue>()
                    .Select(value => value.TryGetValue<string>(out var raw) ? raw : null)
                    .Any(IsCustomFormName))
            {
                return true;
            }

            if (config["confirmedAddons"] is JsonArray confirmedAddons)
            {
                foreach (var addon in confirmedAddons.OfType<JsonObject>())
                {
                    if (!string.Equals(addon["type"]?.GetValue<string>(), WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (IsCustomFormName(addon["name"]?.GetValue<string>()))
                        return true;
                }
            }
        }
        catch
        {
            return false;
        }

        return false;
    }

    public static bool IsCustomFormName(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant().Replace(" ", string.Empty).Replace("-", string.Empty).Replace("_", string.Empty);
        return normalized is "websiteform" or "customform";
    }
}

/// <summary>
/// Shared "does this integration have a usable Custom Form schema" check — extracted for the
/// same reason as CustomFormTriggerEligibility above: the share-link generate path and the
/// public resolve path must never drift on what counts as publishable.
///
/// A schema is usable either because it was explicitly published (PublishCustomFormAsync), or
/// because the integration's n8n workflow is already Live: some integrations were wired up
/// directly in n8n before this dev form builder existed (or without ever using its Publish
/// step), and their form only ever has a draft row. Requiring an explicit publish for those
/// would mean they could never have a working share link even though they're already serving
/// real client traffic.
/// </summary>
public static class CustomFormPublishEligibility
{
    public static bool HasUsableSchema(CustomFormAccessContextDto context)
    {
        if (!string.IsNullOrWhiteSpace(context.PublishedSchemaJson)) return true;
        return IsLive(context.Status) && !string.IsNullOrWhiteSpace(context.DraftSchemaJson);
    }

    private static bool IsLive(string? status) =>
        string.Equals(status, IntegrationStatuses.Live, StringComparison.OrdinalIgnoreCase);
}
