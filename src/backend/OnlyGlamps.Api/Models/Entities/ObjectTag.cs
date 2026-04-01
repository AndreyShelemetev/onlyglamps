namespace OnlyGlamps.Api.Models.Entities;

public class ObjectTag
{
    public int ObjectId { get; set; }
    public int TagId { get; set; }

    public GlampingObject Object { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
