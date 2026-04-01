namespace OnlyGlamps.Api.Models.Entities;

public class ObjectType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? ColorFrom { get; set; }
    public string? ColorTo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GlampingObject> Objects { get; set; } = [];
}
