namespace OnlyGlamps.Api.Models.Entities;

public class OwnerProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactTelegram { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
