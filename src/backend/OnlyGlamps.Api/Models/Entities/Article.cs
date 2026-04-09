namespace OnlyGlamps.Api.Models.Entities;

public class Article
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string H1 { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public int Views { get; set; }
    public int ReadTimeMinutes { get; set; }
    public ArticleStatus Status { get; set; } = ArticleStatus.Draft;

    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
