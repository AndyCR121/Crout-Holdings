namespace CroutApi.Helpers;

public class DuplicateReleaseVersionException(string version)
    : Exception($"A release note already exists for version {version}.")
{
    public string Version { get; } = version;
}
