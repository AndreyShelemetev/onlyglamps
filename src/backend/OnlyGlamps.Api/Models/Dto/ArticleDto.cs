namespace OnlyGlamps.Api.Models.Dto;

public record ArticleCreateDto(
    string Title,
    string H1,
    string Description,
    string Slug,
    string? CoverImageUrl,
    string? Content,
    int Views,
    int ReadTimeMinutes,
    string Status
);

public record ArticleListItemDto
{
    public int Id { get; init; }
    public string Title { get; init; } = "";
    public string H1 { get; init; } = "";
    public string Description { get; init; } = "";
    public string Slug { get; init; } = "";
    public string? CoverImageUrl { get; init; }
    public int Views { get; init; }
    public int ReadTimeMinutes { get; init; }
    public DateTime CreatedAt { get; init; }
    public AuthorShortDto Author { get; init; } = new();
}

public record ArticleDetailDto
{
    public int Id { get; init; }
    public string Title { get; init; } = "";
    public string H1 { get; init; } = "";
    public string Description { get; init; } = "";
    public string Slug { get; init; } = "";
    public string? CoverImageUrl { get; init; }
    public string Content { get; init; } = "";
    public int Views { get; init; }
    public int ReadTimeMinutes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public AuthorDetailDto Author { get; init; } = new();
}

public record ArticleAdminListItemDto
{
    public int Id { get; init; }
    public string Title { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Status { get; init; } = "";
    public int Views { get; init; }
    public int ReadTimeMinutes { get; init; }
    public DateTime CreatedAt { get; init; }
    public AuthorShortDto Author { get; init; } = new();
}

public record ArticleAdminDetailDto : ArticleAdminListItemDto
{
    public string H1 { get; init; } = "";
    public string Description { get; init; } = "";
    public string? CoverImageUrl { get; init; }
    public string Content { get; init; } = "";
    public DateTime? UpdatedAt { get; init; }
    public int AuthorId { get; init; }
}
