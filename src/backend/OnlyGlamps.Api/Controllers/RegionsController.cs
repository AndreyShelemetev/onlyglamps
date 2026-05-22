using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RegionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RegionsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rawTypeCounts = await _db.GlampingObjects
            .AsNoTracking()
            .Where(o => o.Status == ObjectStatus.Published)
            .GroupBy(o => new
            {
                o.RegionId,
                o.CityOrDistrictId,
                TypeName = o.ObjectType.Name,
                TypeSlug = o.ObjectType.Slug
            })
            .Select(g => new DirectionTypeCount(
                g.Key.RegionId,
                g.Key.CityOrDistrictId,
                g.Key.TypeName,
                g.Key.TypeSlug,
                g.Count()))
            .ToListAsync();

        var regionTotals = rawTypeCounts
            .GroupBy(c => c.RegionId)
            .ToDictionary(g => g.Key, g => g.Sum(c => c.Count));

        var cityTotals = rawTypeCounts
            .GroupBy(c => c.CityOrDistrictId)
            .ToDictionary(g => g.Key, g => g.Sum(c => c.Count));

        var typeCountsByRegion = rawTypeCounts
            .GroupBy(c => c.RegionId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(c => new { c.TypeName, c.TypeSlug })
                    .Select(t => new TypeCount(t.Key.TypeName, t.Key.TypeSlug, t.Sum(c => c.Count)))
                    .OrderByDescending(t => t.Count)
                    .ThenBy(t => t.Name)
                    .ToList());

        var typeCountsByCity = rawTypeCounts
            .GroupBy(c => c.CityOrDistrictId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(c => new { c.TypeName, c.TypeSlug })
                    .Select(t => new TypeCount(t.Key.TypeName, t.Key.TypeSlug, t.Sum(c => c.Count)))
                    .OrderByDescending(t => t.Count)
                    .ThenBy(t => t.Name)
                    .ToList());

        var regions = await _db.Regions
            .AsNoTracking()
            .Include(r => r.CitiesAndDistricts)
            .OrderBy(r => r.Name)
            .ToListAsync();

        var response = regions.Select(r => new
        {
            r.Id,
            r.Name,
            r.Slug,
            ObjectCount = regionTotals.GetValueOrDefault(r.Id),
            TypeCounts = typeCountsByRegion.TryGetValue(r.Id, out var regionTypes)
                ? regionTypes
                : [],
            Cities = r.CitiesAndDistricts.OrderBy(c => c.Name).Select(c => new
            {
                c.Id,
                c.Name,
                c.Slug,
                c.IsCity,
                ObjectCount = cityTotals.GetValueOrDefault(c.Id),
                TypeCounts = typeCountsByCity.TryGetValue(c.Id, out var cityTypes)
                    ? cityTypes
                    : []
            })
        });

        return Ok(response);
    }

    private sealed record DirectionTypeCount(
        int RegionId,
        int CityOrDistrictId,
        string TypeName,
        string TypeSlug,
        int Count);

    private sealed record TypeCount(string Name, string Slug, int Count);
}
