using System.Text.RegularExpressions;
using Ganss.Xss;

namespace CroutApi.Helpers;

public sealed partial class ReleaseNotesHtmlSanitizer
{
    private readonly HtmlSanitizer _sanitizer;

    public ReleaseNotesHtmlSanitizer()
    {
        _sanitizer = new HtmlSanitizer();
        _sanitizer.AllowedTags.Clear();
        _sanitizer.AllowedAttributes.Clear();
        _sanitizer.AllowedCssProperties.Clear();
        _sanitizer.AllowedAtRules.Clear();
        _sanitizer.AllowedSchemes.Clear();

        foreach (var tag in new[] { "p", "br", "strong", "em", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a" })
        {
            _sanitizer.AllowedTags.Add(tag);
        }

        foreach (var attribute in new[] { "href", "target", "rel" })
        {
            _sanitizer.AllowedAttributes.Add(attribute);
        }

        foreach (var scheme in new[] { "http", "https", "mailto" })
        {
            _sanitizer.AllowedSchemes.Add(scheme);
        }
    }

    public string Sanitize(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            throw new ArgumentException("Release notes are required.");
        }

        var sanitized = _sanitizer.Sanitize(html);
        sanitized = EnsureBlankTargetsUseSafeRel(sanitized);

        if (string.IsNullOrWhiteSpace(sanitized))
        {
            throw new ArgumentException("Release notes are required.");
        }

        return sanitized.Trim();
    }

    private static string EnsureBlankTargetsUseSafeRel(string html) =>
        BlankTargetAnchorRegex().Replace(html, static match =>
        {
            var attributes = match.Groups["attrs"].Value;
            var relMatch = RelAttributeRegex().Match(attributes);

            if (!relMatch.Success)
            {
                return $"<a{attributes} rel=\"noopener noreferrer\">";
            }

            var relValue = relMatch.Groups["value"].Value;
            var relParts = relValue
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            relParts.Add("noopener");
            relParts.Add("noreferrer");

            var updatedRel = $"rel=\"{string.Join(' ', relParts)}\"";
            var updatedAttributes = RelAttributeRegex().Replace(attributes, updatedRel, 1);
            return $"<a{updatedAttributes}>";
        });

    [GeneratedRegex("<a(?<attrs>[^>]*\\starget\\s*=\\s*[\"']_blank[\"'][^>]*)>", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex BlankTargetAnchorRegex();

    [GeneratedRegex("rel\\s*=\\s*[\"'](?<value>[^\"']*)[\"']", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RelAttributeRegex();
}
