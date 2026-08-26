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

    public record EnrichResult(
        int ObjectId,
        string Slug,
        bool Writable,
        List<string> Filled,
        List<string> Conflicts,
        int AmenitiesAdded,
        int PhotosAdded,
        bool TariffAdded,
        bool SourceLinkAdded);

    /// <summary>
    /// Дополняет УЖЕ СУЩЕСТВУЮЩИЙ объект данными источника.
    ///
    /// Правила:
    /// - заполняем только пустые поля; ничего существующего не перезаписываем;
    /// - расхождение (оба значения есть и различаются) не трогаем, а возвращаем
    ///   в <c>Conflicts</c> — решение принимает модератор;
    /// - удобства и фото только добавляются, никогда не удаляются;
    /// - пишем только в карточки, которые всё ещё принадлежат системному
    ///   импорт-пользователю и лежат в Draft. Карточку, которую забрал владелец
    ///   или которая уже опубликована, краулер не трогает: <c>Writable=false</c>
    ///   и возвращается один только отчёт о расхождениях.
    /// </summary>
    public async Task<EnrichResult> EnrichAsync(int objectId, ImportRequest req, bool allowOwned = false)
    {
        var obj = await _db.GlampingObjects
            .Include(o => o.Photos)
            .Include(o => o.Tariffs)
            .Include(o => o.ObjectAmenities)
            .Include(o => o.SourceLink)
            .FirstOrDefaultAsync(o => o.Id == objectId)
            ?? throw new ArgumentException($"object {objectId} not found");

        var systemOwnerId = await EnsureSystemOwnerAsync();
        var writable = allowOwned || (obj.OwnerId == systemOwnerId && obj.Status == ObjectStatus.Draft);

        var filled = new List<string>();
        var conflicts = new List<string>();

        void Text(string field, string? incoming, Func<string?> read, Action<string> write)
        {
            var value = incoming?.Trim();
            if (string.IsNullOrWhiteSpace(value)) return;
            var current = read();
            if (string.IsNullOrWhiteSpace(current))
            {
                if (writable) write(value);
                filled.Add(field);
            }
            else if (!string.Equals(current.Trim(), value, StringComparison.OrdinalIgnoreCase))
            {
                conflicts.Add($"{field}: наше «{Shorten(current)}» ≠ источник «{Shorten(value)}»");
            }
        }

        void Number<T>(string field, T? incoming, Func<T?> read, Action<T> write) where T : struct
        {
            if (incoming is not { } value) return;
            var current = read();
            if (current is null)
            {
                if (writable) write(value);
                filled.Add(field);
            }
            else if (!EqualityComparer<T>.Default.Equals(current.Value, value))
            {
                conflicts.Add($"{field}: наше «{current.Value}» ≠ источник «{value}»");
            }
        }

        Text("shortDescription", req.ShortDescription, () => obj.ShortDescription, v => obj.ShortDescription = v);
        Text("address", req.Address, () => obj.Address, v => obj.Address = v);
        Text("settlement", req.Settlement, () => obj.Settlement, v => obj.Settlement = v);
        Text("checkInTime", req.CheckInTime, () => obj.CheckInTime, v => obj.CheckInTime = v);
        Text("checkOutTime", req.CheckOutTime, () => obj.CheckOutTime, v => obj.CheckOutTime = v);

        Number("beds", req.Beds, () => obj.Beds, v => obj.Beds = v);
        Number("rooms", req.Rooms, () => obj.Rooms, v => obj.Rooms = v);
        Number("area", req.Area, () => obj.Area, v => obj.Area = v);

        // Координаты ставим только парой и только если у нас их нет вовсе.
        var lat = req.Latitude;
        var lon = req.Longitude;
        if (lat is { } la && (la < 41 || la > 82)) lat = null;
        if (lon is { } lo && (lo < 19 || lo > 180)) lon = null;
        if (lat is { } && lon is { })
        {
            if (obj.Latitude is null || obj.Longitude is null)
            {
                if (writable) { obj.Latitude = lat; obj.Longitude = lon; }
                filled.Add("coords");
            }
            else if (Haversine(obj.Latitude.Value, obj.Longitude.Value, lat.Value, lon.Value) > 500)
            {
                conflicts.Add("coords: расхождение больше 500 м");
            }
        }

        // Capacity — не nullable, поэтому «пусто» здесь значит «меньше 1».
        if (req.Capacity >= 1)
        {
            if (obj.Capacity < 1)
            {
                if (writable) obj.Capacity = req.Capacity;
                filled.Add("capacity");
            }
            else if (obj.Capacity != req.Capacity)
            {
                conflicts.Add($"capacity: наше «{obj.Capacity}» ≠ источник «{req.Capacity}»");
            }
        }

        // Флаги правил только «поднимаем» false -> true и никогда не снимаем:
        // источник знает, что что-то разрешено, но молчание источника
        // не является доказательством запрета.
        void Flag(string field, bool incoming, Func<bool> read, Action write)
        {
            if (!incoming || read()) return;
            if (writable) write();
            filled.Add(field);
        }

        Flag("childrenAllowed", req.ChildrenAllowed, () => obj.ChildrenAllowed, () => obj.ChildrenAllowed = true);
        Flag("petsAllowed", req.PetsAllowed, () => obj.PetsAllowed, () => obj.PetsAllowed = true);
        Flag("smokingAllowed", req.SmokingAllowed, () => obj.SmokingAllowed, () => obj.SmokingAllowed = true);
        Flag("eventsAllowed", req.EventsAllowed, () => obj.EventsAllowed, () => obj.EventsAllowed = true);

        // --- Удобства: только добавляем ---
        var amenitiesAdded = 0;
        var linked = obj.ObjectAmenities.Select(a => a.AmenityId).ToHashSet();
        var wantedIds = await ResolveAmenityIdsAsync(req.AmenitySlugs, req.ExtraAmenities, createMissing: writable);
        foreach (var aid in wantedIds)
        {
            if (!linked.Add(aid)) continue;
            amenitiesAdded++;
            if (writable)
                _db.ObjectAmenities.Add(new ObjectAmenity { ObjectId = obj.Id, AmenityId = aid });
        }

        // --- Фото: добавляем только если своих нет вообще ---
        var photosAdded = 0;
        if (obj.Photos.Count == 0 && req.PhotoUrls is { Count: > 0 })
        {
            var seen = new HashSet<string>();
            foreach (var rawUrl in req.PhotoUrls)
            {
                if (string.IsNullOrWhiteSpace(rawUrl)) continue;
                var url = rawUrl.Trim();
                if (!seen.Add(url)) continue;
                if (!Uri.TryCreate(url, UriKind.Absolute, out _)) continue;
                if (writable)
                {
                    _db.ObjectPhotos.Add(new ObjectPhoto
                    {
                        ObjectId = obj.Id,
                        Url = url,
                        Alt = obj.Name,
                        SortOrder = photosAdded,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
                photosAdded++;
                if (photosAdded >= 20) break;
            }
        }

        // --- Тариф «от»: только если активных тарифов нет ---
        var tariffAdded = false;
        if (req.PriceFrom is > 0 && !obj.Tariffs.Any(t => t.IsActive))
        {
            tariffAdded = true;
            if (writable)
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
        }
        else if (req.PriceFrom is > 0)
        {
            var min = obj.Tariffs.Where(t => t.IsActive).Min(t => t.Price);
            if (min != req.PriceFrom.Value)
                conflicts.Add($"priceFrom: наше «{min}» ≠ источник «{req.PriceFrom.Value}»");
        }

        // --- Ссылка на источник ---
        var normalizedUrl = NormalizeUrl(req.SourceUrl);
        var sourceLinkAdded = false;
        if (obj.SourceLink == null && !string.IsNullOrEmpty(normalizedUrl))
        {
            sourceLinkAdded = true;
            if (writable)
            {
                _db.SourceLinks.Add(new SourceLink
                {
                    ObjectId = obj.Id,
                    SourceUrl = normalizedUrl,
                    SourceName = req.SourceName?.Trim(),
                    SourceType = "competitor",
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        if (writable && (filled.Count > 0 || amenitiesAdded > 0 || photosAdded > 0 || tariffAdded || sourceLinkAdded))
        {
            obj.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return new EnrichResult(
            obj.Id, obj.Slug, writable, filled, conflicts,
            amenitiesAdded, photosAdded, tariffAdded, sourceLinkAdded);
    }

    private static string Shorten(string value) =>
        value.Length <= 60 ? value : value[..60] + "…";

    /// <summary>
    /// Сопоставляет slug'и удобств с Id в БД. Канонические берём как есть,
    /// неизвестные (<paramref name="extra"/>) создаём — но только когда
    /// вызывающая сторона реально пишет в БД.
    /// </summary>
    private async Task<List<int>> ResolveAmenityIdsAsync(
        IReadOnlyList<string>? canonical, IReadOnlyList<AmenityRef>? extra, bool createMissing)
    {
        var ids = new List<int>();

        if (canonical is { Count: > 0 })
        {
            var slugs = canonical
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();
            ids.AddRange(await _db.Amenities
                .Where(a => slugs.Contains(a.Slug))
                .Select(a => a.Id)
                .ToListAsync());
        }

        if (extra is { Count: > 0 })
        {
            var refs = extra
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
                if (existing.TryGetValue(r.Slug, out var aid))
                {
                    ids.Add(aid);
                    continue;
                }
                if (!createMissing) continue;
                var a = new Amenity
                {
                    Slug = r.Slug,
                    Name = string.IsNullOrWhiteSpace(r.Name) ? r.Slug : r.Name,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.Amenities.Add(a);
                await _db.SaveChangesAsync();
                ids.Add(a.Id);
            }
        }

        return ids.Distinct().ToList();
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
