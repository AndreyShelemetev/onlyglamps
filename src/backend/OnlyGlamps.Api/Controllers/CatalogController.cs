using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CatalogController : ControllerBase
{
    private readonly AppDbContext _db;

    public CatalogController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetObjectTypes()
    {
        var types = await _db.ObjectTypes
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.Slug, t.Icon, t.ColorFrom, t.ColorTo })
            .ToListAsync();
        return Ok(types);
    }

    [HttpGet("amenities")]
    public async Task<IActionResult> GetAmenities()
    {
        var amenities = await _db.Amenities
            .OrderBy(a => a.Name)
            .Select(a => new { a.Id, a.Name, a.Slug, a.Icon })
            .ToListAsync();
        return Ok(amenities);
    }

    [HttpGet("tags")]
    public async Task<IActionResult> GetTags()
    {
        var tags = await _db.Tags
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.Slug })
            .ToListAsync();
        return Ok(tags);
    }

    [HttpGet("popular-queries")]
    public async Task<IActionResult> GetPopularQueries()
    {
        var queries = await _db.PopularQueries
            .Where(q => q.IsActive)
            .OrderBy(q => q.SortOrder)
            .Select(q => new { q.Id, q.Text, q.FilterParam })
            .ToListAsync();
        return Ok(queries);
    }
}
