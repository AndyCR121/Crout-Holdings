using System.Text.Json.Nodes;
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
