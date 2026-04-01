using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;

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
        var regions = await _db.Regions
            .Include(r => r.CitiesAndDistricts)
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Slug,
                Cities = r.CitiesAndDistricts.OrderBy(c => c.Name).Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Slug,
                    c.IsCity
                })
            })
            .ToListAsync();

        return Ok(regions);
    }
}
