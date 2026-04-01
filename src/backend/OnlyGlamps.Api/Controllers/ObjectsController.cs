using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ObjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ObjectsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? region = null,
        [FromQuery] string? city = null,
        [FromQuery] string? type = null,
        [FromQuery] int? guests = null,
        [FromQuery] decimal? price_from = null,
        [FromQuery] decimal? price_to = null,
        [FromQuery] int? sauna = null,
        [FromQuery] int? chan = null,
        [FromQuery] int? mangal = null,
        [FromQuery] int? besedka = null,
        [FromQuery(Name = "s-pitomtsami")] int? pets = null,
        [FromQuery(Name = "s-detmi")] int? children = null,
        [FromQuery] int? parkovka = null,
        [FromQuery] int? wifi = null,
        [FromQuery(Name = "u-vody")] int? water = null,
        [FromQuery(Name = "u-lesa")] int? forest = null,
        [FromQuery(Name = "ves-obekt")] int? wholePlace = null,
        [FromQuery] string? sort = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var query = _db.GlampingObjects
            .Where(o => o.Status == ObjectStatus.Published);

        // Region filter
        if (!string.IsNullOrEmpty(region))
            query = query.Where(o => o.Region.Slug == region);

        // City filter
        if (!string.IsNullOrEmpty(city))
            query = query.Where(o => o.CityOrDistrict.Slug == city);

        // Type filter
        if (!string.IsNullOrEmpty(type))
            query = query.Where(o => o.ObjectType.Slug == type);

        // Guests filter
        if (guests.HasValue)
            query = query.Where(o => o.Capacity >= guests.Value);

        // Price filters
        if (price_from.HasValue)
            query = query.Where(o => o.Tariffs.Any(t => t.Price >= price_from.Value));
        if (price_to.HasValue)
            query = query.Where(o => o.Tariffs.Any(t => t.Price <= price_to.Value));

        // Amenity filters
        var amenityFilters = new Dictionary<string, int?>
        {
            ["banya"] = sauna,
            ["chan"] = chan,
            ["mangal"] = mangal,
            ["besedka"] = besedka,
            ["s-pitomtsami"] = pets,
            ["s-detmi"] = children,
            ["parkovka"] = parkovka,
            ["wifi"] = wifi,
            ["u-vody"] = water,
            ["u-lesa"] = forest,
            ["ves-obekt"] = wholePlace,
        };

        foreach (var (slug, value) in amenityFilters)
        {
            if (value == 1)
                query = query.Where(o => o.ObjectAmenities.Any(oa => oa.Amenity.Slug == slug));
        }

        // Total count
        var total = await query.CountAsync();

        // Sorting
        query = sort switch
        {
            "price_asc" => query.OrderBy(o => o.Tariffs.Min(t => t.Price)),
            "price_desc" => query.OrderByDescending(o => o.Tariffs.Min(t => t.Price)),
            "rating" => query.OrderByDescending(o =>
                o.Reviews.Where(r => r.Status == ReviewStatus.Published).Average(r => (double?)r.Rating) ?? 0),
            "newest" => query.OrderByDescending(o => o.CreatedAt),
            "capacity" => query.OrderByDescending(o => o.Capacity),
            _ => query.OrderByDescending(o => o.CreatedAt),
        };

        var objects = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Slug,
                o.ShortDescription,
                o.Capacity,
                ObjectType = new { o.ObjectType.Name, o.ObjectType.Slug },
                Region = new { o.Region.Name, o.Region.Slug },
                CityOrDistrict = new { o.CityOrDistrict.Name, o.CityOrDistrict.Slug },
                MinPrice = o.Tariffs.Any() ? o.Tariffs.Min(t => t.Price) : (decimal?)null,
                Rating = o.Reviews.Any(r => r.Status == ReviewStatus.Published)
                    ? Math.Round(o.Reviews.Where(r => r.Status == ReviewStatus.Published).Average(r => r.Rating), 1)
                    : (double?)null,
                ReviewCount = o.Reviews.Count(r => r.Status == ReviewStatus.Published),
                SourceUrl = o.SourceLink != null ? o.SourceLink.SourceUrl : null,
                MainPhotoUrl = o.Photos.OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault(),
                MainPhotoAlt = o.Photos.OrderBy(p => p.SortOrder).Select(p => p.Alt).FirstOrDefault(),
                Amenities = o.ObjectAmenities.Select(oa => oa.Amenity.Name).ToList()
            })
            .ToListAsync();

        return Ok(new { data = objects, total, page, pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var obj = await _db.GlampingObjects
            .Where(o => o.Id == id && o.Status == ObjectStatus.Published)
            .Include(o => o.ObjectType)
            .Include(o => o.Region)
            .Include(o => o.CityOrDistrict)
            .Include(o => o.Owner)
            .Include(o => o.Tariffs)
            .Include(o => o.Photos.OrderBy(p => p.SortOrder))
            .Include(o => o.Reviews.Where(r => r.Status == ReviewStatus.Published))
                .ThenInclude(r => r.User)
            .Include(o => o.SourceLink)
            .Include(o => o.ObjectAmenities).ThenInclude(oa => oa.Amenity)
            .Include(o => o.AvailabilityDates)
            .FirstOrDefaultAsync();

        if (obj == null)
            return NotFound(new { error = "Object not found" });

        return Ok(new
        {
            obj.Id,
            obj.Name,
            obj.Slug,
            obj.ShortDescription,
            obj.FullDescription,
            obj.Capacity,
            obj.Beds,
            obj.Area,
            obj.Address,
            obj.Latitude,
            obj.Longitude,
            obj.CheckInTime,
            obj.CheckOutTime,
            obj.ChildrenAllowed,
            obj.PetsAllowed,
            obj.SmokingAllowed,
            obj.EventsAllowed,
            obj.Deposit,
            obj.Rules,
            ObjectType = new { obj.ObjectType.Name, obj.ObjectType.Slug },
            Region = new { obj.Region.Name, obj.Region.Slug },
            CityOrDistrict = new { obj.CityOrDistrict.Name, obj.CityOrDistrict.Slug },
            Tariffs = obj.Tariffs.Select(t => new { t.Id, t.Name, t.Price, t.Description }),
            Photos = obj.Photos.Select(p => new { p.Id, p.Url, p.Alt, p.SortOrder }),
            Amenities = obj.ObjectAmenities.Select(oa => new { oa.Amenity.Name, oa.Amenity.Slug, oa.Amenity.Icon }),
            Reviews = obj.Reviews.Where(r => r.Status == ReviewStatus.Published).Select(r => new
            {
                r.Id,
                r.Rating,
                r.Text,
                r.CreatedAt,
                User = new { r.User.FirstName, r.User.AvatarUrl }
            }),
            Rating = obj.Reviews.Any(r => r.Status == ReviewStatus.Published)
                ? Math.Round(obj.Reviews.Where(r => r.Status == ReviewStatus.Published).Average(r => r.Rating), 1)
                : (double?)null,
            ReviewCount = obj.Reviews.Count(r => r.Status == ReviewStatus.Published),
            Source = obj.SourceLink != null ? new { obj.SourceLink.SourceName, obj.SourceLink.SourceUrl, obj.SourceLink.SourceType } : null,
            Availability = obj.AvailabilityDates.Select(a => new { Date = a.Date.ToString("yyyy-MM-dd"), Status = a.Status.ToString() })
        });
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        // URL format: {slug}-{id} — extract ID from the end
        var lastDash = slug.LastIndexOf('-');
        if (lastDash < 0 || !int.TryParse(slug[(lastDash + 1)..], out var id))
            return NotFound(new { error = "Invalid object URL" });

        return await GetById(id);
    }
}
