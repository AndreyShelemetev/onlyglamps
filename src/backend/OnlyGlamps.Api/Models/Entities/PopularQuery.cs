namespace OnlyGlamps.Api.Models.Entities;

public class PopularQuery
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public string FilterParam { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
