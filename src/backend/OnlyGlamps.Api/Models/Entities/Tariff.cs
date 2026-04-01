namespace OnlyGlamps.Api.Models.Entities;

public class Tariff
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public GlampingObject Object { get; set; } = null!;
}
