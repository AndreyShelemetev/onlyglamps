using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Services;

/// <summary>
/// MVP-импортёр карточек из внешних источников.
/// Создаёт <see cref="GlampingObject"/> со статусом <c>Draft</c> и <see cref="SourceLink"/>.
/// Подробности маппинга и правил дедупликации — см. <c>docs/competitor-import-mapping.md</c>.
/// Никогда не публикует объект автоматически и не импортирует фото/отзывы/полные описания.
/// </summary>
public class ImportService
{
    private readonly AppDbContext _db;

    public ImportService(AppDbContext db) { _db = db; }

    /// <summary>One amenity reference. If <see cref="Slug"/> already exists in DB, it's reused;
    /// otherwise a new <see cref="Amenity"/> is created with this slug+name.</summary>
    public record AmenityRef(string Slug, string Name);

    public record ImportRequest(
        string Name,
        string SourceUrl,
        string? SourceName,
        string RegionSlug,
        string? CitySlug,
        string TypeSlug,
        string? ShortDescription,
        string? Address,
        string? Settlement,
        double? Latitude,
        double? Longitude,
        int Capacity,
        int? Beds,
        int? Rooms,
        decimal? Area,
        string? CheckInTime,
        string? CheckOutTime,
        bool ChildrenAllowed,
        bool PetsAllowed,
        bool SmokingAllowed,
        bool EventsAllowed,
        IReadOnlyList<string>? AmenitySlugs,
        decimal? PriceFrom,
        IReadOnlyList<string>? PhotoUrls = null,
        string? FullDescription = null,
        IReadOnlyList<AmenityRef>? ExtraAmenities = null,
        string? PriceUnit = null,
        string? ContactPhone = null);

    public record ImportResult(bool Created, int ObjectId, string Slug, string? DuplicateReason);

    public static string NormalizeUrl(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        if (!Uri.TryCreate(raw.Trim(), UriKind.Absolute, out var uri)) return string.Empty;
        var host = uri.Host.ToLowerInvariant();
        var path = uri.AbsolutePath.TrimEnd('/');
        if (string.IsNullOrEmpty(path)) path = "/";
        return $"{uri.Scheme}://{host}{path}";
    }

    private static string NormalizeName(string name) =>
        new string((name ?? string.Empty).ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray())
        .Trim();

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000.0;
        double toRad(double d) => d * Math.PI / 180.0;
        var dLat = toRad(lat2 - lat1);
        var dLon = toRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(toRad(lat1)) * Math.Cos(toRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * R * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    /// <summary>Возвращает Id существующего дубля либо null.</summary>
    public async Task<(int? DuplicateId, string? Reason)> FindDuplicateAsync(
        string normalizedUrl, string name, int regionId, int? cityId, double? lat, double? lon)
    {
        if (!string.IsNullOrEmpty(normalizedUrl))
        {
            var bySource = await _db.GlampingObjects
                .Where(o => o.SourceLink != null && o.SourceLink.SourceUrl == normalizedUrl)
                .Select(o => (int?)o.Id)
                .FirstOrDefaultAsync();
            if (bySource.HasValue) return (bySource, "source-url");
        }

        var normName = NormalizeName(name);
        if (!string.IsNullOrEmpty(normName))
        {
            var sameNameRegion = await _db.GlampingObjects
                .Where(o => o.RegionId == regionId)
                .Select(o => new { o.Id, o.Name, o.CityOrDistrictId, o.Latitude, o.Longitude })
                .ToListAsync();
            foreach (var cand in sameNameRegion)
            {
                if (NormalizeName(cand.Name) != normName) continue;
                if (cityId.HasValue && cand.CityOrDistrictId == cityId.Value)
                    return (cand.Id, "name+city");
                if (lat.HasValue && lon.HasValue && cand.Latitude.HasValue && cand.Longitude.HasValue)
                {
                    var dist = Haversine(lat.Value, lon.Value, cand.Latitude.Value, cand.Longitude.Value);
                    if (dist < 500) return (cand.Id, "name+geo<500m");
                }
            }
        }

        return (null, null);
    }

    public async Task<ImportResult> ImportAsync(ImportRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ArgumentException("name required");
        if (req.Capacity < 1)
            throw new ArgumentException("capacity must be >= 1");

        var normalizedUrl = NormalizeUrl(req.SourceUrl);
        if (string.IsNullOrEmpty(normalizedUrl))
            throw new ArgumentException("sourceUrl invalid");

        var region = await _db.Regions.FirstOrDefaultAsync(r => r.Slug == req.RegionSlug)
            ?? throw new ArgumentException($"region '{req.RegionSlug}' not found");
        var type = await _db.ObjectTypes.FirstOrDefaultAsync(t => t.Slug == req.TypeSlug)
            ?? throw new ArgumentException($"type '{req.TypeSlug}' not found");

        CityOrDistrict? city = null;
        if (!string.IsNullOrWhiteSpace(req.CitySlug))
        {
            city = await _db.CitiesAndDistricts
                .FirstOrDefaultAsync(c => c.RegionId == region.Id && c.Slug == req.CitySlug);
        }
        city ??= await _db.CitiesAndDistricts
            .Where(c => c.RegionId == region.Id)
            .OrderBy(c => c.Id)
            .FirstOrDefaultAsync()
            ?? throw new ArgumentException($"region '{req.RegionSlug}' has no cities; cannot import");

        // Coords sanity (RF bbox)
        double? lat = req.Latitude, lon = req.Longitude;
        if (lat is { } la && (la < 41 || la > 82)) lat = null;
        if (lon is { } lo && (lo < 19 || lo > 180)) lon = null;
        if (lat == null || lon == null) { lat = null; lon = null; }

        var dup = await FindDuplicateAsync(normalizedUrl, req.Name, region.Id, city?.Id, lat, lon);
        if (dup.DuplicateId.HasValue)
        {
            var existing = await _db.GlampingObjects
                .Where(o => o.Id == dup.DuplicateId.Value)
                .Select(o => new { o.Id, o.Slug })
                .FirstAsync();
            return new ImportResult(false, existing.Id, existing.Slug, dup.Reason);
        }

        // System owner for imported objects
        var ownerId = await EnsureSystemOwnerAsync();

        // Unique slug
        var baseSlug = SlugService.Generate(req.Name);
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "obekt";
        var slug = baseSlug;
        var n = 1;
        while (await _db.GlampingObjects.AnyAsync(o => o.Slug == slug))
        {
            n++;
            slug = $"{baseSlug}-{n}";
        }

        var obj = new GlampingObject
        {
            OwnerId = ownerId,
            ObjectTypeId = type.Id,
            RegionId = region.Id,
            CityOrDistrictId = city.Id,
            Name = req.Name.Trim(),
            Slug = slug,
            ShortDescription = req.ShortDescription?.Trim(),
            FullDescription = req.FullDescription?.Trim(),
            Capacity = req.Capacity,
            Beds = req.Beds,
            Rooms = req.Rooms,
            Area = req.Area,
            Address = req.Address?.Trim(),
            Settlement = req.Settlement?.Trim(),
            Latitude = lat,
            Longitude = lon,
            CheckInTime = req.CheckInTime,
            CheckOutTime = req.CheckOutTime,
            ChildrenAllowed = req.ChildrenAllowed,
            PetsAllowed = req.PetsAllowed,
            SmokingAllowed = req.SmokingAllowed,
            EventsAllowed = req.EventsAllowed,
            Status = ObjectStatus.Draft,
            ModerationComment = BuildModerationComment(req),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.GlampingObjects.Add(obj);
        await _db.SaveChangesAsync();

        // Amenities: a) match by slug from canonical dictionary (existing only),
        //            b) attach ExtraAmenities, auto-creating Amenity rows if missing.
        var attachedAmenityIds = new HashSet<int>();

        if (req.AmenitySlugs != null && req.AmenitySlugs.Count > 0)
        {
            var slugs = req.AmenitySlugs
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();
            var amenityIds = await _db.Amenities
                .Where(a => slugs.Contains(a.Slug))
                .Select(a => a.Id)
                .ToListAsync();
            foreach (var aid in amenityIds)
                if (attachedAmenityIds.Add(aid))
                    _db.ObjectAmenities.Add(new ObjectAmenity { ObjectId = obj.Id, AmenityId = aid });
        }

        if (req.ExtraAmenities != null && req.ExtraAmenities.Count > 0)
        {
            // Dedup incoming refs by slug
            var refs = req.ExtraAmenities
                .Where(r => !string.IsNullOrWhiteSpace(r.Slug))
                .GroupBy(r => r.Slug.Trim().ToLowerInvariant())
                .Select(g => new AmenityRef(g.Key, g.First().Name?.Trim() ?? g.Key))
                .ToList();

            var refSlugs = refs.Select(r => r.Slug).ToList();
            var existing = await _db.Amenities
                .Where(a => refSlugs.Contains(a.Slug))
                .ToDictionaryAsync(a => a.Slug, a => a.Id);

            foreach (var r in refs)
            {
                if (!existing.TryGetValue(r.Slug, out var aid))
                {
                    var a = new Amenity
                    {
                        Slug = r.Slug,
                        Name = string.IsNullOrWhiteSpace(r.Name) ? r.Slug : r.Name,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.Amenities.Add(a);
                    await _db.SaveChangesAsync();
                    aid = a.Id;
                    existing[r.Slug] = aid;
                }
                if (attachedAmenityIds.Add(aid))
                    _db.ObjectAmenities.Add(new ObjectAmenity { ObjectId = obj.Id, AmenityId = aid });
            }
        }

        // "От" tariff
        if (req.PriceFrom is > 0)
        {
            var isHourly = string.Equals(req.PriceUnit, "hour", StringComparison.OrdinalIgnoreCase);
            _db.Tariffs.Add(new Tariff
            {
                ObjectId = obj.Id,
                Name = isHourly ? "Цена за час" : "Минимальная цена",
                Price = req.PriceFrom.Value,
                Description = isHourly
                    ? "Цена за час «от», импортирована из источника. Уточните у владельца."
                    : "Цена «от», импортирована из источника. Уточните у владельца.",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _db.SourceLinks.Add(new SourceLink
        {
            ObjectId = obj.Id,
            SourceUrl = normalizedUrl,
            SourceName = req.SourceName?.Trim(),
            SourceType = "competitor",
            CreatedAt = DateTime.UtcNow,
        });

        // Photos: store external URLs as-is. We are NOT downloading binaries
        // — we only keep the public source URL so the operator can review the
        // listing visually. After moderation/claim, owner uploads originals.
        if (req.PhotoUrls != null && req.PhotoUrls.Count > 0)
        {
            var seen = new HashSet<string>();
            var sort = 0;
            foreach (var rawUrl in req.PhotoUrls)
            {
                if (string.IsNullOrWhiteSpace(rawUrl)) continue;
                var url = rawUrl.Trim();
                if (!seen.Add(url)) continue;
                if (!Uri.TryCreate(url, UriKind.Absolute, out _)) continue;
                _db.ObjectPhotos.Add(new ObjectPhoto
                {
                    ObjectId = obj.Id,
                    Url = url,
                    Alt = obj.Name,
                    SortOrder = sort++,
                    CreatedAt = DateTime.UtcNow,
                });
                if (sort >= 20) break; // safety cap
            }
        }

        await _db.SaveChangesAsync();

        return new ImportResult(true, obj.Id, obj.Slug, null);
    }

    private static string? BuildModerationComment(ImportRequest req)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(req.ContactPhone))
            parts.Add($"Телефон источника: {req.ContactPhone.Trim()}");
        return parts.Count > 0 ? string.Join("\n", parts) : null;
    }

    private async Task<int> EnsureSystemOwnerAsync()
    {
        const string email = "imported@onlyglamps.local";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user != null) return user.Id;
        user = new User
        {
            Email = email,
            Username = "imported",
            FirstName = "Импорт",
            LastName = null,
            Role = UserRole.User,
            AuthDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user.Id;
    }
}
