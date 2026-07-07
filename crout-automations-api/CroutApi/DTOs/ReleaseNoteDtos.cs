namespace CroutApi.DTOs;

public record ReleaseNoteUpsertDto(
    string ReleaseVersion,
    DateOnly ReleaseDate,
    string ReleaseNotes
);

public record ReleaseNoteListQueryDto(
    int Page = 1,
    int PageSize = 10,
    string SortBy = "releaseVersion",
    string SortDirection = "desc"
);
