namespace OnlyGlamps.Api.Models.Entities;

public class CityOrDistrict
{
    public int Id { get; set; }
    public int RegionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsCity { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Region Region { get; set; } = null!;
    public ICollection<GlampingObject> Objects { get; set; } = [];
}
