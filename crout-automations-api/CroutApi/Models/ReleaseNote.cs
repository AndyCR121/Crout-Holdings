namespace CroutApi.Models;

public class ReleaseNote
{
    public int RefRelease { get; set; }
    public string ReleaseVersion { get; set; } = string.Empty;
    public DateOnly ReleaseDate { get; set; }
    public string ReleaseNotes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
