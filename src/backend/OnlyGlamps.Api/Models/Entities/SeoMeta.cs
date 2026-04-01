namespace OnlyGlamps.Api.Models.Entities;

public class SeoMeta
{
    public int Id { get; set; }
    public string PageType { get; set; } = string.Empty;
    public int? RegionId { get; set; }
    public int? CityOrDistrictId { get; set; }
    public int? ObjectTypeId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? H1 { get; set; }
    public string? Text { get; set; }
    public string? FaqJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Region? Region { get; set; }
    public CityOrDistrict? CityOrDistrict { get; set; }
    public ObjectType? ObjectType { get; set; }
}
