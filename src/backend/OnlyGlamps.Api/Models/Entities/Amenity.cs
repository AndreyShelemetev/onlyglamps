namespace OnlyGlamps.Api.Models.Entities;

public class Amenity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ObjectAmenity> ObjectAmenities { get; set; } = [];
}
