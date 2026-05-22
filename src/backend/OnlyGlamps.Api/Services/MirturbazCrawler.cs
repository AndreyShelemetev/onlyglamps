using System.Globalization;
using System.IO.Compression;
using System.Net;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;

namespace OnlyGlamps.Api.Services;

/// <summary>
/// Crawler карточек с mirturbaz.ru.
///
/// Поведение:
/// - читает gzip sitemap-index из robots.txt: /sitemaps/sitemap.xml.gz;
/// - исключает служебные, фильтровые и локационные URL из /russia/regions;
/// - парсит карточки вида /russia/{region}/{object-slug};
/// - берёт только публичные структурированные факты: название, тип, регион,
///   адрес, координаты, вместимость, цену "от", удобства и ссылку источника.
///
/// robots.txt разрешает /russia/* для User-agent: *. Закрытые разделы
/// (/books, /reviews, /users и т.п.) crawler не трогает. Фото не скачиваются:
/// в БД сохраняются только внешние URL для внутренней модерации.
/// </summary>
public class MirturbazCrawler
{
    public const string SourceName = "Мир Турбаз";
    public const string BaseUrl = "https://mirturbaz.ru";
    public const string SitemapUrl = BaseUrl + "/sitemaps/sitemap.xml.gz";
    public const string RegionsUrl = BaseUrl + "/russia/regions";

    private static readonly Regex LocRx = new(
        @"<loc>\s*(https?://[^<]+)\s*</loc>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex UrlEntryRx = new(
        @"<url>\s*<loc>\s*(?<loc>https?://[^<]+)\s*</loc>(?<body>.*?)</url>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex RegionHrefRx = new(
        @"href=[""'](/russia/(?!f/)[^""'#?]+)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex H1NameRx = new(
        @"<span[^>]+class=[""'][^""']*page-title-sign[^""']*[""'][^>]*itemprop=[""']name[""'][^>]*>(.*?)</span>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex GenericH1Rx = new(
        @"<h1[^>]*>(.*?)</h1>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MetaItemRx = new(
        @"<meta[^>]+itemprop=[""'](?<name>[^""']+)[""'][^>]+content=[""'](?<value>[^""']*)[""'][^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MetaDescriptionRx = new(
        @"<meta[^>]+name=[""']description[""'][^>]+content=[""'](?<value>[^""']*)[""'][^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex WindowCampStringRx = new(
        @"window\.camp\.(?<name>[a-z_]+)\s*=\s*'(?<value>(?:\\'|[^'])*)'",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex WindowCampNumberRx = new(
        @"window\.camp\.(?<name>latitude|longitude)\s*=\s*(?<value>[-\d\.]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex AreaCenterNameRx = new(
        @"window\.area_center\.name\s*=\s*'(?<value>(?:\\'|[^'])*)'",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PriceRx = new(
        @"(?:от\s*)?([\d\s]+)\s*(?:₽|руб)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex GuestRx = new(
        @"(\d+)\s*(?:гост[ьяей]*|человек[а]?|местн|спальных?\s+мест)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PhotoRx = new(
        @"(?:src|data-src)=[""'](?<url>(?:https?:)?//[^""']+/uploads/picture/pic/[^""']+|/uploads/picture/pic/[^""']+)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LabelRx = new(
        @"<span[^>]+class=[""'][^""']*card__labels-item[^""']*[""'][^>]*>.*?<div[^>]*>(?<value>.*?)</div>.*?</span>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ApartmentTagRx = new(
        @"<div[^>]+class=[""'][^""']*apartment-tags__item[^""']*[""'][^>]*>(?<value>.*?)</div>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex InfoTextRx = new(
        @"<div[^>]+class=[""'][^""']*base-info__text[^""']*[""'][^>]*>(?<value>.*?)</div>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex CheckTimesRx = new(
        @"Заезд[^<\.]*?(?:после|с)\s*(?<in>\d{1,2}:\d{2}).*?выезд[^<\.]*?(?:до|необходимо осуществить до)\s*(?<out>\d{1,2}:\d{2})",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly HashSet<string> CategorySegments = new(StringComparer.OrdinalIgnoreCase)
    {
        "f",
        "fishing",
        "glemping",
        "gostevye-doma",
        "hunt",
        "kottedzh",
        "oteli",
        "pansionaty",
        "sanatorii",
        "sanatoriums",
        "regions",
        "water",
        "map",
    };

    private static readonly Dictionary<string, string> RegionAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Подмосковье"] = "Московская область",
        ["Крым"] = "Республика Крым",
        ["Карелия"] = "Карелия",
        ["Республика Карелия"] = "Карелия",
        ["Татарстан"] = "Татарстан",
        ["Башкортостан"] = "Республика Башкортостан",
        ["Алтай"] = "Республика Алтай",
        ["Адыгея"] = "Республика Адыгея",
        ["Дагестан"] = "Дагестан",
        ["Кабардино-Балкария"] = "Кабардино-Балкарская Республика",
        ["Республика Кабардино-Балкария"] = "Кабардино-Балкарская Республика",
        ["Карачаево-Черкесия"] = "Карачаево-Черкесская Республика",
        ["Республика Карачаево-Черкесия"] = "Карачаево-Черкесская Республика",
        ["Северная Осетия"] = "Республика Северная Осетия — Алания",
        ["Хакасия"] = "Республика Хакасия",
        ["Саха"] = "Республика Саха (Якутия)",
        ["Якутия"] = "Республика Саха (Якутия)",
        ["Республика Удмуртия"] = "Удмуртская Республика",
        ["Удмуртия"] = "Удмуртская Республика",
        ["ХМАО"] = "Ханты-Мансийский АО — Югра",
        ["Югра"] = "Ханты-Мансийский АО — Югра",
    };

    private static readonly (string Marker, string Slug, string Name)[] AmenityMarkers =
    {
        ("wi-fi", "wifi", "Wi-Fi"),
        ("wifi", "wifi", "Wi-Fi"),
        ("интернет", "wifi", "Wi-Fi"),
        ("парков", "parkovka", "Парковка"),
        ("бан", "banya", "Баня / сауна"),
        ("саун", "banya", "Баня / сауна"),
        ("хаммам", "banya", "Баня / сауна"),
        ("парн", "banya", "Баня / сауна"),
        ("чан", "chan", "Чан / купель"),
        ("купел", "chan", "Чан / купель"),
        ("джакуз", "chan", "Чан / купель"),
        ("мангал", "mangal", "Мангал"),
        ("барбекю", "mangal", "Мангал"),
        ("бесед", "besedka", "Беседка"),
        ("детск", "s-detmi", "С детьми"),
        ("питом", "s-pitomtsami", "Можно с питомцами"),
        ("животн", "s-pitomtsami", "Можно с питомцами"),
        ("кухн", "kuhnya", "Кухня"),
        ("столов", "kuhnya", "Кухня"),
        ("озер", "u-vody", "У воды"),
        ("озёр", "u-vody", "У воды"),
        ("река", "u-vody", "У воды"),
        ("рек", "u-vody", "У воды"),
        ("пруд", "u-vody", "У воды"),
        ("водохранилищ", "u-vody", "У воды"),
        ("море", "u-vody", "У воды"),
        ("водоем", "u-vody", "У воды"),
        ("водоём", "u-vody", "У воды"),
        ("лес", "u-lesa", "У леса"),
        ("отдельн", "ves-obekt", "Весь объект"),
        ("бассейн", "bassein", "Бассейн"),
        ("пляж", "plyazh", "Пляж"),
        ("ресторан", "restoran", "Ресторан"),
        ("кафе", "kafe", "Кафе"),
        ("спа", "spa", "СПА"),
        ("верховая", "konnye-progulki", "Конные прогулки"),
        ("конн", "konnye-progulki", "Конные прогулки"),
    };

    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly ImportService _import;
    private readonly ILogger<MirturbazCrawler> _log;

    public MirturbazCrawler(
        HttpClient http,
        AppDbContext db,
        ImportService import,
        ILogger<MirturbazCrawler> log)
    {
        _http = http;
        _db = db;
        _import = import;
        _log = log;
        _http.DefaultRequestHeaders.UserAgent.Clear();
        _http.DefaultRequestHeaders.UserAgent.ParseAdd(
            "OnlyGlampsBot/1.0 (+https://onlyglamps.ru/contacts; importer)");
        _http.DefaultRequestHeaders.AcceptLanguage.ParseAdd("ru,en;q=0.5");
        _http.Timeout = TimeSpan.FromSeconds(60);
    }

    public record ParsedCard(ImportService.ImportRequest Request, List<string> PhotoUrls);

    public record CrawlSample(
        string Url,
        string Name,
        string RegionSlug,
        string TypeSlug,
        decimal? PriceFrom,
        int Capacity,
        List<string> Amenities,
        List<string> Photos);

    public record CrawlResult(
        int Found,
        int Imported,
        int Duplicates,
        int Skipped,
        List<string> Errors,
        List<CrawlSample> Samples);

    public async Task<List<string>> FetchObjectUrlsAsync(CancellationToken ct = default)
    {
        var sitemapXml = await FetchMaybeGzipStringAsync(SitemapUrl, ct);
        var locs = LocRx.Matches(sitemapXml)
            .Select(m => WebUtility.HtmlDecode(m.Groups[1].Value.Trim()))
            .Where(u => u.StartsWith(BaseUrl + "/sitemaps/", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var allUrls = new List<string>();
        foreach (var loc in locs.Count > 0 ? locs : [SitemapUrl])
        {
            try
            {
                var xml = await FetchMaybeGzipStringAsync(loc, ct);
                var sitemapLocs = LocRx.Matches(xml)
                    .Select(m => WebUtility.HtmlDecode(m.Groups[1].Value.Trim()))
                    .ToList();
                var reviewParents = sitemapLocs
                    .Where(u => u.EndsWith("/reviews", StringComparison.OrdinalIgnoreCase))
                    .Select(u => u[..^"/reviews".Length])
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                var priorityObjectUrls = UrlEntryRx.Matches(xml)
                    .Where(m => m.Groups["body"].Value.Contains("<priority>0.8</priority>", StringComparison.OrdinalIgnoreCase))
                    .Select(m => WebUtility.HtmlDecode(m.Groups["loc"].Value.Trim()))
                    .ToList();

                var firstReviewParentIndex = priorityObjectUrls.FindIndex(u => reviewParents.Contains(u));
                if (firstReviewParentIndex > 20)
                    priorityObjectUrls = priorityObjectUrls.Skip(firstReviewParentIndex - 20).ToList();

                allUrls.AddRange(priorityObjectUrls.Count > 0
                    ? priorityObjectUrls
                    : sitemapLocs);
                await Task.Delay(300, ct);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Failed to load mirturbaz sitemap {Url}", loc);
            }
        }

        var locationPaths = await FetchLocationPathsAsync(ct);

        return allUrls
            .Where(IsRussiaObjectCandidate)
            .Where(u => !locationPaths.Contains(new Uri(u).AbsolutePath.TrimEnd('/')))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<ParsedCard?> ParseAsync(string url, CancellationToken ct = default)
    {
        string html;
        try
        {
            using var resp = await _http.GetAsync(url, ct);
            if (resp.StatusCode == HttpStatusCode.NotFound) return null;
            resp.EnsureSuccessStatusCode();
            html = await resp.Content.ReadAsStringAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Fetch failed: {Url}", url);
            return null;
        }

        if (!html.Contains("itemtype=\"https://schema.org/Hotel\"", StringComparison.OrdinalIgnoreCase) &&
            !html.Contains("window.camp.id", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var itemMeta = ExtractItemMeta(html);
        var camp = ExtractWindowCamp(html);

        var name = FirstNonEmpty(
            ExtractName(html),
            camp.GetValueOrDefault("name"));
        if (string.IsNullOrWhiteSpace(name)) return null;
        name = CleanName(name);

        var regionName = FirstNonEmpty(
            camp.GetValueOrDefault("region_name"),
            ExtractRegionFromAddress(itemMeta.GetValueOrDefault("address")),
            ExtractBreadcrumbRegion(html));
        var regionSlug = await ResolveRegionSlugAsync(regionName, ct);
        if (regionSlug == null)
        {
            _log.LogInformation("Skip {Url}: region not resolved (region='{Region}')", url, regionName);
            return null;
        }

        var typeSlug = ResolveTypeSlug(
            FirstNonEmpty(camp.GetValueOrDefault("category"), ExtractBreadcrumbType(html), name));

        var citySlug = await ResolveCitySlugAsync(regionSlug, FirstNonEmpty(ExtractAreaCenterName(html), ExtractBreadcrumbCity(html)), ct);

        var address = FirstNonEmpty(itemMeta.GetValueOrDefault("address"), camp.GetValueOrDefault("address"));
        var lat = ParseDouble(FirstNonEmpty(itemMeta.GetValueOrDefault("latitude"), camp.GetValueOrDefault("latitude")));
        var lon = ParseDouble(FirstNonEmpty(itemMeta.GetValueOrDefault("longitude"), camp.GetValueOrDefault("longitude")));
        var priceFrom = ExtractPrice(FirstNonEmpty(itemMeta.GetValueOrDefault("priceRange"), html));
        var capacity = ExtractCapacity(html);
        var photos = ExtractPhotos(html);
        var shortDescription = ExtractShortDescription(html);
        var amenityTexts = ExtractAmenityTexts(html, address);
        var (amenitySlugs, extraAmenities) = MapAmenities(amenityTexts);
        var (checkIn, checkOut) = ExtractCheckTimes(html);

        var allSignals = string.Join("\n", amenityTexts);
        var childrenAllowed = ContainsAny(allSignals, "детск", "с детьми", "для детей");
        var petsAllowed = ContainsAny(allSignals, "питом", "животн") &&
            !ContainsAny(allSignals, "не разрешено размещение с домашними животными", "животными не допускается");

        var req = new ImportService.ImportRequest(
            Name: name,
            SourceUrl: url,
            SourceName: SourceName,
            RegionSlug: regionSlug,
            CitySlug: citySlug,
            TypeSlug: typeSlug,
            ShortDescription: shortDescription,
            Address: address,
            Settlement: null,
            Latitude: lat,
            Longitude: lon,
            Capacity: capacity,
            Beds: null,
            Rooms: null,
            Area: null,
            CheckInTime: checkIn,
            CheckOutTime: checkOut,
            ChildrenAllowed: childrenAllowed,
            PetsAllowed: petsAllowed,
            SmokingAllowed: false,
            EventsAllowed: false,
            AmenitySlugs: amenitySlugs,
            PriceFrom: priceFrom,
            PhotoUrls: photos,
            FullDescription: null,
            ExtraAmenities: extraAmenities);

        return new ParsedCard(req, photos);
    }

    public async Task<CrawlResult> CrawlAsync(
        int offset = 0,
        int limit = 10,
        bool dryRun = true,
        int? maxPerRegion = null,
        int delayMs = 1500,
        CancellationToken ct = default)
    {
        var urls = await FetchObjectUrlsAsync(ct);
        var batch = urls.Skip(offset).Take(limit).ToList();

        var imported = 0;
        var duplicates = 0;
        var skipped = 0;
        var errors = new List<string>();
        var samples = new List<CrawlSample>();
        var perRegion = new Dictionary<string, int>();

        foreach (var url in batch)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var parsed = await ParseAsync(url, ct);
                if (parsed == null)
                {
                    skipped++;
                    continue;
                }

                var req = parsed.Request;
                if (maxPerRegion is > 0)
                {
                    perRegion.TryGetValue(req.RegionSlug, out var count);
                    if (count >= maxPerRegion.Value)
                    {
                        skipped++;
                        continue;
                    }
                    perRegion[req.RegionSlug] = count + 1;
                }

                if (samples.Count < 20)
                {
                    samples.Add(new CrawlSample(
                        req.SourceUrl,
                        req.Name,
                        req.RegionSlug,
                        req.TypeSlug,
                        req.PriceFrom,
                        req.Capacity,
                        req.AmenitySlugs?.ToList() ?? [],
                        parsed.PhotoUrls.Take(5).ToList()));
                }

                if (dryRun)
                {
                    imported++;
                }
                else
                {
                    var result = await _import.ImportAsync(req);
                    if (result.Created) imported++;
                    else duplicates++;
                }
            }
            catch (Exception ex)
            {
                errors.Add($"{url}: {ex.Message}");
                _log.LogWarning(ex, "Mirturbaz crawl error: {Url}", url);
            }

            await Task.Delay(delayMs, ct);
        }

        return new CrawlResult(urls.Count, imported, duplicates, skipped, errors, samples);
    }

    private async Task<string> FetchMaybeGzipStringAsync(string url, CancellationToken ct)
    {
        var bytes = await _http.GetByteArrayAsync(url, ct);
        if (url.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
        {
            await using var input = new MemoryStream(bytes);
            await using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var reader = new StreamReader(gzip);
            return await reader.ReadToEndAsync(ct);
        }
        return System.Text.Encoding.UTF8.GetString(bytes);
    }

    private async Task<HashSet<string>> FetchLocationPathsAsync(CancellationToken ct)
    {
        var html = await _http.GetStringAsync(RegionsUrl, ct);
        return RegionHrefRx.Matches(html)
            .Select(m => m.Groups[1].Value.TrimEnd('/'))
            .Where(p =>
            {
                var parts = p.Split('/', StringSplitOptions.RemoveEmptyEntries);
                return parts.Length is 2 or 3 && !CategorySegments.Contains(parts.Last());
            })
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsRussiaObjectCandidate(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!uri.Host.Equals("mirturbaz.ru", StringComparison.OrdinalIgnoreCase)) return false;

        var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 3) return false;
        if (!parts[0].Equals("russia", StringComparison.OrdinalIgnoreCase)) return false;
        if (CategorySegments.Contains(parts[1]) || CategorySegments.Contains(parts[2])) return false;
        if (parts[1].Equals("f", StringComparison.OrdinalIgnoreCase)) return false;
        return true;
    }

    private static Dictionary<string, string> ExtractItemMeta(string html)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in MetaItemRx.Matches(html))
        {
            var name = m.Groups["name"].Value.Trim();
            var value = HtmlToText(m.Groups["value"].Value);
            if (!string.IsNullOrWhiteSpace(name) && !string.IsNullOrWhiteSpace(value))
                dict.TryAdd(name, value);
        }
        return dict;
    }

    private static Dictionary<string, string> ExtractWindowCamp(string html)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in WindowCampStringRx.Matches(html))
            dict[m.Groups["name"].Value] = HtmlToText(m.Groups["value"].Value.Replace("\\'", "'"));
        foreach (Match m in WindowCampNumberRx.Matches(html))
            dict[m.Groups["name"].Value] = m.Groups["value"].Value;
        return dict;
    }

    private static string? ExtractName(string html)
    {
        var m = H1NameRx.Match(html);
        if (m.Success) return HtmlToText(m.Groups[1].Value);

        m = GenericH1Rx.Match(html);
        return m.Success ? HtmlToText(m.Groups[1].Value) : null;
    }

    private static string CleanName(string name)
    {
        name = Regex.Replace(name, @"\s+", " ").Trim();
        name = Regex.Replace(name, @"\s+\d(?:\s*зв[её]зд[ыа]?)?$", "", RegexOptions.IgnoreCase).Trim();
        return name;
    }

    private static string? ExtractShortDescription(string html)
    {
        var meta = MetaDescriptionRx.Match(html);
        var text = meta.Success ? HtmlToText(meta.Groups["value"].Value) : null;
        if (string.IsNullOrWhiteSpace(text))
        {
            var info = InfoTextRx.Match(html);
            text = info.Success ? HtmlToText(info.Groups["value"].Value) : null;
        }
        if (string.IsNullOrWhiteSpace(text)) return null;
        text = Regex.Replace(text, @"\s+", " ").Trim();
        return text.Length > 350 ? text[..347].TrimEnd() + "..." : text;
    }

    private static string? ExtractRegionFromAddress(string? address)
    {
        if (string.IsNullOrWhiteSpace(address)) return null;
        var first = address.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return first;
    }

    private static string? ExtractBreadcrumbRegion(string html) =>
        ExtractBreadcrumbName(html, 2);

    private static string? ExtractBreadcrumbCity(string html) =>
        ExtractBreadcrumbName(html, 3);

    private static string? ExtractBreadcrumbType(string html) =>
        ExtractBreadcrumbName(html, 1);

    private static string? ExtractBreadcrumbName(string html, int position)
    {
        var rx = new Regex(
            $@"<li[^>]+itemprop=[""']itemListElement[""'][\s\S]*?<span[^>]+itemprop=[""']name[""'][^>]*>(?<name>.*?)</span>[\s\S]*?<meta[^>]+itemprop=[""']position[""'][^>]+content=[""']{position}[""']",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);
        var m = rx.Match(html);
        return m.Success ? HtmlToText(m.Groups["name"].Value) : null;
    }

    private static string? ExtractAreaCenterName(string html)
    {
        var m = AreaCenterNameRx.Match(html);
        return m.Success ? HtmlToText(m.Groups["value"].Value.Replace("\\'", "'")) : null;
    }

    private async Task<string?> ResolveRegionSlugAsync(string? rawName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rawName)) return null;
        var name = rawName.Trim();
        if (RegionAliases.TryGetValue(name, out var alias)) name = alias;

        var normalized = NormalizeRegionName(name);
        var slug = SlugService.Generate(name);
        var regions = await _db.Regions.AsNoTracking()
            .Select(r => new { r.Slug, r.Name })
            .ToListAsync(ct);

        var exact = regions.FirstOrDefault(r =>
            r.Name.Equals(name, StringComparison.OrdinalIgnoreCase) ||
            NormalizeRegionName(r.Name).Equals(normalized, StringComparison.OrdinalIgnoreCase) ||
            r.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));
        return exact?.Slug;
    }

    private async Task<string?> ResolveCitySlugAsync(string regionSlug, string? rawName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rawName)) return null;
        var citySlug = SlugService.Generate(rawName);
        var city = await _db.CitiesAndDistricts.AsNoTracking()
            .Include(c => c.Region)
            .Where(c => c.Region.Slug == regionSlug)
            .FirstOrDefaultAsync(c => c.Slug == citySlug || c.Name == rawName.Trim(), ct);
        return city?.Slug;
    }

    private static string NormalizeRegionName(string value)
    {
        var s = value.ToLowerInvariant()
            .Replace("республика", "")
            .Replace("область", "")
            .Replace("край", "")
            .Replace("автономный округ", "")
            .Replace("ао", "");
        return Regex.Replace(s, @"\s+", " ").Trim();
    }

    private static string ResolveTypeSlug(string? source)
    {
        var s = (source ?? "").ToLowerInvariant();
        if (s.Contains("глэмп") || s.Contains("глемп") || s.Contains("кемпинг")) return "glempingi";
        if (s.Contains("гостев")) return "gostevye-doma";
        if (s.Contains("коттедж") || s.Contains("дом") || s.Contains("шале")) return "kottedzhi";
        if (s.Contains("баня")) return "bani";
        if (s.Contains("парк-отель") || s.Contains("отель") || s.Contains("гостиниц")) return "park-oteli";
        return "bazy-otdykha";
    }

    private static decimal? ExtractPrice(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var m = PriceRx.Match(text);
        if (!m.Success) return null;
        var raw = Regex.Replace(m.Groups[1].Value, @"\s+", "");
        return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var price) && price > 0
            ? price
            : null;
    }

    private static int ExtractCapacity(string html)
    {
        var values = GuestRx.Matches(HtmlToText(html))
            .Select(m => int.TryParse(m.Groups[1].Value, out var n) ? n : 0)
            .Where(n => n is >= 1 and <= 100)
            .ToList();
        return values.Count > 0 ? values.Max() : 2;
    }

    private static List<string> ExtractPhotos(string html)
    {
        var photos = new List<string>();
        foreach (Match m in PhotoRx.Matches(html))
        {
            var url = m.Groups["url"].Value.Trim();
            if (url.Contains("/review_", StringComparison.OrdinalIgnoreCase)) continue;
            if (url.Contains("review_original", StringComparison.OrdinalIgnoreCase)) continue;
            if (url.StartsWith("//", StringComparison.Ordinal)) url = "https:" + url;
            if (url.StartsWith("/", StringComparison.Ordinal)) url = BaseUrl + url;
            if (photos.Contains(url, StringComparer.OrdinalIgnoreCase)) continue;
            photos.Add(url);
            if (photos.Count >= 20) break;
        }
        return photos;
    }

    private static List<string> ExtractAmenityTexts(string html, string? address)
    {
        var texts = new List<string>();
        if (!string.IsNullOrWhiteSpace(address)) texts.Add(address);

        foreach (Match m in LabelRx.Matches(html))
            texts.Add(HtmlToText(m.Groups["value"].Value));

        foreach (Match m in ApartmentTagRx.Matches(html))
            texts.Add(HtmlToText(m.Groups["value"].Value));

        var info = InfoTextRx.Match(html);
        if (info.Success) texts.Add(HtmlToText(info.Groups["value"].Value));

        return texts
            .Select(t => Regex.Replace(t, @"\s+", " ").Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static (List<string> Slugs, List<ImportService.AmenityRef> Extras) MapAmenities(List<string> texts)
    {
        var slugs = new List<string>();
        var extras = new List<ImportService.AmenityRef>();
        var seenExtras = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var source = string.Join("\n", texts).ToLowerInvariant();

        foreach (var (marker, slug, name) in AmenityMarkers)
        {
            if (!source.Contains(marker, StringComparison.OrdinalIgnoreCase)) continue;
            if (IsCanonicalAmenitySlug(slug))
            {
                if (!slugs.Contains(slug)) slugs.Add(slug);
            }
            else if (seenExtras.Add(slug))
            {
                extras.Add(new ImportService.AmenityRef(slug, name));
            }
        }

        return (slugs, extras);
    }

    private static bool IsCanonicalAmenitySlug(string slug) => slug switch
    {
        "wifi" or "banya" or "chan" or "mangal" or "parkovka" or "besedka"
            or "u-vody" or "u-lesa" or "s-pitomtsami" or "s-detmi"
            or "kuhnya" or "ves-obekt" => true,
        _ => false,
    };

    private static (string? CheckIn, string? CheckOut) ExtractCheckTimes(string html)
    {
        var text = HtmlToText(html);
        var m = CheckTimesRx.Match(text);
        return m.Success ? (NormalizeTime(m.Groups["in"].Value), NormalizeTime(m.Groups["out"].Value)) : (null, null);
    }

    private static string? NormalizeTime(string raw)
    {
        return TimeSpan.TryParse(raw, CultureInfo.InvariantCulture, out var t)
            ? $"{(int)t.TotalHours:00}:{t.Minutes:00}"
            : null;
    }

    private static double? ParseDouble(string? value)
    {
        return double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();

    private static bool ContainsAny(string source, params string[] markers) =>
        markers.Any(m => source.Contains(m, StringComparison.OrdinalIgnoreCase));

    private static string HtmlToText(string html)
    {
        var text = Regex.Replace(html, @"<br\s*/?>", "\n", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        return Regex.Replace(text, @"\s+", " ").Trim();
    }
}
