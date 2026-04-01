namespace OnlyGlamps.Api.Models.Entities;

public class Review
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public int UserId { get; set; }
    public int Rating { get; set; }
    public string Text { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public GlampingObject Object { get; set; } = null!;
    public User User { get; set; } = null!;
}
