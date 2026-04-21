namespace OnlyGlamps.Api.Models.Entities;

public class ObjectType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? ColorFrom { get; set; }
    public string? ColorTo { get; set; }

    // Comma-separated list of built-in field keys (capacity, beds, rooms, area,
    // minRentalDays, maxRentalDays, checkInTime, checkOutTime, isWhole,
    // childrenAllowed, petsAllowed, smokingAllowed, eventsAllowed, deposit, rules)
    // that should be HIDDEN in the editor for this object type.
    public string? DisabledBuiltinFields { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GlampingObject> Objects { get; set; } = [];
    public ICollection<ObjectTypeField> Fields { get; set; } = [];
}
