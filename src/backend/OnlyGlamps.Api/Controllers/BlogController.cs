using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Dto;
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

    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    private static readonly string[] AllowedAvatarExtensions = [".jpg", ".jpeg", ".png", ".webp"];

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
            .Select(a => new ArticleListItemDto
            {
                Id = a.Id,
                Title = a.Title,
                H1 = a.H1,
                Description = a.Description,
                Slug = a.Slug,
                CoverImageUrl = a.CoverImageUrl,
                Views = a.Views,
                ReadTimeMinutes = a.ReadTimeMinutes,
                CreatedAt = a.CreatedAt,
                Author = new AuthorShortDto { FirstName = a.Author.FirstName, LastName = a.Author.LastName }
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

        article.Views++;
        await _db.SaveChangesAsync();

        return Ok(new ArticleDetailDto
        {
            Id = article.Id,
            Title = article.Title,
            H1 = article.H1,
            Description = article.Description,
            Slug = article.Slug,
            CoverImageUrl = article.CoverImageUrl,
            Content = article.Content,
            Views = article.Views,
            ReadTimeMinutes = article.ReadTimeMinutes,
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt,
            Author = new AuthorDetailDto
            {
                FirstName = article.Author.FirstName,
                LastName = article.Author.LastName,
                AvatarUrl = article.Author.AvatarUrl,
                Bio = article.Author.Bio,
                VkUrl = article.Author.VkUrl,
                TelegramUrl = article.Author.TelegramUrl
            }
        });
    }

    // ── Admin endpoints ──

    [HttpGet("admin/list")]
    [Authorize(Roles = "Admin,Author,Editor")]
    public async Task<IActionResult> AdminList()
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        var user = userId.HasValue ? await _db.Users.FindAsync(userId.Value) : null;

        var query = _db.Articles.AsQueryable();

        // Authors can only see their own articles
        if (user?.Role == UserRole.Author)
            query = query.Where(a => a.AuthorId == userId!.Value);

        var articles = await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new ArticleAdminListItemDto
            {
                Id = a.Id,
                Title = a.Title,
                Slug = a.Slug,
                Status = a.Status.ToString(),
                Views = a.Views,
                ReadTimeMinutes = a.ReadTimeMinutes,
                CreatedAt = a.CreatedAt,
                Author = new AuthorShortDto { FirstName = a.Author.FirstName, LastName = a.Author.LastName }
            })
            .ToListAsync();

        return Ok(articles);
    }

    [HttpGet("admin/{id:int}")]
    [Authorize(Roles = "Admin,Author,Editor")]
    public async Task<IActionResult> AdminGet(int id)
    {
        var article = await _db.Articles
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (article == null) return NotFound();

        return Ok(new ArticleAdminDetailDto
        {
            Id = article.Id,
            Title = article.Title,
            H1 = article.H1,
            Description = article.Description,
            Slug = article.Slug,
            CoverImageUrl = article.CoverImageUrl,
            Content = article.Content,
            Views = article.Views,
            ReadTimeMinutes = article.ReadTimeMinutes,
            Status = article.Status.ToString(),
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt,
            AuthorId = article.AuthorId,
            Author = new AuthorShortDto { FirstName = article.Author.FirstName, LastName = article.Author.LastName }
        });
    }

    [HttpPost("admin")]
    [Authorize(Roles = "Admin,Author,Editor")]
    public async Task<IActionResult> Create([FromBody] ArticleCreateDto dto)
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();

        if (!Enum.TryParse<ArticleStatus>(dto.Status, out var status))
            return BadRequest(new { error = "Недопустимый статус" });

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
            Status = status,
            AuthorId = userId.Value
        };

        _db.Articles.Add(article);
        await _db.SaveChangesAsync();

        return Ok(new { article.Id });
    }

    [HttpPut("admin/{id:int}")]
    [Authorize(Roles = "Admin,Author,Editor")]
    public async Task<IActionResult> Update(int id, [FromBody] ArticleCreateDto dto)
    {
        if (!Enum.TryParse<ArticleStatus>(dto.Status, out var status))
            return BadRequest(new { error = "Недопустимый статус" });

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
        article.Status = status;
        article.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { article.Id });
    }

    [HttpDelete("admin/{id:int}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Delete(int id)
    {
        var article = await _db.Articles.FindAsync(id);
        if (article == null) return NotFound();

        _db.Articles.Remove(article);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("admin/upload")]
    [Authorize(Roles = "Admin,Author,Editor")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Файл не выбран" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
            return BadRequest(new { error = "Разрешены только изображения: jpg, png, webp, gif" });

        using var stream = file.OpenReadStream();
        var url = await _storage.UploadFileAsync(stream, file.FileName, file.ContentType, "blog");
        return Ok(new { url });
    }

    // ── Author profile ──

    [HttpGet("author/profile")]
    [Authorize(Roles = "Admin,Author,Editor")]
    public async Task<IActionResult> GetAuthorProfile()
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();
        var user = await _db.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        return Ok(new AuthorDetailDto
        {
            FirstName = user.FirstName,
            LastName = user.LastName,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            VkUrl = user.VkUrl,
            TelegramUrl = user.TelegramUrl
        });
    }

    [HttpPut("author/profile")]
    [Authorize(Roles = "Admin,Author,Editor")]
    public async Task<IActionResult> UpdateAuthorProfile([FromBody] AuthorProfileUpdateDto dto)
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
    [Authorize(Roles = "Admin,Author,Editor")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Файл не выбран" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedAvatarExtensions.Contains(ext))
            return BadRequest(new { error = "Разрешены только: jpg, png, webp" });

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
