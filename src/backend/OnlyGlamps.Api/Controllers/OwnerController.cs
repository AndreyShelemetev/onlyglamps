using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;
using OnlyGlamps.Api.Services;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/owner")]
[Authorize(Roles = "Owner,Admin")]
public class OwnerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuthService _auth;

    public OwnerController(AppDbContext db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    private int GetUserId() => _auth.GetUserIdFromContext(HttpContext) ?? 0;

    // --- Objects list ---
    [HttpGet("objects")]
    public async Task<IActionResult> GetMyObjects()
    {
        var userId = GetUserId();
        var objects = await _db.GlampingObjects
            .Where(o => o.OwnerId == userId)
            .OrderByDescending(o => o.UpdatedAt)
            .Select(o => new
            {
                o.Id, o.Name, o.Slug, o.Status,
                ObjectType = o.ObjectType.Name,
                Region = o.Region.Name,
                CityOrDistrict = o.CityOrDistrict.Name,
                o.UpdatedAt, o.CreatedAt,
                PhotoCount = o.Photos.Count,
                HasCalendar = o.AvailabilityDates.Any(),
                TariffCount = o.Tariffs.Count(t => t.IsActive),
                AmenityCount = o.ObjectAmenities.Count,
                o.ModerationComment,
                MainPhotoUrl = o.Photos.OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault()
            })
            .ToListAsync();

        return Ok(objects);
    }

    // --- Get single object for editing ---
    [HttpGet("objects/{id:int}")]
    public async Task<IActionResult> GetObject(int id)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects
            .Where(o => o.Id == id && o.OwnerId == userId)
            .Include(o => o.ObjectType)
            .Include(o => o.Region)
            .Include(o => o.CityOrDistrict)
            .Include(o => o.Tariffs)
            .Include(o => o.Photos.OrderBy(p => p.SortOrder))
            .Include(o => o.ObjectAmenities).ThenInclude(oa => oa.Amenity)
            .Include(o => o.ObjectTags).ThenInclude(ot => ot.Tag)
            .Include(o => o.AvailabilityDates)
            .Include(o => o.SourceLink)
            .Include(o => o.Owner).ThenInclude(u => u!.OwnerProfile)
            .FirstOrDefaultAsync();

        if (obj == null) return NotFound(new { error = "Объект не найден" });

        return Ok(MapObjectFull(obj));
    }

    // --- Create object (draft) ---
    [HttpPost("objects")]
    public async Task<IActionResult> CreateObject([FromBody] ObjectSaveRequest req)
    {
        var userId = GetUserId();
        var slug = SlugService.Generate(req.Name ?? "draft");

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

        // Amenities
        if (req.AmenityIds?.Count > 0)
        {
            _db.ObjectAmenities.AddRange(req.AmenityIds.Select(aid => new ObjectAmenity { ObjectId = obj.Id, AmenityId = aid }));
        }

        // Tags
        if (req.TagIds?.Count > 0)
        {
            _db.ObjectTags.AddRange(req.TagIds.Select(tid => new ObjectTag { ObjectId = obj.Id, TagId = tid }));
        }

        // Source link
        if (!string.IsNullOrWhiteSpace(req.SourceUrl))
        {
            _db.SourceLinks.Add(new SourceLink
            {
                ObjectId = obj.Id,
                SourceName = req.SourceName,
                SourceUrl = req.SourceUrl,
                SourceType = req.SourceType
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { id = obj.Id });
    }

    // --- Update object ---
    [HttpPut("objects/{id:int}")]
    public async Task<IActionResult> UpdateObject(int id, [FromBody] ObjectSaveRequest req)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects
            .Include(o => o.ObjectAmenities)
            .Include(o => o.ObjectTags)
            .Include(o => o.SourceLink)
            .FirstOrDefaultAsync(o => o.Id == id && o.OwnerId == userId);

        if (obj == null) return NotFound(new { error = "Объект не найден" });
        if (obj.Status == ObjectStatus.Published || obj.Status == ObjectStatus.OnModeration)
        {
            // Move back to draft when editing published/on moderation
            obj.Status = ObjectStatus.Draft;
        }

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
        obj.UpdatedAt = DateTime.UtcNow;

        // Amenities sync
        _db.ObjectAmenities.RemoveRange(obj.ObjectAmenities);
        if (req.AmenityIds?.Count > 0)
            _db.ObjectAmenities.AddRange(req.AmenityIds.Select(aid => new ObjectAmenity { ObjectId = id, AmenityId = aid }));

        // Tags sync
        _db.ObjectTags.RemoveRange(obj.ObjectTags);
        if (req.TagIds?.Count > 0)
            _db.ObjectTags.AddRange(req.TagIds.Select(tid => new ObjectTag { ObjectId = id, TagId = tid }));

        // Source link
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

        await _db.SaveChangesAsync();
        return Ok(new { id = obj.Id });
    }

    // --- Tariffs CRUD ---
    [HttpPut("objects/{id:int}/tariffs")]
    public async Task<IActionResult> SaveTariffs(int id, [FromBody] List<TariffRequest> tariffs)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects.Include(o => o.Tariffs).FirstOrDefaultAsync(o => o.Id == id && o.OwnerId == userId);
        if (obj == null) return NotFound();

        _db.Tariffs.RemoveRange(obj.Tariffs);
        foreach (var t in tariffs)
        {
            _db.Tariffs.Add(new Tariff { ObjectId = id, Name = t.Name, Price = t.Price, Description = t.Description, IsActive = t.IsActive });
        }
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { count = tariffs.Count });
    }

    // --- Photos CRUD ---
    [HttpPut("objects/{id:int}/photos")]
    public async Task<IActionResult> SavePhotos(int id, [FromBody] List<PhotoRequest> photos)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects.Include(o => o.Photos).FirstOrDefaultAsync(o => o.Id == id && o.OwnerId == userId);
        if (obj == null) return NotFound();

        _db.ObjectPhotos.RemoveRange(obj.Photos);
        for (var i = 0; i < photos.Count; i++)
        {
            _db.ObjectPhotos.Add(new ObjectPhoto { ObjectId = id, Url = photos[i].Url, Alt = photos[i].Alt, SortOrder = i + 1 });
        }
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { count = photos.Count });
    }

    // --- Calendar ---
    [HttpPut("objects/{id:int}/calendar")]
    public async Task<IActionResult> SaveCalendar(int id, [FromBody] List<CalendarEntry> entries)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects.Include(o => o.AvailabilityDates).FirstOrDefaultAsync(o => o.Id == id && o.OwnerId == userId);
        if (obj == null) return NotFound();

        // Limit to 90 days forward
        var maxDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(90);
        var validEntries = entries.Where(e => DateOnly.TryParse(e.Date, out var d) && d <= maxDate).ToList();

        _db.AvailabilityCalendars.RemoveRange(obj.AvailabilityDates);
        foreach (var e in validEntries)
        {
            if (DateOnly.TryParse(e.Date, out var date) && Enum.TryParse<AvailabilityStatus>(e.Status, true, out var status))
            {
                _db.AvailabilityCalendars.Add(new AvailabilityCalendar { ObjectId = id, Date = date, Status = status });
            }
        }
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { count = validEntries.Count });
    }

    // --- Submit to moderation ---
    [HttpPost("objects/{id:int}/submit")]
    public async Task<IActionResult> SubmitForModeration(int id)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects
            .Include(o => o.Photos)
            .Include(o => o.Tariffs)
            .Include(o => o.AvailabilityDates)
            .Include(o => o.ObjectAmenities)
            .Include(o => o.Owner).ThenInclude(u => u!.OwnerProfile)
            .FirstOrDefaultAsync(o => o.Id == id && o.OwnerId == userId);

        if (obj == null) return NotFound();
        if (obj.Status != ObjectStatus.Draft && obj.Status != ObjectStatus.Rejected)
            return BadRequest(new { error = "Отправить можно только черновик или отклонённый объект" });

        // Validations
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(obj.Name)) errors.Add("Укажите название");
        if (string.IsNullOrWhiteSpace(obj.ShortDescription)) errors.Add("Укажите краткое описание");
        if (string.IsNullOrWhiteSpace(obj.FullDescription)) errors.Add("Укажите полное описание");
        if (string.IsNullOrWhiteSpace(obj.Address)) errors.Add("Укажите адрес");
        if (obj.Latitude == null || obj.Longitude == null) errors.Add("Укажите координаты на карте");
        if (obj.Photos.Count < 3) errors.Add("Добавьте минимум 3 фото");
        if (obj.Capacity < 1) errors.Add("Укажите вместимость");
        if (obj.Beds == null || obj.Beds < 1) errors.Add("Укажите количество спальных мест");
        if (!obj.Tariffs.Any(t => t.IsActive)) errors.Add("Добавьте минимум 1 активный тариф");
        if (!obj.AvailabilityDates.Any()) errors.Add("Заполните календарь доступности");
        if (obj.ObjectAmenities.Count < 3) errors.Add("Выберите минимум 3 удобства");

        var hasContact = obj.Owner?.OwnerProfile != null &&
            (!string.IsNullOrWhiteSpace(obj.Owner.OwnerProfile.ContactPhone) ||
             !string.IsNullOrWhiteSpace(obj.Owner.OwnerProfile.ContactTelegram));
        if (!hasContact) errors.Add("Заполните контактные данные в профиле");

        if (errors.Count > 0) return BadRequest(new { errors });

        obj.Status = ObjectStatus.OnModeration;
        obj.ModerationComment = null;
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { status = "on_moderation" });
    }

    // --- Archive ---
    [HttpPost("objects/{id:int}/archive")]
    public async Task<IActionResult> ArchiveObject(int id)
    {
        var userId = GetUserId();
        var obj = await _db.GlampingObjects.FirstOrDefaultAsync(o => o.Id == id && o.OwnerId == userId);
        if (obj == null) return NotFound();

        obj.Status = ObjectStatus.Archived;
        obj.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { status = "archived" });
    }

    // --- Owner Profile ---
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        var user = await _db.Users.Include(u => u.OwnerProfile).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var p = user.OwnerProfile;
        return Ok(new
        {
            contactName = p?.ContactName ?? user.FirstName,
            contactPhone = p?.ContactPhone,
            contactTelegram = p?.ContactTelegram ?? user.Username
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> SaveProfile([FromBody] ProfileRequest req)
    {
        var userId = GetUserId();
        var user = await _db.Users.Include(u => u.OwnerProfile).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        if (user.OwnerProfile == null)
        {
            user.OwnerProfile = new OwnerProfile { UserId = userId };
            _db.OwnerProfiles.Add(user.OwnerProfile);
        }
        user.OwnerProfile.ContactName = req.ContactName;
        user.OwnerProfile.ContactPhone = req.ContactPhone;
        user.OwnerProfile.ContactTelegram = req.ContactTelegram;
        user.OwnerProfile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { ok = true });
    }

    // --- Helpers ---
    private static object MapObjectFull(GlampingObject o) => new
    {
        o.Id, o.Name, o.Slug, o.ShortDescription, o.FullDescription,
        o.Capacity, o.Beds, o.Rooms, o.IsWhole, o.Area,
        o.MinRentalDays, o.MaxRentalDays,
        o.Address, o.Settlement, o.Latitude, o.Longitude,
        o.CheckInTime, o.CheckOutTime,
        o.ChildrenAllowed, o.PetsAllowed, o.SmokingAllowed, o.EventsAllowed,
        o.Deposit, o.Rules,
        Status = o.Status.ToString(),
        o.ModerationComment,
        o.ObjectTypeId, o.RegionId, o.CityOrDistrictId,
        ObjectType = new { o.ObjectType.Id, o.ObjectType.Name, o.ObjectType.Slug },
        Region = new { o.Region.Id, o.Region.Name, o.Region.Slug },
        CityOrDistrict = new { o.CityOrDistrict.Id, o.CityOrDistrict.Name, o.CityOrDistrict.Slug },
        Tariffs = o.Tariffs.Select(t => new { t.Id, t.Name, t.Price, t.Description, t.IsActive }),
        Photos = o.Photos.Select(p => new { p.Id, p.Url, p.Alt, p.SortOrder }),
        Amenities = o.ObjectAmenities.Select(oa => new { oa.Amenity.Id, oa.Amenity.Name, oa.Amenity.Slug, oa.Amenity.Icon }),
        Tags = o.ObjectTags.Select(ot => new { ot.Tag.Id, ot.Tag.Name, ot.Tag.Slug }),
        Availability = o.AvailabilityDates.Select(a => new { Date = a.Date.ToString("yyyy-MM-dd"), Status = a.Status.ToString() }),
        Source = o.SourceLink != null ? new { o.SourceLink.SourceName, o.SourceLink.SourceUrl, o.SourceLink.SourceType } : null,
        o.SeoTitle, o.SeoDescription,
        o.UpdatedAt, o.CreatedAt,
        Contact = o.Owner.OwnerProfile != null ? new
        {
            o.Owner.OwnerProfile.ContactName,
            o.Owner.OwnerProfile.ContactPhone,
            o.Owner.OwnerProfile.ContactTelegram
        } : null
    };
}

// --- Request DTOs ---
public class ObjectSaveRequest
{
    public string? Name { get; set; }
    public int ObjectTypeId { get; set; }
    public int RegionId { get; set; }
    public int CityOrDistrictId { get; set; }
    public string? ShortDescription { get; set; }
    public string? FullDescription { get; set; }
    public decimal? Area { get; set; }
    public int Capacity { get; set; }
    public int? Beds { get; set; }
    public int? Rooms { get; set; }
    public bool IsWhole { get; set; }
    public int? MinRentalDays { get; set; }
    public int? MaxRentalDays { get; set; }
    public string? Address { get; set; }
    public string? Settlement { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public bool ChildrenAllowed { get; set; }
    public bool PetsAllowed { get; set; }
    public bool SmokingAllowed { get; set; }
    public bool EventsAllowed { get; set; }
    public string? Deposit { get; set; }
    public string? Rules { get; set; }
    public List<int>? AmenityIds { get; set; }
    public List<int>? TagIds { get; set; }
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceType { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}

public class TariffRequest
{
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public class PhotoRequest
{
    public string Url { get; set; } = "";
    public string? Alt { get; set; }
}

public class CalendarEntry
{
    public string Date { get; set; } = "";
    public string Status { get; set; } = "Available";
}

public class ProfileRequest
{
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactTelegram { get; set; }
}
