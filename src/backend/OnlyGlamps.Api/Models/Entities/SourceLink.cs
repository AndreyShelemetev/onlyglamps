namespace OnlyGlamps.Api.Models.Entities;

public class SourceLink
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public GlampingObject Object { get; set; } = null!;
}
