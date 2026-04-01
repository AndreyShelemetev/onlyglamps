namespace OnlyGlamps.Api.Models.Entities;

public class ObjectAmenity
{
    public int ObjectId { get; set; }
    public int AmenityId { get; set; }

    public GlampingObject Object { get; set; } = null!;
    public Amenity Amenity { get; set; } = null!;
}
