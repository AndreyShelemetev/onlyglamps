using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;

namespace OnlyGlamps.Api.Services;

/// <summary>
/// Crawler карточек саун/бань с vsaunah.ru (Москва).
///
/// Поведение:
/// - читает sitemap-index vsaunah.ru/sitemap.xml и берёт каталог Москвы
///   (sitemap_catalog.xml);
/// - парсит карточки вида /{slug}/ (одиночный сегмент пути);
/// - берёт только публичные структурированные факты: название, адрес,
///   вместимость, удобства и ссылку источника.
///
/// Особенности источника (см. docs/vsaunah-import-mapping.md):
/// - почасовая модель цены несовместима с посуточной → цена НЕ импортируется
///   (PriceFrom = null, тариф не создаётся);
/// - основной домен = Москва → регион "moskovskaya-oblast", город "moskva",
///   тип "bani" (все объекты — бани/сауны);
/// - координаты берутся из скрытого поля cur_cat_coords (lat,lng);
/// - фото, описания, телефоны, отзывы НЕ импортируются.
/// </summary>
public class VsaunahCrawler
{
    public const string SourceName = "Vsaunah";
    public const string BaseUrl = "https://vsaunah.ru";
    public const string SitemapUrl = BaseUrl + "/sitemap.xml";

    // Москва: основной домен vsaunah.ru. Регион/город должны существовать в БД.
    private const string FixedRegionSlug = "moskovskaya-oblast";
    private const string FixedCitySlug = "moskva";
    private const string FixedTypeSlug = "bani";

    private static readonly Regex LocRx = new(
        @"<loc>\s*(https?://[^<]+)\s*</loc>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex SaunaNameRx = new(
        @"<h1[^>]*class=[""'][^""']*sauna__name[^""']*[""'][^>]*>(?<value>.*?)</h1>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex OgTitleRx = new(
        @"<meta[^>]+property=[""']og:title[""'][^>]+content=[""'](?<value>[^""']*)[""'][^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LdJsonRx = new(
        @"<script[^>]+type=[""']application/ld\+json[""'][^>]*>(?<value>.*?)</script>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LdAddressRx = new(
        @"""address""\s*:\s*""(?<value>(?:\\""|[^""])*)""",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex CapacityRx = new(
        @"Вместимость:\s*</span>\s*<span[^>]*>\s*(?<value>\d+)\s*чел",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Минимальная цена за час (фоллбек, если в JSON-LD нет priceRange).
    private static readonly Regex PricePerHourRx = new(
        @"от\s*(?<value>[\d\s]+)\s*руб/час",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Блок описания объекта.
    private static readonly Regex DescriptionRx = new(
        @"<[^>]+class=[""'][^""']*sauna-paid__descplace-text[^""']*[""'][^>]*>(?<value>.*?)</div>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LdTelephoneRx = new(
        @"""telephone""\s*:\s*""(?<value>[^""]+)""",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LdPriceRangeRx = new(
        @"""priceRange""\s*:\s*""(?<value>[^""]+)""",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Координаты объекта: скрытый input cur_cat_coords = "lat,lng".
    private static readonly Regex CatCoordsRx = new(
        @"id=[""']cur_cat_coords[""']\s+value=[""'](?<lat>-?\d{1,3}\.\d+)\s*,\s*(?<lng>-?\d{1,3}\.\d+)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Фото объекта на CDN источника (без скачивания — храним внешний URL).
    private static readonly Regex PhotoRx = new(
        @"(?:src|href|data-src|data-lazy)=[""'](?<url>https?://cdn\.vsaunah\.ru/cache/sauns/[^""']+\.(?:jpg|jpeg|png|webp))[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex SearchLinkRx = new(
        @"href=[""']/search/(?<slug>[a-z0-9\-/]+)/[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Видимые блоки характеристик зала (текстовые подписи удобств).
    private static readonly Regex CharNameRx = new(
        @"<span[^>]+class=[""'][^""']*sauna__info-name[^""']*[""'][^>]*>(?<value>.*?)</span>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Служебные одиночные сегменты, которые не являются карточками.
    private static readonly HashSet<string> ServiceSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        "search", "blog", "about", "contacts", "b2b", "faq", "favorites",
        "discounts", "vacancy", "rules", "policy", "privacy", "terms",
        "map", "reviews", "sitemap", "news", "articles",
    };

    // Маркеры удобств → канонический slug (только существующие в DataSeeder).
    private static readonly (string Marker, string Slug)[] AmenityMarkers =
    {
        ("wi-fi", "wifi"),
        ("wifi", "wifi"),
        ("вай-фай", "wifi"),
        ("интернет", "wifi"),
        ("парков", "parkovka"),
        ("стоянк", "parkovka"),
        ("саун", "banya"),
        ("баня", "banya"),
        ("бани", "banya"),
        ("парн", "banya"),
        ("хаммам", "banya"),
        ("хамам", "banya"),
        ("финск", "banya"),
        ("русск", "banya"),
        ("бассейн", "chan"),
        ("basseinom", "chan"),
        ("аквазон", "chan"),
        ("купел", "chan"),
        ("гидромасс", "chan"),
        ("гейзер", "chan"),
        ("джакуз", "chan"),
        ("чан", "chan"),
        ("мангал", "mangal"),
        ("барбекю", "mangal"),
        ("бесед", "besedka"),
        ("семей", "s-detmi"),
        ("детск", "s-detmi"),
        ("с детьми", "s-detmi"),
        ("питом", "s-pitomtsami"),
        ("животн", "s-pitomtsami"),
        ("кухн", "kuhnya"),
        ("своей едой", "kuhnya"),
        ("svoej-edoj", "kuhnya"),
        ("баром", "kuhnya"),
        ("ресторан", "kuhnya"),
        ("банкет", "kuhnya"),
        ("кафе", "kuhnya"),
        ("озер", "u-vody"),
        ("на берегу", "u-vody"),
        ("набережн", "u-vody"),
        ("пруд", "u-vody"),
        ("река", "u-vody"),
    };

    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly ImportService _import;
    private readonly ILogger<VsaunahCrawler> _log;

    public VsaunahCrawler(
        HttpClient http,
        AppDbContext db,
        ImportService import,
        ILogger<VsaunahCrawler> log)
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

    public record ParsedCard(ImportService.ImportRequest Request);

    public record CrawlSample(
        string Url,
        string Name,
        string RegionSlug,
        string TypeSlug,
        decimal? PriceFrom,
        int Capacity,
        List<string> Amenities,
        string? Address);

    public record CrawlResult(
        int Found,
        int Imported,
        int Duplicates,
        int Skipped,
        List<string> Errors,
        List<CrawlSample> Samples);

    public async Task<List<string>> FetchObjectUrlsAsync(CancellationToken ct = default)
    {
        var indexXml = await _http.GetStringAsync(SitemapUrl, ct);
        var subSitemaps = LocRx.Matches(indexXml)
            .Select(m => WebUtility.HtmlDecode(m.Groups[1].Value.Trim()))
            .Where(u => u.Contains("catalog", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (subSitemaps.Count == 0)
            subSitemaps.Add(BaseUrl + "/sitemap_catalog.xml");

        var urls = new List<string>();
        foreach (var sm in subSitemaps)
        {
            try
            {
                var xml = await _http.GetStringAsync(sm, ct);
                urls.AddRange(LocRx.Matches(xml)
                    .Select(m => WebUtility.HtmlDecode(m.Groups[1].Value.Trim())));
                await Task.Delay(300, ct);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Failed to load vsaunah sitemap {Url}", sm);
            }
        }

        return urls
            .Where(IsCardCandidate)
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

        if (!html.Contains("sauna__name", StringComparison.OrdinalIgnoreCase) &&
            !html.Contains("\"@type\": \"LocalBusiness\"", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var ld = ExtractLocalBusiness(html);

        var name = FirstNonEmpty(
            ExtractName(html),
            ld.GetValueOrDefault("name"),
            ExtractOgTitle(html));
        if (string.IsNullOrWhiteSpace(name)) return null;
        name = Regex.Replace(name, @"\s+", " ").Trim();

        var address = ld.GetValueOrDefault("address");
        var capacity = ExtractCapacity(html);
        var phone = NormalizePhone(ld.GetValueOrDefault("telephone"));
        var priceFrom = ExtractPriceFrom(ld.GetValueOrDefault("priceRange"), html);
        var description = ExtractDescription(html);
        var photos = ExtractPhotos(html);
        var (latitude, longitude) = ExtractCoordinates(html);

        var amenityTexts = ExtractAmenityTexts(html);
        var amenitySlugs = MapAmenities(amenityTexts);

        var signals = string.Join("\n", amenityTexts).ToLowerInvariant();
        var childrenAllowed = ContainsAny(signals, "семей", "детск", "с детьми");

        var req = new ImportService.ImportRequest(
            Name: name,
            SourceUrl: url,
            SourceName: SourceName,
            RegionSlug: FixedRegionSlug,
            CitySlug: FixedCitySlug,
            TypeSlug: FixedTypeSlug,
            ShortDescription: null,
            Address: address,
            Settlement: null,
            Latitude: latitude,
            Longitude: longitude,
            Capacity: capacity,
            Beds: null,
            Rooms: null,
            Area: null,
            CheckInTime: null,
            CheckOutTime: null,
            ChildrenAllowed: childrenAllowed,
            PetsAllowed: false,
            SmokingAllowed: false,
            EventsAllowed: false,
            AmenitySlugs: amenitySlugs,
            PriceFrom: priceFrom,
            PhotoUrls: photos,
            FullDescription: description,
            ExtraAmenities: null,
            PriceUnit: "hour",
            ContactPhone: phone);

        return new ParsedCard(req);
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
                        req.Address));
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
                _log.LogWarning(ex, "Vsaunah crawl error: {Url}", url);
            }

            await Task.Delay(delayMs, ct);
        }

        return new CrawlResult(urls.Count, imported, duplicates, skipped, errors, samples);
    }

    private static bool IsCardCandidate(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!uri.Host.Equals("vsaunah.ru", StringComparison.OrdinalIgnoreCase)) return false;

        var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 1) return false;          // карточки = одиночный сегмент
        if (ServiceSlugs.Contains(parts[0])) return false;
        return true;
    }

    private static Dictionary<string, string> ExtractLocalBusiness(string html)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match block in LdJsonRx.Matches(html))
        {
            var json = block.Groups["value"].Value;
            if (!json.Contains("LocalBusiness", StringComparison.OrdinalIgnoreCase)) continue;

            var nameM = Regex.Match(json, @"""name""\s*:\s*""(?<value>(?:\\""|[^""])*)""");
            if (nameM.Success) dict.TryAdd("name", UnescapeJson(nameM.Groups["value"].Value));

            var addrM = LdAddressRx.Match(json);
            if (addrM.Success) dict.TryAdd("address", UnescapeJson(addrM.Groups["value"].Value));

            var phoneM = LdTelephoneRx.Match(json);
            if (phoneM.Success) dict.TryAdd("telephone", UnescapeJson(phoneM.Groups["value"].Value));

            var priceM = LdPriceRangeRx.Match(json);
            if (priceM.Success) dict.TryAdd("priceRange", UnescapeJson(priceM.Groups["value"].Value));
            break;
        }
        return dict;
    }

    private static string? NormalizePhone(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var digits = Regex.Replace(raw, @"[^\d+]", "");
        return digits.Length >= 11 ? raw.Trim() : null;
    }

    private static decimal? ExtractPriceFrom(string? priceRange, string html)
    {
        var prices = new List<decimal>();

        if (!string.IsNullOrWhiteSpace(priceRange))
        {
            var raw = Regex.Replace(priceRange, @"[^\d]", "");
            if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var p) && p > 0)
                prices.Add(p);
        }

        foreach (Match m in PricePerHourRx.Matches(html))
        {
            var raw = Regex.Replace(m.Groups["value"].Value, @"\s+", "");
            if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var p) && p > 0)
                prices.Add(p);
        }

        return prices.Count > 0 ? prices.Min() : null;
    }

    private static string? ExtractDescription(string html)
    {
        var m = DescriptionRx.Match(html);
        if (!m.Success) return null;
        var text = HtmlToText(m.Groups["value"].Value);
        if (string.IsNullOrWhiteSpace(text)) return null;

        // Отрезаем UI-артефакты сайта-источника.
        text = Regex.Replace(text, @"\s*(Изменить информацию|Это моя сауна|Пожаловаться).*$", "",
            RegexOptions.IgnoreCase).Trim();

        // Блок-«часы работы» — это не описание объекта.
        if (text.StartsWith("Часы работы", StringComparison.OrdinalIgnoreCase)) return null;
        if (text.Length < 40) return null;

        return text.Length > 2000 ? text[..2000].TrimEnd() + "…" : text;
    }

    private static List<string> ExtractPhotos(string html)
    {
        var photos = new List<string>();
        foreach (Match m in PhotoRx.Matches(html))
        {
            var url = m.Groups["url"].Value.Trim();
            if (!photos.Contains(url, StringComparer.OrdinalIgnoreCase))
                photos.Add(url);
            if (photos.Count >= 20) break;
        }
        return photos;
    }

    // Координаты объекта из скрытого input cur_cat_coords ("lat,lng").
    // Возвращает (null, null), если координаты вне разумных пределов РФ.
    private static (double? Lat, double? Lng) ExtractCoordinates(string html)
    {
        var m = CatCoordsRx.Match(html);
        if (!m.Success) return (null, null);

        if (!double.TryParse(m.Groups["lat"].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat) ||
            !double.TryParse(m.Groups["lng"].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lng))
            return (null, null);

        // Грубый bbox РФ; отсекает мусор и дефолтные нули.
        if (lat is < 41 or > 82 || lng is < 19 or > 191)
            return (null, null);

        return (lat, lng);
    }

    private static string? ExtractName(string html)
    {
        var m = SaunaNameRx.Match(html);
        return m.Success ? HtmlToText(m.Groups["value"].Value) : null;
    }

    private static string? ExtractOgTitle(string html)
    {
        var m = OgTitleRx.Match(html);
        return m.Success ? HtmlToText(m.Groups["value"].Value) : null;
    }

    private static int ExtractCapacity(string html)
    {
        var m = CapacityRx.Match(html);
        if (m.Success && int.TryParse(m.Groups["value"].Value, out var n) && n is >= 1 and <= 100)
            return n;
        return 2;
    }

    private static List<string> ExtractAmenityTexts(string html)
    {
        var texts = new List<string>();

        foreach (Match m in SearchLinkRx.Matches(html))
            texts.Add(m.Groups["slug"].Value.Replace('/', ' '));

        foreach (Match m in CharNameRx.Matches(html))
            texts.Add(HtmlToText(m.Groups["value"].Value));

        return texts
            .Select(t => Regex.Replace(t, @"\s+", " ").Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> MapAmenities(List<string> texts)
    {
        var slugs = new List<string>();
        var source = string.Join("\n", texts).ToLowerInvariant();
        foreach (var (marker, slug) in AmenityMarkers)
        {
            if (!source.Contains(marker, StringComparison.OrdinalIgnoreCase)) continue;
            if (!slugs.Contains(slug)) slugs.Add(slug);
        }
        return slugs;
    }

    private static string UnescapeJson(string value)
    {
        var s = Regex.Replace(value, @"\\u(?<hex>[0-9a-fA-F]{4})",
            m => ((char)int.Parse(m.Groups["hex"].Value, NumberStyles.HexNumber, CultureInfo.InvariantCulture)).ToString());
        s = s.Replace("\\\"", "\"").Replace("\\/", "/").Replace("\\n", " ").Replace('\u00a0', ' ');
        return Regex.Replace(s, @"\s+", " ").Trim();
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
