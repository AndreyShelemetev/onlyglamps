namespace OnlyGlamps.Api.Models.Dto;

public record AuthorShortDto
{
    public string FirstName { get; init; } = "";
    public string? LastName { get; init; }
}

public record AuthorDetailDto : AuthorShortDto
{
    public string? AvatarUrl { get; init; }
    public string? Bio { get; init; }
    public string? VkUrl { get; init; }
    public string? TelegramUrl { get; init; }
}

public record AuthorProfileUpdateDto(
    string FirstName,
    string? LastName,
    string? Bio,
    string? VkUrl,
    string? TelegramUrl
);
