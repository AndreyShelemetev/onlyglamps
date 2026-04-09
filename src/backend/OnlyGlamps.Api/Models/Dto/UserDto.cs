using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Models.Dto;

public record UserDto
{
    public int Id { get; init; }
    public string? Username { get; init; }
    public string FirstName { get; init; } = "";
    public string? LastName { get; init; }
    public string? AvatarUrl { get; init; }
    public string? Email { get; init; }
    public string Role { get; init; } = "";
    public bool HasOwnerProfile { get; init; }
    public string? Bio { get; init; }
    public string? VkUrl { get; init; }
    public string? TelegramUrl { get; init; }

    public static UserDto FromEntity(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        FirstName = user.FirstName,
        LastName = user.LastName,
        AvatarUrl = user.AvatarUrl,
        Email = user.Email,
        Role = user.Role.ToString(),
        HasOwnerProfile = user.OwnerProfile != null,
        Bio = user.Bio,
        VkUrl = user.VkUrl,
        TelegramUrl = user.TelegramUrl,
    };
}
