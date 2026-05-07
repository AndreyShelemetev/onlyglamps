using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlyGlamps.Api.Services;

namespace OnlyGlamps.Api.Controllers;

/// <summary>
/// MVP-импорт карточек из внешних источников. См. <c>docs/competitor-import-mapping.md</c>.
/// Объекты создаются со статусом <c>Draft</c> и связкой <c>SourceLink</c>;
/// автоматически НЕ публикуются и не попадают в публичные листинги/sitemap.
/// </summary>
[ApiController]
[Route("api/admin/import")]
[Authorize(Roles = "Admin")]
public class ImportController : ControllerBase
{
    private readonly ImportService _import;
    private readonly GlampingsRfCrawler _crawler;

    public ImportController(ImportService import, GlampingsRfCrawler crawler)
    {
        _import = import;
        _crawler = crawler;
    }

    public class ImportObjectDto
    {
        public string? Name { get; set; }
        public string? SourceUrl { get; set; }
        public string? SourceName { get; set; }
        public string? RegionSlug { get; set; }
        public string? CitySlug { get; set; }
        public string? TypeSlug { get; set; }
        public string? ShortDescription { get; set; }
        public string? Address { get; set; }
        public string? Settlement { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int Capacity { get; set; }
        public int? Beds { get; set; }
        public int? Rooms { get; set; }
        public decimal? Area { get; set; }
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public bool ChildrenAllowed { get; set; }
        public bool PetsAllowed { get; set; }
        public bool SmokingAllowed { get; set; }
        public bool EventsAllowed { get; set; }
        public List<string>? AmenitySlugs { get; set; }
        public decimal? PriceFrom { get; set; }
    }

    [HttpGet("check")]
    public async Task<IActionResult> Check([FromQuery] string url, [FromQuery] string? name = null,
        [FromQuery] string? regionSlug = null)
    {
        var normalized = ImportService.NormalizeUrl(url ?? string.Empty);
        if (string.IsNullOrEmpty(normalized))
            return BadRequest(new { error = "url invalid" });
        // We only do source-url lookup here for speed; full dedup happens on import.
        var dup = await _import.FindDuplicateAsync(normalized, name ?? string.Empty,
            regionId: 0, cityId: null, lat: null, lon: null);
        return Ok(new { normalized, duplicateId = dup.DuplicateId, reason = dup.Reason });
    }

    [HttpPost("object")]
    public async Task<IActionResult> ImportObject([FromBody] ImportObjectDto dto)
    {
        if (dto == null) return BadRequest(new { error = "body required" });
        if (string.IsNullOrWhiteSpace(dto.Name) ||
            string.IsNullOrWhiteSpace(dto.SourceUrl) ||
            string.IsNullOrWhiteSpace(dto.RegionSlug) ||
            string.IsNullOrWhiteSpace(dto.TypeSlug))
        {
            return BadRequest(new { error = "name, sourceUrl, regionSlug, typeSlug required" });
        }
        if (dto.Capacity < 1)
            return BadRequest(new { error = "capacity must be >= 1" });

        var req = new ImportService.ImportRequest(
            Name: dto.Name!.Trim(),
            SourceUrl: dto.SourceUrl!,
            SourceName: dto.SourceName,
            RegionSlug: dto.RegionSlug!,
            CitySlug: dto.CitySlug,
            TypeSlug: dto.TypeSlug!,
            ShortDescription: dto.ShortDescription,
            Address: dto.Address,
            Settlement: dto.Settlement,
            Latitude: dto.Latitude,
            Longitude: dto.Longitude,
            Capacity: dto.Capacity,
            Beds: dto.Beds,
            Rooms: dto.Rooms,
            Area: dto.Area,
            CheckInTime: dto.CheckInTime,
            CheckOutTime: dto.CheckOutTime,
            ChildrenAllowed: dto.ChildrenAllowed,
            PetsAllowed: dto.PetsAllowed,
            SmokingAllowed: dto.SmokingAllowed,
            EventsAllowed: dto.EventsAllowed,
            AmenitySlugs: dto.AmenitySlugs,
            PriceFrom: dto.PriceFrom);

        try
        {
            var result = await _import.ImportAsync(req);
            if (!result.Created)
            {
                return Conflict(new
                {
                    duplicate = true,
                    objectId = result.ObjectId,
                    slug = result.Slug,
                    reason = result.DuplicateReason,
                });
            }
            return Created($"/api/admin/objects/{result.ObjectId}", new
            {
                created = true,
                objectId = result.ObjectId,
                slug = result.Slug,
                status = "Draft",
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    public class CrawlRequestDto
    {
        public int Offset { get; set; } = 0;
        public int Limit { get; set; } = 10;
        public bool DryRun { get; set; } = true;
        public int? MaxPerRegion { get; set; }
        public int? DelayMs { get; set; }
    }

    /// <summary>
    /// Запускает crawler глэмпинги.рф (sitemap → парсинг карточек → ImportService).
    /// Объекты создаются как Draft. По умолчанию dryRun=true (ничего не пишем).
    /// Лимит карточек на запрос: 1..2000. Можно ограничить выборку по регионам
    /// (например, MaxPerRegion=3) и задать вежливую задержку DelayMs.
    /// </summary>
    [HttpPost("crawl/glampings-rf")]
    public async Task<IActionResult> CrawlGlampingsRf([FromBody] CrawlRequestDto? dto, CancellationToken ct)
    {
        dto ??= new CrawlRequestDto();
        try
        {
            var result = await _crawler.CrawlAsync(
                offset: Math.Max(0, dto.Offset),
                limit: Math.Clamp(dto.Limit, 1, 2000),
                dryRun: dto.DryRun,
                maxPerRegion: dto.MaxPerRegion is > 0 ? dto.MaxPerRegion : null,
                delayMs: Math.Clamp(dto.DelayMs ?? 1500, 1000, 15000),
                ct);
            return Ok(new
            {
                found = result.Found,
                imported = result.Imported,
                duplicates = result.Duplicates,
                skipped = result.Skipped,
                errors = result.Errors,
                samples = result.Samples,
            });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = "upstream fetch failed", detail = ex.Message });
        }
        catch (TaskCanceledException ex)
        {
            return StatusCode(504, new { error = "upstream timeout", detail = ex.Message });
        }
    }
}
