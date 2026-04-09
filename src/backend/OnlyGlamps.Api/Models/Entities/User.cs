namespace OnlyGlamps.Api.Models.Entities;

public class User
{
    public int Id { get; set; }
    public long? TelegramId { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? Username { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime AuthDate { get; set; }
    public UserRole Role { get; set; } = UserRole.User;
    public string? Bio { get; set; }
    public string? VkUrl { get; set; }
    public string? TelegramUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public OwnerProfile? OwnerProfile { get; set; }
    public ICollection<GlampingObject> Objects { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<Inquiry> Inquiries { get; set; } = [];
    public ICollection<Article> Articles { get; set; } = [];
}
