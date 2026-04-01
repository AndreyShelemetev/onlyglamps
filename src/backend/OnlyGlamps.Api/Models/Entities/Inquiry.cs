namespace OnlyGlamps.Api.Models.Entities;

public class Inquiry
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public int? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public GlampingObject Object { get; set; } = null!;
    public User? User { get; set; }
}
