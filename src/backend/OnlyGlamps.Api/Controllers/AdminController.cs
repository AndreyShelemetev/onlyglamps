using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;
using OnlyGlamps.Api.Services;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin,Editor")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuthService _auth;

    public AdminController(AppDbContext db, AuthService auth) { _db = db; _auth = auth; }

    private int GetUserId() => _auth.GetUserIdFromContext(HttpContext) ?? 0;

    // ===================== OBJECTS =====================

    [HttpGet("objects")]
    public async Task<IActionResult> ListObjects(
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? region = null,
        [FromQuery] int? ownerId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.GlampingObjects.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ObjectStatus>(status, true, out var st))
            query = query.Where(o => o.Status == st);
        if (!string.IsNullOrEmpty(type))
            query = query.Where(o => o.ObjectType.Slug == type);
        if (!string.IsNullOrEmpty(region))
            query = query.Where(o => o.Region.Slug == region);
        if (ownerId.HasValue)
            query = query.Where(o => o.OwnerId == ownerId.Value);

        var total = await query.CountAsync();
        var objects = await query
            .OrderByDescending(o => o.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new
            {
                o.Id, o.Name, o.Slug,
                Status = o.Status.ToString(),
                ObjectType = o.ObjectType.Name,
                Region = o.Region.Name,
                CityOrDistrict = o.CityOrDistrict.Name,
                Owner = new { o.Owner.Id, o.Owner.FirstName, o.Owner.LastName, o.Owner.Email },
                o.UpdatedAt, o.CreatedAt,
                PhotoCount = o.Photos.Count,
                TariffCount = o.Tariffs.Count,
                o.ModerationComment, o.ModeratedAt
            })
            .ToListAsync();

        return Ok(new { data = objects, total, page, pageSize });
    }

    [HttpGet("objects/{id:int}")]
    public async Task<IActionResult> GetObject(int id)
    {
        var obj = await _db.GlampingObjects
            .Include(o => o.ObjectType)
            .Include(o => o.Region)
            .Include(o => o.CityOrDistrict)
            .Include(o => o.Owner).ThenInclude(u => u!.OwnerProfile)
            .Include(o => o.Tariffs)
            .Include(o => o.Photos.OrderBy(p => p.SortOrder))
            .Include(o => o.ObjectAmenities).ThenInclude(oa => oa.Amenity)
            .Include(o => o.ObjectTags).ThenInclude(ot => ot.Tag)
            .Include(o => o.AvailabilityDates)
            .Include(o => o.SourceLink)
            .Include(o => o.FieldValues)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (obj == null) return NotFound();

        var fieldSchema = await _db.ObjectTypeFields
            .Where(f => f.ObjectTypeId == obj.ObjectTypeId)
            .OrderBy(f => f.SortOrder).ThenBy(f => f.Id)
            .ToListAsync();
        var customFields = CustomFieldsService.Serialize(obj.FieldValues, fieldSchema);

        // Validation readiness check
        var checks = new Dictionary<string, bool>
        {
            ["name"] = !string.IsNullOrWhiteSpace(obj.Name),
            ["shortDescription"] = !string.IsNullOrWhiteSpace(obj.ShortDescription),
            ["fullDescription"] = !string.IsNullOrWhiteSpace(obj.FullDescription),
            ["address"] = !string.IsNullOrWhiteSpace(obj.Address),
            ["coordinates"] = obj.Latitude != null && obj.Longitude != null,
            ["photos3"] = obj.Photos.Count >= 3,
            ["capacity"] = obj.Capacity >= 1,
            ["beds"] = obj.Beds is > 0,
            ["tariff"] = obj.Tariffs.Any(t => t.IsActive),
            ["calendar"] = obj.AvailabilityDates.Any(),
            ["amenities3"] = obj.ObjectAmenities.Count >= 3,
            ["contact"] = obj.Owner?.OwnerProfile != null &&
                (!string.IsNullOrWhiteSpace(obj.Owner.OwnerProfile.ContactPhone) ||
                 !string.IsNullOrWhiteSpace(obj.Owner.OwnerProfile.ContactTelegram))
        };

        return Ok(new
        {
            obj.Id, obj.Name, obj.Slug, obj.ShortDescription, obj.FullDescription,
            obj.Capacity, obj.Beds, obj.Rooms, obj.IsWhole, obj.Area,
            obj.MinRentalDays, obj.MaxRentalDays,
            obj.Address, obj.Settlement, obj.Latitude, obj.Longitude,
            obj.CheckInTime, obj.CheckOutTime,
            obj.ChildrenAllowed, obj.PetsAllowed, obj.SmokingAllowed, obj.EventsAllowed,
            obj.Deposit, obj.Rules,
            Status = obj.Status.ToString(),
            obj.ModerationComment, obj.ModeratedAt,
            obj.ObjectTypeId, obj.RegionId, obj.CityOrDistrictId,
            ObjectType = new { obj.ObjectType.Id, obj.ObjectType.Name },
            Region = new { obj.Region.Id, obj.Region.Name },
            CityOrDistrict = new { obj.CityOrDistrict.Id, obj.CityOrDistrict.Name },
            Owner = new { obj.Owner.Id, obj.Owner.FirstName, obj.Owner.LastName, obj.Owner.Email,
                Profile = obj.Owner.OwnerProfile != null ? new { obj.Owner.OwnerProfile.ContactName, obj.Owner.OwnerProfile.ContactPhone, obj.Owner.OwnerProfile.ContactTelegram } : null },
            Tariffs = obj.Tariffs.Select(t => new { t.Id, t.Name, t.Price, t.Description, t.IsActive }),
            Photos = obj.Photos.Select(p => new { p.Id, p.Url, p.Alt, p.SortOrder }),
            Amenities = obj.ObjectAmenities.Select(oa => new { oa.Amenity.Id, oa.Amenity.Name, oa.Amenity.Slug }),
            Tags = obj.ObjectTags.Select(ot => new { ot.Tag.Id, ot.Tag.Name }),
            Availability = obj.AvailabilityDates.Select(a => new { Date = a.Date.ToString("yyyy-MM-dd"), Status = a.Status.ToString() }),
            Source = obj.SourceLink != null ? new { obj.SourceLink.SourceName, obj.SourceLink.SourceUrl, obj.SourceLink.SourceType } : null,
            obj.SeoTitle, obj.SeoDescription,
            obj.UpdatedAt, obj.CreatedAt,
            Checks = checks,
            FieldSchema = fieldSchema.Select(f => new {
                f.Id, f.Key, f.Label, f.FieldType, f.Unit, f.Placeholder, f.HelpText, f.Options,
                f.MinValue, f.MaxValue, f.IsRequired, f.SortOrder
            }),
            CustomFields = customFields
        });
    }

    // --- Moderation actions ---
    [HttpPost("objects/{id:int}/approve")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Approve(int id)
    {
        var obj = await _db.GlampingObjects.FindAsync(id);
        if (obj == null) return NotFound();
        obj.Status = ObjectStatus.Published;
        obj.ModerationComment = null;
        obj.ModeratedAt = DateTime.UtcNow;
        obj.ModeratedById = GetUserId();
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { status = "published" });
    }

    [HttpPost("objects/{id:int}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reject(int id, [FromBody] ModerationRequest req)
    {
        var obj = await _db.GlampingObjects.FindAsync(id);
        if (obj == null) return NotFound();
        obj.Status = ObjectStatus.Rejected;
        obj.ModerationComment = req.Comment;
        obj.ModeratedAt = DateTime.UtcNow;
        obj.ModeratedById = GetUserId();
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { status = "rejected" });
    }

    [HttpPost("objects/{id:int}/archive")]
    public async Task<IActionResult> Archive(int id)
    {
        var obj = await _db.GlampingObjects.FindAsync(id);
        if (obj == null) return NotFound();
        obj.Status = ObjectStatus.Archived;
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { status = "archived" });
    }

    [HttpPost("objects/bulk-status")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusRequest req)
    {
        if (req.ObjectIds == null || req.ObjectIds.Count == 0)
            return BadRequest(new { error = "Список объектов пуст" });

        if (!Enum.TryParse<ObjectStatus>(req.Status, true, out var targetStatus) ||
            (targetStatus != ObjectStatus.Draft && targetStatus != ObjectStatus.Published && targetStatus != ObjectStatus.Archived))
            return BadRequest(new { error = "Разрешены только статусы Draft, Published, Archived" });

        var ids = req.ObjectIds.Distinct().ToList();
        var query = _db.GlampingObjects.Where(o => ids.Contains(o.Id));

        var now = DateTime.UtcNow;
        var objects = await query.ToListAsync();
        if (objects.Count == 0)
            return NotFound(new { error = "Объекты не найдены" });

        foreach (var obj in objects)
        {
            obj.Status = targetStatus;
            obj.UpdatedAt = now;

            if (targetStatus == ObjectStatus.Published)
            {
                obj.ModeratedAt = now;
                obj.ModeratedById = GetUserId();
                obj.ModerationComment = null;
            }

            if (targetStatus == ObjectStatus.Draft)
            {
                obj.ModeratedAt = null;
                obj.ModeratedById = null;
                obj.ModerationComment = null;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new
        {
            updated = objects.Count,
            requested = ids.Count,
            skipped = ids.Count - objects.Count,
            status = targetStatus.ToString()
        });
    }

    // --- Admin can edit SEO for any object ---
    [HttpPut("objects/{id:int}/seo")]
    public async Task<IActionResult> UpdateObjectSeo(int id, [FromBody] SeoRequest req)
    {
        var obj = await _db.GlampingObjects.FindAsync(id);
        if (obj == null) return NotFound();
        obj.SeoTitle = req.Title;
        obj.SeoDescription = req.Description;
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // ===================== REGIONS =====================

    [HttpGet("regions")]
    public async Task<IActionResult> GetRegions() =>
        Ok(await _db.Regions.OrderBy(r => r.Name).Select(r => new { r.Id, r.Name, r.Slug, CityCount = r.CitiesAndDistricts.Count }).ToListAsync());

    [HttpPost("regions")]
    public async Task<IActionResult> CreateRegion([FromBody] NameSlugRequest req)
    {
        var region = new Region { Name = req.Name, Slug = SlugService.Generate(req.Name) };
        _db.Regions.Add(region);
        await _db.SaveChangesAsync();
        return Ok(new { region.Id, region.Name, region.Slug });
    }

    [HttpPut("regions/{id:int}")]
    public async Task<IActionResult> UpdateRegion(int id, [FromBody] NameSlugRequest req)
    {
        var region = await _db.Regions.FindAsync(id);
        if (region == null) return NotFound();
        region.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.Slug)) region.Slug = req.Slug;
        await _db.SaveChangesAsync();
        return Ok(new { region.Id, region.Name, region.Slug });
    }

    [HttpDelete("regions/{id:int}")]
    public async Task<IActionResult> DeleteRegion(int id)
    {
        var region = await _db.Regions.FindAsync(id);
        if (region == null) return NotFound();
        if (await _db.GlampingObjects.AnyAsync(o => o.RegionId == id))
            return BadRequest(new { error = "Нельзя удалить регион с объектами" });
        _db.Regions.Remove(region);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // ===================== CITIES =====================

    [HttpGet("cities")]
    public async Task<IActionResult> GetCities([FromQuery] int? regionId = null)
    {
        var q = _db.CitiesAndDistricts.AsQueryable();
        if (regionId.HasValue) q = q.Where(c => c.RegionId == regionId.Value);
        return Ok(await q.OrderBy(c => c.Name).Select(c => new { c.Id, c.Name, c.Slug, c.RegionId, RegionName = c.Region.Name, c.IsCity }).ToListAsync());
    }

    [HttpPost("cities")]
    public async Task<IActionResult> CreateCity([FromBody] CityRequest req)
    {
        var city = new CityOrDistrict { Name = req.Name, Slug = SlugService.Generate(req.Name), RegionId = req.RegionId, IsCity = req.IsCity };
        _db.CitiesAndDistricts.Add(city);
        await _db.SaveChangesAsync();
        return Ok(new { city.Id, city.Name, city.Slug, city.RegionId });
    }

    [HttpPut("cities/{id:int}")]
    public async Task<IActionResult> UpdateCity(int id, [FromBody] CityRequest req)
    {
        var city = await _db.CitiesAndDistricts.FindAsync(id);
        if (city == null) return NotFound();
        city.Name = req.Name;
        city.RegionId = req.RegionId;
        city.IsCity = req.IsCity;
        if (!string.IsNullOrWhiteSpace(req.Slug)) city.Slug = req.Slug;
        await _db.SaveChangesAsync();
        return Ok(new { city.Id, city.Name, city.Slug });
    }

    [HttpDelete("cities/{id:int}")]
    public async Task<IActionResult> DeleteCity(int id)
    {
        var city = await _db.CitiesAndDistricts.FindAsync(id);
        if (city == null) return NotFound();
        if (await _db.GlampingObjects.AnyAsync(o => o.CityOrDistrictId == id))
            return BadRequest(new { error = "Нельзя удалить город/район с объектами" });
        _db.CitiesAndDistricts.Remove(city);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // ===================== OBJECT TYPES =====================

    [HttpGet("types")]
    public async Task<IActionResult> GetTypes() =>
        Ok(await _db.ObjectTypes.OrderBy(t => t.Name).Select(t => new {
            t.Id, t.Name, t.Slug, t.Icon, t.ColorFrom, t.ColorTo,
            DisabledBuiltinFields = t.DisabledBuiltinFields ?? "",
            ObjectCount = t.Objects.Count
        }).ToListAsync());

    [HttpPost("types")]
    public async Task<IActionResult> CreateType([FromBody] NameSlugRequest req)
    {
        var type = new ObjectType { Name = req.Name, Slug = SlugService.Generate(req.Name), Icon = req.Icon, ColorFrom = req.ColorFrom, ColorTo = req.ColorTo };
        _db.ObjectTypes.Add(type);
        await _db.SaveChangesAsync();
        return Ok(new { type.Id, type.Name, type.Slug, type.Icon, type.ColorFrom, type.ColorTo });
    }

    [HttpPut("types/{id:int}")]
    public async Task<IActionResult> UpdateType(int id, [FromBody] NameSlugRequest req)
    {
        var type = await _db.ObjectTypes.FindAsync(id);
        if (type == null) return NotFound();
        type.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.Slug)) type.Slug = req.Slug;
        type.Icon = req.Icon;
        type.ColorFrom = req.ColorFrom;
        type.ColorTo = req.ColorTo;
        await _db.SaveChangesAsync();
        return Ok(new { type.Id, type.Name, type.Slug, type.Icon, type.ColorFrom, type.ColorTo });
    }

    // Allowed "built-in" field keys that can be disabled per object type.
    // Must match what BlockParams renders on the frontend.
    private static readonly HashSet<string> AllowedBuiltinKeys = new(StringComparer.Ordinal)
    {
        "capacity", "beds", "rooms", "area",
        "minRentalDays", "maxRentalDays",
        "checkInTime", "checkOutTime",
        "isWhole", "childrenAllowed", "petsAllowed", "smokingAllowed", "eventsAllowed",
        "deposit", "rules"
    };

    [HttpPut("types/{id:int}/builtin-fields")]
    public async Task<IActionResult> UpdateBuiltinFields(int id, [FromBody] BuiltinFieldsRequest req)
    {
        var type = await _db.ObjectTypes.FindAsync(id);
        if (type == null) return NotFound();

        var disabled = (req.DisabledKeys ?? new List<string>())
            .Where(k => !string.IsNullOrWhiteSpace(k) && AllowedBuiltinKeys.Contains(k))
            .Distinct()
            .ToList();

        type.DisabledBuiltinFields = disabled.Count == 0 ? null : string.Join(",", disabled);
        await _db.SaveChangesAsync();
        return Ok(new { disabledKeys = disabled });
    }

    // ===================== OBJECT TYPE FIELDS (dynamic parameters) =====================

    [HttpGet("types/{typeId:int}/fields")]
    public async Task<IActionResult> GetTypeFields(int typeId)
    {
        if (!await _db.ObjectTypes.AnyAsync(t => t.Id == typeId))
            return NotFound(new { error = "Тип не найден" });

        var fields = await _db.ObjectTypeFields
            .Where(f => f.ObjectTypeId == typeId)
            .OrderBy(f => f.SortOrder).ThenBy(f => f.Id)
            .Select(f => new
            {
                f.Id, f.ObjectTypeId, f.Key, f.Label, f.FieldType,
                f.Unit, f.Placeholder, f.HelpText, f.Options,
                f.MinValue, f.MaxValue, f.IsRequired, f.SortOrder
            })
            .ToListAsync();

        return Ok(fields);
    }

    [HttpPost("types/{typeId:int}/fields")]
    public async Task<IActionResult> CreateTypeField(int typeId, [FromBody] ObjectTypeFieldRequest req)
    {
        if (!await _db.ObjectTypes.AnyAsync(t => t.Id == typeId))
            return NotFound(new { error = "Тип не найден" });
        if (string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { error = "Укажите название поля" });

        var key = !string.IsNullOrWhiteSpace(req.Key) ? req.Key!.Trim() : SlugService.Generate(req.Label);
        key = key.ToLowerInvariant().Replace('-', '_');

        if (await _db.ObjectTypeFields.AnyAsync(f => f.ObjectTypeId == typeId && f.Key == key))
            return BadRequest(new { error = "Поле с таким ключом уже существует" });

        var maxSort = await _db.ObjectTypeFields.Where(f => f.ObjectTypeId == typeId)
            .Select(f => (int?)f.SortOrder).MaxAsync() ?? 0;

        var field = new ObjectTypeField
        {
            ObjectTypeId = typeId,
            Key = key,
            Label = req.Label.Trim(),
            FieldType = NormalizeFieldType(req.FieldType),
            Unit = req.Unit,
            Placeholder = req.Placeholder,
            HelpText = req.HelpText,
            Options = req.Options,
            MinValue = req.MinValue,
            MaxValue = req.MaxValue,
            IsRequired = req.IsRequired,
            SortOrder = req.SortOrder ?? maxSort + 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.ObjectTypeFields.Add(field);
        await _db.SaveChangesAsync();
        return Ok(new { field.Id });
    }

    [HttpPut("fields/{id:int}")]
    public async Task<IActionResult> UpdateTypeField(int id, [FromBody] ObjectTypeFieldRequest req)
    {
        var field = await _db.ObjectTypeFields.FindAsync(id);
        if (field == null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { error = "Укажите название поля" });

        if (!string.IsNullOrWhiteSpace(req.Key))
        {
            var key = req.Key!.Trim().ToLowerInvariant().Replace('-', '_');
            if (key != field.Key &&
                await _db.ObjectTypeFields.AnyAsync(f => f.ObjectTypeId == field.ObjectTypeId && f.Key == key && f.Id != id))
                return BadRequest(new { error = "Поле с таким ключом уже существует" });
            field.Key = key;
        }

        field.Label = req.Label.Trim();
        field.FieldType = NormalizeFieldType(req.FieldType);
        field.Unit = req.Unit;
        field.Placeholder = req.Placeholder;
        field.HelpText = req.HelpText;
        field.Options = req.Options;
        field.MinValue = req.MinValue;
        field.MaxValue = req.MaxValue;
        field.IsRequired = req.IsRequired;
        if (req.SortOrder.HasValue) field.SortOrder = req.SortOrder.Value;
        field.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { field.Id });
    }

    [HttpDelete("fields/{id:int}")]
    public async Task<IActionResult> DeleteTypeField(int id)
    {
        var field = await _db.ObjectTypeFields.FindAsync(id);
        if (field == null) return NotFound();
        _db.ObjectTypeFields.Remove(field);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private static string NormalizeFieldType(string? raw)
    {
        var allowed = new[] { "number", "text", "textarea", "boolean", "select" };
        var t = (raw ?? "number").Trim().ToLowerInvariant();
        return allowed.Contains(t) ? t : "number";
    }

    // ===================== TAGS =====================

    [HttpGet("tags")]
    public async Task<IActionResult> GetTags() =>
        Ok(await _db.Tags.OrderBy(t => t.Name).Select(t => new { t.Id, t.Name, t.Slug, ObjectCount = t.ObjectTags.Count }).ToListAsync());

    [HttpPost("tags")]
    public async Task<IActionResult> CreateTag([FromBody] NameSlugRequest req)
    {
        var tag = new Tag { Name = req.Name, Slug = SlugService.Generate(req.Name) };
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync();
        return Ok(new { tag.Id, tag.Name, tag.Slug });
    }

    [HttpPut("tags/{id:int}")]
    public async Task<IActionResult> UpdateTag(int id, [FromBody] NameSlugRequest req)
    {
        var tag = await _db.Tags.FindAsync(id);
        if (tag == null) return NotFound();
        tag.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.Slug)) tag.Slug = req.Slug;
        await _db.SaveChangesAsync();
        return Ok(new { tag.Id, tag.Name, tag.Slug });
    }

    [HttpDelete("tags/{id:int}")]
    public async Task<IActionResult> DeleteTag(int id)
    {
        var tag = await _db.Tags.FindAsync(id);
        if (tag == null) return NotFound();
        if (await _db.ObjectTags.AnyAsync(ot => ot.TagId == id))
            return BadRequest(new { error = "Нельзя удалить тег, используемый в объектах" });
        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // ===================== SEO META =====================

    [HttpGet("seo")]
    public async Task<IActionResult> GetSeoMetas() =>
        Ok(await _db.SeoMetas.OrderBy(s => s.PageType)
            .Select(s => new { s.Id, s.PageType, s.RegionId, RegionName = s.Region != null ? s.Region.Name : null, s.CityOrDistrictId, CityName = s.CityOrDistrict != null ? s.CityOrDistrict.Name : null, s.ObjectTypeId, TypeName = s.ObjectType != null ? s.ObjectType.Name : null, s.Title, s.Description, s.H1 })
            .ToListAsync());

    [HttpPost("seo")]
    public async Task<IActionResult> CreateSeoMeta([FromBody] SeoMetaRequest req)
    {
        var seo = new SeoMeta { PageType = req.PageType, RegionId = req.RegionId, CityOrDistrictId = req.CityOrDistrictId, ObjectTypeId = req.ObjectTypeId, Title = req.Title, Description = req.Description, H1 = req.H1, Text = req.Text };
        _db.SeoMetas.Add(seo);
        await _db.SaveChangesAsync();
        return Ok(new { seo.Id });
    }

    [HttpPut("seo/{id:int}")]
    public async Task<IActionResult> UpdateSeoMeta(int id, [FromBody] SeoMetaRequest req)
    {
        var seo = await _db.SeoMetas.FindAsync(id);
        if (seo == null) return NotFound();
        seo.Title = req.Title;
        seo.Description = req.Description;
        seo.H1 = req.H1;
        seo.Text = req.Text;
        seo.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { seo.Id });
    }

    // ===================== AMENITIES =====================

    [HttpGet("amenities")]
    public async Task<IActionResult> GetAmenities() =>
        Ok(await _db.Amenities.OrderBy(a => a.Name).Select(a => new { a.Id, a.Name, a.Slug, a.Icon, ObjectCount = a.ObjectAmenities.Count }).ToListAsync());

    [HttpPost("amenities")]
    public async Task<IActionResult> CreateAmenity([FromBody] AmenityRequest req)
    {
        var a = new Amenity { Name = req.Name, Slug = SlugService.Generate(req.Name), Icon = req.Icon };
        _db.Amenities.Add(a);
        await _db.SaveChangesAsync();
        return Ok(new { a.Id, a.Name, a.Slug });
    }

    [HttpPut("amenities/{id:int}")]
    public async Task<IActionResult> UpdateAmenity(int id, [FromBody] AmenityRequest req)
    {
        var a = await _db.Amenities.FindAsync(id);
        if (a == null) return NotFound();
        a.Name = req.Name;
        a.Icon = req.Icon;
        if (!string.IsNullOrWhiteSpace(req.Slug)) a.Slug = req.Slug;
        await _db.SaveChangesAsync();
        return Ok(new { a.Id, a.Name, a.Slug, a.Icon });
    }

    [HttpDelete("amenities/{id:int}")]
    public async Task<IActionResult> DeleteAmenity(int id)
    {
        var a = await _db.Amenities.FindAsync(id);
        if (a == null) return NotFound();
        if (await _db.ObjectAmenities.AnyAsync(oa => oa.AmenityId == id))
            return BadRequest(new { error = "Нельзя удалить удобство, используемое в объектах" });
        _db.Amenities.Remove(a);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // ===================== ADMIN OBJECT CRUD =====================

    [HttpPost("objects")]
    public async Task<IActionResult> CreateObject([FromBody] ObjectSaveRequest req)
    {
        var userId = GetUserId();
        var slug = SlugService.Generate(req.Name ?? "admin-draft");

        var obj = new GlampingObject
        {
            OwnerId = userId,
            ObjectTypeId = req.ObjectTypeId,
            RegionId = req.RegionId,
            CityOrDistrictId = req.CityOrDistrictId,
            Name = req.Name ?? "",
            Slug = slug,
            ShortDescription = req.ShortDescription,
            FullDescription = req.FullDescription,
            Area = req.Area,
            Capacity = req.Capacity,
            Beds = req.Beds,
            Rooms = req.Rooms,
            IsWhole = req.IsWhole,
            MinRentalDays = req.MinRentalDays,
            MaxRentalDays = req.MaxRentalDays,
            Address = req.Address,
            Settlement = req.Settlement,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            CheckInTime = req.CheckInTime,
            CheckOutTime = req.CheckOutTime,
            ChildrenAllowed = req.ChildrenAllowed,
            PetsAllowed = req.PetsAllowed,
            SmokingAllowed = req.SmokingAllowed,
            EventsAllowed = req.EventsAllowed,
            Deposit = req.Deposit,
            Rules = req.Rules,
            Status = ObjectStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.GlampingObjects.Add(obj);
        await _db.SaveChangesAsync();

        if (req.AmenityIds?.Count > 0)
            _db.ObjectAmenities.AddRange(req.AmenityIds.Select(aid => new ObjectAmenity { ObjectId = obj.Id, AmenityId = aid }));
        if (req.TagIds?.Count > 0)
            _db.ObjectTags.AddRange(req.TagIds.Select(tid => new ObjectTag { ObjectId = obj.Id, TagId = tid }));
        if (!string.IsNullOrWhiteSpace(req.SourceUrl))
            _db.SourceLinks.Add(new SourceLink { ObjectId = obj.Id, SourceName = req.SourceName, SourceUrl = req.SourceUrl, SourceType = req.SourceType });

        await CustomFieldsService.ApplyAsync(_db, obj.Id, obj.ObjectTypeId, req.CustomFields);

        await _db.SaveChangesAsync();
        return Ok(new { id = obj.Id });
    }

    [HttpPut("objects/{id:int}/edit")]
    public async Task<IActionResult> EditObject(int id, [FromBody] ObjectSaveRequest req)
    {
        var obj = await _db.GlampingObjects
            .Include(o => o.ObjectAmenities)
            .Include(o => o.ObjectTags)
            .Include(o => o.SourceLink)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (obj == null) return NotFound(new { error = "Объект не найден" });

        obj.ObjectTypeId = req.ObjectTypeId;
        obj.RegionId = req.RegionId;
        obj.CityOrDistrictId = req.CityOrDistrictId;
        obj.Name = req.Name ?? obj.Name;
        if (!string.IsNullOrWhiteSpace(req.Name))
            obj.Slug = SlugService.Generate(req.Name);
        obj.ShortDescription = req.ShortDescription;
        obj.FullDescription = req.FullDescription;
        obj.Area = req.Area;
        obj.Capacity = req.Capacity;
        obj.Beds = req.Beds;
        obj.Rooms = req.Rooms;
        obj.IsWhole = req.IsWhole;
        obj.MinRentalDays = req.MinRentalDays;
        obj.MaxRentalDays = req.MaxRentalDays;
        obj.Address = req.Address;
        obj.Settlement = req.Settlement;
        obj.Latitude = req.Latitude;
        obj.Longitude = req.Longitude;
        obj.CheckInTime = req.CheckInTime;
        obj.CheckOutTime = req.CheckOutTime;
        obj.ChildrenAllowed = req.ChildrenAllowed;
        obj.PetsAllowed = req.PetsAllowed;
        obj.SmokingAllowed = req.SmokingAllowed;
        obj.EventsAllowed = req.EventsAllowed;
        obj.Deposit = req.Deposit;
        obj.Rules = req.Rules;
        obj.SeoTitle = req.SeoTitle;
        obj.SeoDescription = req.SeoDescription;
        obj.UpdatedAt = DateTime.UtcNow;

        _db.ObjectAmenities.RemoveRange(obj.ObjectAmenities);
        if (req.AmenityIds?.Count > 0)
            _db.ObjectAmenities.AddRange(req.AmenityIds.Select(aid => new ObjectAmenity { ObjectId = id, AmenityId = aid }));

        _db.ObjectTags.RemoveRange(obj.ObjectTags);
        if (req.TagIds?.Count > 0)
            _db.ObjectTags.AddRange(req.TagIds.Select(tid => new ObjectTag { ObjectId = id, TagId = tid }));

        if (obj.SourceLink != null)
        {
            obj.SourceLink.SourceName = req.SourceName;
            obj.SourceLink.SourceUrl = req.SourceUrl;
            obj.SourceLink.SourceType = req.SourceType;
        }
        else if (!string.IsNullOrWhiteSpace(req.SourceUrl))
        {
            _db.SourceLinks.Add(new SourceLink { ObjectId = id, SourceName = req.SourceName, SourceUrl = req.SourceUrl, SourceType = req.SourceType });
        }

        await CustomFieldsService.ApplyAsync(_db, id, obj.ObjectTypeId, req.CustomFields);

        await _db.SaveChangesAsync();
        return Ok(new { id = obj.Id });
    }

    [HttpPut("objects/{id:int}/tariffs")]
    public async Task<IActionResult> SaveTariffs(int id, [FromBody] List<TariffRequest> tariffs)
    {
        var obj = await _db.GlampingObjects.Include(o => o.Tariffs).FirstOrDefaultAsync(o => o.Id == id);
        if (obj == null) return NotFound();
        _db.Tariffs.RemoveRange(obj.Tariffs);
        foreach (var t in tariffs)
            _db.Tariffs.Add(new Tariff { ObjectId = id, Name = t.Name, Price = t.Price, Description = t.Description, IsActive = t.IsActive });
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { count = tariffs.Count });
    }

    [HttpPut("objects/{id:int}/photos")]
    public async Task<IActionResult> SavePhotos(int id, [FromBody] List<PhotoRequest> photos)
    {
        var obj = await _db.GlampingObjects.Include(o => o.Photos).FirstOrDefaultAsync(o => o.Id == id);
        if (obj == null) return NotFound();
        _db.ObjectPhotos.RemoveRange(obj.Photos);
        for (var i = 0; i < photos.Count; i++)
            _db.ObjectPhotos.Add(new ObjectPhoto { ObjectId = id, Url = photos[i].Url, Alt = photos[i].Alt, SortOrder = i + 1 });
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { count = photos.Count });
    }

    [HttpPut("objects/{id:int}/calendar")]
    public async Task<IActionResult> SaveCalendar(int id, [FromBody] List<CalendarEntry> entries)
    {
        var obj = await _db.GlampingObjects.Include(o => o.AvailabilityDates).FirstOrDefaultAsync(o => o.Id == id);
        if (obj == null) return NotFound();
        _db.AvailabilityCalendars.RemoveRange(obj.AvailabilityDates);
        foreach (var e in entries)
        {
            if (DateOnly.TryParse(e.Date, out var date) && Enum.TryParse<AvailabilityStatus>(e.Status, true, out var status))
                _db.AvailabilityCalendars.Add(new AvailabilityCalendar { ObjectId = id, Date = date, Status = status });
        }
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { count = entries.Count });
    }

    [HttpPost("objects/{id:int}/publish")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> DirectPublish(int id)
    {
        var obj = await _db.GlampingObjects.FindAsync(id);
        if (obj == null) return NotFound();
        obj.Status = ObjectStatus.Published;
        obj.ModeratedAt = DateTime.UtcNow;
        obj.ModeratedById = GetUserId();
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { status = "published" });
    }

    // ===================== USERS (staff & owners) =====================

    // Admin can create / list / edit accounts. Editor cannot manage users.
    // Allowed roles to assign via this UI: Owner (арендодатель), Editor (редактор), Author.
    // Admin role cannot be assigned through this endpoint.
    private static readonly HashSet<UserRole> AssignableRoles = new()
    {
        UserRole.Owner, UserRole.Editor, UserRole.Author, UserRole.User
    };

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ListUsers([FromQuery] string? role = null, [FromQuery] string? search = null)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var r))
            query = query.Where(u => u.Role == r);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                u.FirstName.ToLower().Contains(s) ||
                (u.LastName != null && u.LastName.ToLower().Contains(s)) ||
                (u.Username != null && u.Username.ToLower().Contains(s)));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Username,
                u.FirstName,
                u.LastName,
                Role = u.Role.ToString(),
                HasPassword = u.PasswordHash != null,
                HasTelegram = u.TelegramId != null,
                ObjectCount = u.Objects.Count,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { error = "Email и пароль обязательны" });
        if (string.IsNullOrWhiteSpace(req.FirstName))
            return BadRequest(new { error = "Имя обязательно" });
        if (req.Password.Length < 6)
            return BadRequest(new { error = "Пароль должен быть не короче 6 символов" });

        if (!Enum.TryParse<UserRole>(req.Role, true, out var role) || !AssignableRoles.Contains(role))
            return BadRequest(new { error = "Недопустимая роль" });

        var email = req.Email.Trim().ToLower();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return BadRequest(new { error = "Пользователь с таким email уже существует" });

        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            FirstName = req.FirstName.Trim(),
            LastName = string.IsNullOrWhiteSpace(req.LastName) ? null : req.LastName.Trim(),
            Role = role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            AuthDate = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            Role = user.Role.ToString()
        });
    }

    [HttpPut("users/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        // Cannot demote/modify role of an Admin via this endpoint.
        if (user.Role == UserRole.Admin)
            return BadRequest(new { error = "Нельзя редактировать администратора через этот интерфейс" });

        if (!string.IsNullOrWhiteSpace(req.FirstName)) user.FirstName = req.FirstName.Trim();
        user.LastName = string.IsNullOrWhiteSpace(req.LastName) ? null : req.LastName!.Trim();

        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            if (!Enum.TryParse<UserRole>(req.Role, true, out var role) || !AssignableRoles.Contains(role))
                return BadRequest(new { error = "Недопустимая роль" });
            user.Role = role;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { user.Id, user.Email, user.FirstName, user.LastName, Role = user.Role.ToString() });
    }

    [HttpPost("users/{id:int}/password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetUserPassword(int id, [FromBody] ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 6)
            return BadRequest(new { error = "Пароль должен быть не короче 6 символов" });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.Role == UserRole.Admin)
            return BadRequest(new { error = "Нельзя менять пароль администратора через этот интерфейс" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpDelete("users/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.Role == UserRole.Admin)
            return BadRequest(new { error = "Нельзя удалить администратора" });

        if (await _db.GlampingObjects.AnyAsync(o => o.OwnerId == id))
            return BadRequest(new { error = "У пользователя есть объекты — удаление невозможно" });

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}

// --- Request DTOs ---
public class ModerationRequest { public string? Comment { get; set; } }
public class SeoRequest { public string? Title { get; set; } public string? Description { get; set; } }
public class NameSlugRequest { public string Name { get; set; } = ""; public string? Slug { get; set; } public string? Icon { get; set; } public string? ColorFrom { get; set; } public string? ColorTo { get; set; } }
public class CityRequest { public string Name { get; set; } = ""; public string? Slug { get; set; } public int RegionId { get; set; } public bool IsCity { get; set; } = true; }
public class SeoMetaRequest { public string PageType { get; set; } = ""; public int? RegionId { get; set; } public int? CityOrDistrictId { get; set; } public int? ObjectTypeId { get; set; } public string? Title { get; set; } public string? Description { get; set; } public string? H1 { get; set; } public string? Text { get; set; } }
public class AmenityRequest { public string Name { get; set; } = ""; public string? Slug { get; set; } public string? Icon { get; set; } }

public class ObjectTypeFieldRequest
{
    public string? Key { get; set; }
    public string Label { get; set; } = "";
    public string? FieldType { get; set; }
    public string? Unit { get; set; }
    public string? Placeholder { get; set; }
    public string? HelpText { get; set; }
    public string? Options { get; set; }
    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }
    public bool IsRequired { get; set; }
    public int? SortOrder { get; set; }
}

public class BuiltinFieldsRequest
{
    public List<string>? DisabledKeys { get; set; }
}

public class CreateUserRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string? LastName { get; set; }
    public string Role { get; set; } = "Owner";
}

public class UpdateUserRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Role { get; set; }
}

public class ResetPasswordRequest
{
    public string Password { get; set; } = "";
}

public class BulkStatusRequest
{
    public List<int> ObjectIds { get; set; } = new();
    public string Status { get; set; } = "";
}
