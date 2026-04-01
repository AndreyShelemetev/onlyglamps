using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db) => _db = db;

    [HttpGet("suggest")]
    public async Task<IActionResult> Suggest([FromQuery] string q = "")
    {
        var trimmed = q?.Trim() ?? "";
        if (trimmed.Length < 2)
            return Ok(Array.Empty<object>());

        var pattern = $"%{trimmed}%";

        var objects = await _db.GlampingObjects
            .Where(o => o.Status == ObjectStatus.Published)
            .Where(o => EF.Functions.ILike(o.Name, pattern)
                     || EF.Functions.ILike(o.ShortDescription ?? "", pattern)
                     || EF.Functions.ILike(o.CityOrDistrict.Name, pattern)
                     || EF.Functions.ILike(o.Region.Name, pattern)
                     || EF.Functions.ILike(o.ObjectType.Name, pattern))
            .OrderByDescending(o =>
                o.Reviews.Where(r => r.Status == ReviewStatus.Published).Average(r => (double?)r.Rating) ?? 0)
            .Take(6)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Slug,
                ObjectType = new { o.ObjectType.Name, o.ObjectType.Slug },
                Region = new { o.Region.Name, o.Region.Slug },
                CityOrDistrict = new { o.CityOrDistrict.Name, o.CityOrDistrict.Slug },
                Rating = o.Reviews.Any(r => r.Status == ReviewStatus.Published)
                    ? Math.Round(o.Reviews.Where(r => r.Status == ReviewStatus.Published).Average(r => r.Rating), 1)
                    : (double?)null,
                ReviewCount = o.Reviews.Count(r => r.Status == ReviewStatus.Published),
                Amenities = o.ObjectAmenities.Select(oa => new { oa.Amenity.Name, oa.Amenity.Icon }).Take(4).ToList(),
                MainPhotoUrl = o.Photos.OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault(),
                MinPrice = o.Tariffs.Any() ? o.Tariffs.Min(t => t.Price) : (decimal?)null
            })
            .ToListAsync();

        return Ok(objects);
    }
}
