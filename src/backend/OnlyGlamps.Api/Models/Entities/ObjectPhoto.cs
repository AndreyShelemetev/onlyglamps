namespace OnlyGlamps.Api.Models.Entities;

public class ObjectPhoto
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Alt { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public GlampingObject Object { get; set; } = null!;
}
