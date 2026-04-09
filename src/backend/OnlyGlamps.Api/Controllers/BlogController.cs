using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;
using OnlyGlamps.Api.Services;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/blog")]
public class BlogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StorageService _storage;
    private readonly AuthService _auth;

    public BlogController(AppDbContext db, StorageService storage, AuthService auth)
    {
        _db = db;
        _storage = storage;
        _auth = auth;
    }

    // ── Public endpoints ──

    [HttpGet]
    public async Task<IActionResult> GetArticles(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Articles
            .Where(a => a.Status == ArticleStatus.Published)
            .OrderByDescending(a => a.CreatedAt);

        var total = await query.CountAsync();
        var articles = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.H1,
                a.Description,
                a.Slug,
                a.CoverImageUrl,
                a.Views,
                a.ReadTimeMinutes,
                a.CreatedAt,
                Author = new { a.Author.FirstName, a.Author.LastName }
            })
            .ToListAsync();

        return Ok(new { data = articles, total, page, pageSize });
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var article = await _db.Articles
            .Include(a => a.Author)
            .Where(a => a.Slug == slug && a.Status == ArticleStatus.Published)
            .FirstOrDefaultAsync();

        if (article == null) return NotFound();

        // Increment views
        article.Views++;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            article.Id,
            article.Title,
            article.H1,
            article.Description,
            article.Slug,
            article.CoverImageUrl,
            article.Content,
            article.Views,
            article.ReadTimeMinutes,
            article.CreatedAt,
            article.UpdatedAt,
            Author = new
            {
                article.Author.FirstName,
                article.Author.LastName,
                article.Author.AvatarUrl,
                article.Author.Bio,
                article.Author.VkUrl,
                article.Author.TelegramUrl
            }
        });
    }

    // ── Admin endpoints ──

    [HttpGet("admin/list")]
    [Authorize(Roles = "Admin,Author")]
    public async Task<IActionResult> AdminList()
    {
        var articles = await _db.Articles
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Slug,
                Status = a.Status.ToString(),
                a.Views,
                a.ReadTimeMinutes,
                a.CreatedAt,
                Author = new { a.Author.FirstName, a.Author.LastName }
            })
            .ToListAsync();

        return Ok(articles);
    }

    [HttpGet("admin/{id:int}")]
    [Authorize(Roles = "Admin,Author")]
    public async Task<IActionResult> AdminGet(int id)
    {
        var article = await _db.Articles
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (article == null) return NotFound();

        return Ok(new
        {
            article.Id,
            article.Title,
            article.H1,
            article.Description,
            article.Slug,
            article.CoverImageUrl,
            article.Content,
            article.Views,
            article.ReadTimeMinutes,
            Status = article.Status.ToString(),
            article.CreatedAt,
            article.UpdatedAt,
            article.AuthorId,
            Author = new { article.Author.FirstName, article.Author.LastName }
        });
    }

    public record ArticleDto(
        string Title,
        string H1,
        string Description,
        string Slug,
        string? CoverImageUrl,
        string? Content,
        int Views,
        int ReadTimeMinutes,
        string Status
    );

    [HttpPost("admin")]
    [Authorize(Roles = "Admin,Author")]
    public async Task<IActionResult> Create([FromBody] ArticleDto dto)
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();

        if (await _db.Articles.AnyAsync(a => a.Slug == dto.Slug))
            return BadRequest(new { error = "Статья с таким slug уже существует" });

        var article = new Article
        {
            Title = dto.Title,
            H1 = dto.H1,
            Description = dto.Description,
            Slug = dto.Slug,
            CoverImageUrl = dto.CoverImageUrl,
            Content = dto.Content ?? "",
            Views = dto.Views,
            ReadTimeMinutes = dto.ReadTimeMinutes,
            Status = Enum.Parse<ArticleStatus>(dto.Status),
            AuthorId = userId.Value
        };

        _db.Articles.Add(article);
        await _db.SaveChangesAsync();

        return Ok(new { article.Id });
    }

    [HttpPut("admin/{id:int}")]
    [Authorize(Roles = "Admin,Author")]
    public async Task<IActionResult> Update(int id, [FromBody] ArticleDto dto)
    {
        var article = await _db.Articles.FindAsync(id);
        if (article == null) return NotFound();

        article.Title = dto.Title;
        article.H1 = dto.H1;
        article.Description = dto.Description;
        article.Slug = dto.Slug;
        article.CoverImageUrl = dto.CoverImageUrl;
        article.Content = dto.Content ?? "";
        article.Views = dto.Views;
        article.ReadTimeMinutes = dto.ReadTimeMinutes;
        article.Status = Enum.Parse<ArticleStatus>(dto.Status);
        article.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { article.Id });
    }

    [HttpDelete("admin/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var article = await _db.Articles.FindAsync(id);
        if (article == null) return NotFound();

        _db.Articles.Remove(article);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("admin/upload")]
    [Authorize(Roles = "Admin,Author")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Файл не выбран");

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest("Разрешены только изображения: jpg, png, webp, gif");

        using var stream = file.OpenReadStream();
        var url = await _storage.UploadFileAsync(stream, file.FileName, file.ContentType, "blog");
        return Ok(new { url });
    }

    // ── Author profile ──

    public record AuthorProfileDto(
        string FirstName,
        string? LastName,
        string? Bio,
        string? VkUrl,
        string? TelegramUrl
    );

    [HttpGet("author/profile")]
    [Authorize(Roles = "Admin,Author")]
    public async Task<IActionResult> GetAuthorProfile()
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();
        var user = await _db.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        return Ok(new
        {
            user.FirstName,
            user.LastName,
            user.AvatarUrl,
            user.Bio,
            user.VkUrl,
            user.TelegramUrl
        });
    }

    [HttpPut("author/profile")]
    [Authorize(Roles = "Admin,Author")]
    public async Task<IActionResult> UpdateAuthorProfile([FromBody] AuthorProfileDto dto)
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();
        var user = await _db.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Bio = dto.Bio;
        user.VkUrl = dto.VkUrl;
        user.TelegramUrl = dto.TelegramUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("author/avatar")]
    [Authorize(Roles = "Admin,Author")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Файл не выбран");

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest("Разрешены только: jpg, png, webp");

        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();
        var user = await _db.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        using var stream = file.OpenReadStream();
        var url = await _storage.UploadFileAsync(stream, file.FileName, file.ContentType, "avatars");

        user.AvatarUrl = url;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { url });
    }
}
