using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;

namespace OnlyGlamps.Api.Services;

/// <summary>
/// Crawler карточек naturalist.travel (Натуралист).
///
/// Поведение:
/// - список объектов берём из sitemap-iblock-1.xml — это ровно карточки
///   (275 шт.). Остальные карты сайта (chpy*.xml, ~100 тыс. URL) — это
///   SEO-лендинги фильтров вида /catalog/eko-oteli/u-ozera/s-rybalkoy/,
///   и по форме URL они НЕ отличаются от карточки (/catalog/glempingi/ —
///   фильтр, /catalog/tuchkovo-spa/ — объект). Поэтому единственный
///   надёжный источник списка — iblock-1;
/// - тип объекта на самой карточке не указан (в JSON-LD всё «Hotel»),
///   поэтому он берётся из страниц категорий: каждая отдаёт серверный
///   массив window.mapItems со ссылками на входящие в неё карточки;
/// - данные карточки читаем из JSON-LD @type=Hotel (название, адрес,
///   координаты, удобства, priceRange), вместимость — из DOM-блоков номеров.
///
/// Что НЕ импортируем: описания и тексты (у источника это SEO-boilerplate
/// с упоминанием бренда конкурента), отзывы и aggregateRating, телефон
/// (в JSON-LD он принадлежит оператору площадки, а не объекту).
///
/// robots.txt источника разрешает обход каталога: закрыты только
/// utm/amp/ysclid-параметры, которые мы и так не запрашиваем.
///
/// Подробности маппинга — docs/naturalist-import-mapping.md.
/// </summary>
public class NaturalistCrawler
{
    public const string SourceName = "Натуралист";
    public const string BaseUrl = "https://naturalist.travel";

    /// <summary>Карта сайта именно с карточками объектов.</summary>
    public const string ObjectSitemapUrl = BaseUrl + "/sitemap-iblock-1.xml";

    /// <summary>
    /// Категории каталога источника → slug нашего ObjectType.
    /// Используются и как источник типа, и как единственный способ его узнать.
    /// </summary>
    private static readonly (string Category, string TypeSlug)[] TypeCategories =
    {
        ("glempingi", "glempingi"),
        ("kempingi", "glempingi"),
        ("tip-kemping", "glempingi"),
        ("tip-safari-tent", "glempingi"),
        ("tip-shatyer", "glempingi"),
        ("tip-tipi", "glempingi"),
        ("tip-yurta", "glempingi"),
        ("tip-sfera", "glempingi"),
        ("gostevye-doma", "gostevye-doma"),
        ("bazy-otdykha", "bazy-otdykha"),
        ("zagorodnye-oteli", "park-oteli"),
        ("eko-oteli", "park-oteli"),
        ("tip-kottedzh", "kottedzhi"),
        ("tip-a-frame", "kottedzhi"),
        ("tip-barnkhauz", "kottedzhi"),
        ("tip-dom-na-dereve", "kottedzhi"),
        ("tip-dom-na-vode", "kottedzhi"),
        ("tip-modulnyy-dom", "kottedzhi"),
        ("tip-zerkalnyy-dom", "kottedzhi"),
        ("tipa-kapsula", "glempingi"),
    };

    /// <summary>
    /// Категории только для обнаружения карточек — тип из них не следует.
    ///
    /// Региональные страницы делят каталог географически и достают объекты,
    /// которые не попали ни в одну типовую категорию. Тип для найденного здесь
    /// объекта определяется типовой категорией (если он и в ней есть) либо
    /// маркером в названии; иначе объект пропускается.
    /// </summary>
    private static readonly string[] DiscoveryCategories =
    {
        "v-altayskom-krae", "v-astrakhanskoy-oblasti", "v-chechenskoy-respublike",
        "v-chelyabinskoy-oblasti", "v-irkutskoy-oblasti", "v-kabardino-balkarskoy-respublike",
        "v-kaliningradskoy-oblasti", "v-kaluzhskoy-oblasti", "v-kamchatskom-krae",
        "v-karachaevo-cherkesskoy-respublike", "v-khabarovskom-krae", "v-kostromskoy-oblasti",
        "v-krasnodarskom-krae", "v-krasnoyarskom-krae", "v-leningradskoy-oblasti",
        "v-lipetskoy-oblasti", "v-moskovskoy-oblasti", "v-murmanskoy-oblasti",
        "v-nizhegorodskoy-oblasti", "v-novgorodskoy-oblasti", "v-novosibirskoy-oblasti",
        "v-permskom-krae", "v-pskovskoy-oblasti", "v-respublike-adygeya",
        "v-respublike-altay", "v-respublike-bashkortostan", "v-respublike-buryatiya",
        "v-respublike-dagestan", "v-respublike-ingushetiya", "v-respublike-kareliya",
        "v-respublike-komi", "v-respublike-krym", "v-respublike-severnoy-osetii-alanii",
        "v-respublike-tatarstan", "v-rostovskoy-oblasti", "v-ryazanskoy-oblasti",
        "v-samarskoy-oblasti", "v-saratovskoy-oblasti", "v-smolenskoy-oblasti",
        "v-stavropolskom-krae", "v-sverdlovskoy-oblasti", "v-tulskoy-oblasti",
        "v-tverskoy-oblasti", "v-tyumenskoy-oblasti", "v-udmurtskoy-respublike",
        "v-volgogradskoy-oblasti", "v-vologodskoy-oblasti", "v-voronezhskoy-oblasti",
        "v-yaroslavskoy-oblasti", "vo-vladimirskoy-oblasti",
    };

    /// <summary>Фоллбек по названию, когда объект не попал ни в одну категорию.</summary>
    private static readonly (string Marker, string TypeSlug)[] TypeNameMarkers =
    {
        ("глэмпинг", "glempingi"),
        ("glamping", "glempingi"),
        ("кемпинг", "glempingi"),
        ("эко-отель", "park-oteli"),
        ("экоотель", "park-oteli"),
        ("парк-отель", "park-oteli"),
        ("отель", "park-oteli"),
        ("база отдыха", "bazy-otdykha"),
        ("турбаза", "bazy-otdykha"),
        ("гостевой дом", "gostevye-doma"),
        ("усадьба", "gostevye-doma"),
        ("коттедж", "kottedzhi"),
        ("шале", "kottedzhi"),
        ("вилла", "kottedzhi"),
    };

    /// <summary>Удобства источника → наш канонический slug (см. DataSeeder).</summary>
    private static readonly (string Marker, string Slug, string Name)[] AmenityMarkers =
    {
        ("wi-fi", "wifi", "Wi-Fi"),
        ("wifi", "wifi", "Wi-Fi"),
        ("интернет", "wifi", "Wi-Fi"),
        ("баня", "banya", "Баня / сауна"),
        ("сауна", "banya", "Баня / сауна"),
        ("хаммам", "banya", "Баня / сауна"),
        ("парн", "banya", "Баня / сауна"),
        ("чан", "chan", "Чан / купель"),
        ("купел", "chan", "Чан / купель"),
        ("джакуз", "chan", "Чан / купель"),
        ("барбекю", "mangal", "Мангал"),
        ("мангал", "mangal", "Мангал"),
        ("гриль", "mangal", "Мангал"),
        ("парковк", "parkovka", "Парковка"),
        ("бесед", "besedka", "Беседка"),
        ("детск", "s-detmi", "Можно с детьми"),
        ("питом", "s-pitomtsami", "Можно с питомцами"),
        ("животн", "s-pitomtsami", "Можно с питомцами"),
        ("pet", "s-pitomtsami", "Можно с питомцами"),
        ("кухн", "kuhnya", "Кухня"),
        ("озер", "u-vody", "У воды"),
        ("озёр", "u-vody", "У воды"),
        ("рек", "u-vody", "У воды"),
        ("пруд", "u-vody", "У воды"),
        ("водохранилищ", "u-vody", "У воды"),
        ("пляж", "u-vody", "У воды"),
        ("лес", "u-lesa", "У леса"),
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
        ["Хакасия"] = "Республика Хакасия",
        ["Якутия"] = "Республика Саха (Якутия)",
        ["Удмуртия"] = "Удмуртская Республика",
    };

    /// <summary>Префиксы населённых пунктов, которые надо снять перед матчингом.</summary>
    private static readonly string[] SettlementPrefixes =
    {
        "городской округ", "городское поселение", "сельское поселение",
        "рабочий посёлок", "рабочий поселок", "посёлок городского типа",
        "поселок городского типа", "деревня", "посёлок", "поселок",
        "станица", "хутор", "село", "город", "снт", "днп",
        "д.", "п.", "с.", "г.", "ст.", "х.",
    };

    private static readonly Regex LocRx = new(
        @"<loc>\s*(https?://[^<]+)\s*</loc>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LdJsonRx = new(
        @"<script[^>]+type=[""']application/ld\+json[""'][^>]*>(?<value>.*?)</script>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Ссылки на карточки внутри window.mapItems (JS-синтаксис `href: '...'`).</summary>
    private static readonly Regex MapItemHrefRx = new(
        @"href:\s*'/catalog/(?<slug>[a-z0-9_\-]+)/",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>«3 спальных места» — вместимость конкретного номера.</summary>
    private static readonly Regex SleepingPlacesRx = new(
        @"(?<value>\d{1,2})\s*спальны[хй]\s+мест",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>«2 взрослых на основных местах».</summary>
    private static readonly Regex AdultsRx = new(
        @"(?<value>\d{1,2})\s*взросл",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex GuestsRx = new(
        @"(?<value>\d{1,2})\s*гост",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>«от 8 900 руб.» в priceRange.</summary>
    private static readonly Regex PriceRx = new(
        @"от\s*(?<value>\d[\d\s ]*)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PhotoRx = new(
        @"(?:src|href|data-src)=[""'](?<url>/upload/[^""']+\.(?:jpg|jpeg|png|webp))[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>«(67 км от Москвы)» — хвост адреса, мешает разбору.</summary>
    private static readonly Regex DistanceTailRx = new(
        @"\s*\([^)]*\bкм\b[^)]*\)\s*$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Индекс каталога: какие карточки есть и какого они типа.</summary>
    public record CatalogIndex(Dictionary<string, string> TypeBySlug, HashSet<string> AllSlugs);

    // Индекс тяжело строится (≈70 запросов по ~1.7 МБ),
    // поэтому переживает отдельные вызовы CrawlAsync.
    private static readonly SemaphoreSlim TypeMapLock = new(1, 1);
    private static CatalogIndex? _catalogCache;
    private static DateTime _typeMapLoadedAt = DateTime.MinValue;
    private static readonly TimeSpan TypeMapTtl = TimeSpan.FromHours(6);

    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly ImportService _import;
    private readonly ILogger<NaturalistCrawler> _log;

    public NaturalistCrawler(
        HttpClient http,
        AppDbContext db,
        ImportService import,
        ILogger<NaturalistCrawler> log)
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
        string? CitySlug,
        string TypeSlug,
        decimal? PriceFrom,
        int Capacity,
        List<string> Amenities,
        int Photos);

    /// <summary>Что именно дополнили в уже существующей карточке.</summary>
    public record EnrichedSample(
        string Url,
        int ObjectId,
        string Slug,
        bool Writable,
        List<string> Filled,
        List<string> Conflicts,
        int AmenitiesAdded,
        int PhotosAdded);

    public record CrawlResult(
        int Found,
        int Imported,
        int Enriched,
        int Duplicates,
        int Skipped,
        List<string> Errors,
        List<CrawlSample> Samples,
        List<EnrichedSample> EnrichedSamples);

    /// <summary>
    /// Список карточек источника.
    ///
    /// Основа — страницы категорий: sitemap-iblock-1.xml покрывает каталог лишь
    /// частично (например, из 270 карточек /bazy-otdykha/ в нём всего 48),
    /// поэтому как единственный источник списка он не годится. Sitemap
    /// добавляем сверху — в нём попадаются карточки, не попавшие ни в одну
    /// категорию.
    /// </summary>
    public async Task<List<string>> FetchObjectUrlsAsync(
        CatalogIndex index, CancellationToken ct = default)
    {
        var slugs = new List<string>(index.AllSlugs);

        try
        {
            var xml = await _http.GetStringAsync(ObjectSitemapUrl, ct);
            slugs.AddRange(LocRx.Matches(xml)
                .Select(m => WebUtility.HtmlDecode(m.Groups[1].Value.Trim()))
                .Select(ExtractCardSlug)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!));
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Naturalist: sitemap недоступен, идём только по категориям");
        }

        return slugs
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(s => $"{BaseUrl}/catalog/{s}/")
            .ToList();
    }

    /// <summary>
    /// Строит карту «slug карточки → slug нашего типа», обходя страницы категорий.
    /// Первая категория из <see cref="TypeCategories"/> выигрывает, поэтому
    /// порядок в массиве значим: сначала более конкретные типы.
    ///
    /// Неполную карту НЕ кэшируем: иначе один оборванный прогон отравляет
    /// последующие, и карточки массово уходят в «тип не определён».
    /// </summary>
    public async Task<CatalogIndex> LoadTypeMapAsync(int delayMs, CancellationToken ct = default)
    {
        if (_catalogCache is { AllSlugs.Count: > 0 } && DateTime.UtcNow - _typeMapLoadedAt < TypeMapTtl)
            return _catalogCache;

        await TypeMapLock.WaitAsync(ct);
        try
        {
            if (_catalogCache is { AllSlugs.Count: > 0 } && DateTime.UtcNow - _typeMapLoadedAt < TypeMapTtl)
                return _catalogCache;

            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var all = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var failed = 0;

            async Task<List<string>?> ReadCategoryAsync(string category)
            {
                try
                {
                    // guests=1 снимает отсечку по вместимости: без него выдача
                    // рассчитана на 2 гостей и часть каталога не показывается.
                    var html = await _http.GetStringAsync($"{BaseUrl}/catalog/{category}/?guests=1", ct);
                    return MapItemHrefRx.Matches(html)
                        .Select(m => m.Groups["slug"].Value)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();
                }
                catch (Exception ex)
                {
                    failed++;
                    _log.LogWarning(ex, "Naturalist: не удалось прочитать категорию {Category}", category);
                    return null;
                }
            }

            foreach (var (category, typeSlug) in TypeCategories)
            {
                ct.ThrowIfCancellationRequested();
                var slugs = await ReadCategoryAsync(category);
                if (slugs != null)
                {
                    foreach (var slug in slugs)
                    {
                        map.TryAdd(slug, typeSlug);
                        all.Add(slug);
                    }
                    _log.LogInformation(
                        "Naturalist type map: /{Category}/ -> {Count} карточек ({Type})",
                        category, slugs.Count, typeSlug);
                }
                await Task.Delay(delayMs, ct);
            }

            foreach (var category in DiscoveryCategories)
            {
                ct.ThrowIfCancellationRequested();
                var slugs = await ReadCategoryAsync(category);
                if (slugs != null)
                {
                    var added = slugs.Count(s => all.Add(s));
                    _log.LogInformation(
                        "Naturalist discovery: /{Category}/ -> {Count} карточек, новых {Added}",
                        category, slugs.Count, added);
                }
                await Task.Delay(delayMs, ct);
            }

            var index = new CatalogIndex(map, all);
            if (failed == 0 && all.Count > 0)
            {
                _catalogCache = index;
                _typeMapLoadedAt = DateTime.UtcNow;
            }
            else
            {
                _log.LogWarning(
                    "Naturalist: индекс каталога неполный ({Failed} категорий не прочитано) — не кэшируем",
                    failed);
            }

            return index;
        }
        finally
        {
            TypeMapLock.Release();
        }
    }

    public async Task<ParsedCard?> ParseAsync(
        string url, IReadOnlyDictionary<string, string> typeMap, CancellationToken ct = default)
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
            _log.LogWarning(ex, "Naturalist fetch failed: {Url}", url);
            return null;
        }

        var hotel = ExtractHotelLd(html);
        if (hotel == null)
        {
            _log.LogInformation("Naturalist skip {Url}: нет JSON-LD @type=Hotel", url);
            return null;
        }

        var name = CleanName(GetString(hotel.Value, "name"));
        if (string.IsNullOrWhiteSpace(name)) return null;

        var rawAddress = GetNestedString(hotel.Value, "address", "streetAddress");
        var address = string.IsNullOrWhiteSpace(rawAddress)
            ? null
            : DistanceTailRx.Replace(rawAddress.Trim(), string.Empty);

        var (regionName, districtName, settlementName) = SplitAddress(address);

        var regionSlug = await ResolveRegionSlugAsync(regionName, ct);
        if (regionSlug == null)
        {
            _log.LogInformation("Naturalist skip {Url}: регион не определён (address='{Address}')", url, address);
            return null;
        }

        // Город ищем сначала по населённому пункту, потом по району.
        // Новые CityOrDistrict НЕ создаём — это плодило бы индексируемые
        // маршруты (см. docs/competitor-import-mapping.md §7).
        var citySlug = await ResolveCitySlugAsync(regionSlug, settlementName, ct)
                       ?? await ResolveCitySlugAsync(regionSlug, districtName, ct);

        var cardSlug = ExtractCardSlug(url);
        var typeSlug = ResolveTypeSlug(cardSlug, typeMap, name);
        if (typeSlug == null)
        {
            _log.LogInformation("Naturalist skip {Url}: тип не определён", url);
            return null;
        }

        var capacity = ExtractCapacity(html);
        if (capacity < 1)
        {
            _log.LogInformation("Naturalist skip {Url}: вместимость не найдена", url);
            return null;
        }

        var (lat, lon) = ExtractGeo(hotel.Value);
        var priceFrom = ExtractPrice(GetString(hotel.Value, "priceRange"));
        var amenityTexts = ExtractAmenityTexts(hotel.Value);
        var (amenitySlugs, extraAmenities) = MapAmenities(amenityTexts);
        var photos = ExtractPhotos(html, GetString(hotel.Value, "image"));

        var signals = string.Join("\n", amenityTexts);
        var childrenAllowed = ContainsAny(signals, "детск", "с детьми", "для детей");
        var petsAllowed = ContainsAny(signals, "питом", "животн", "pet");

        // Локальность, которую не удалось сматчить, не теряем: кладём
        // в Settlement, чтобы модератор видел, где объект на самом деле.
        var settlement = citySlug == null
            ? FirstNonEmpty(settlementName, districtName)
            : settlementName;

        var req = new ImportService.ImportRequest(
            Name: name,
            SourceUrl: NormalizeSourceUrl(url),
            SourceName: SourceName,
            RegionSlug: regionSlug,
            CitySlug: citySlug,
            TypeSlug: typeSlug,
            ShortDescription: null, // у источника это SEO-boilerplate с его брендом
            Address: address,
            Settlement: settlement,
            Latitude: lat,
            Longitude: lon,
            Capacity: capacity,
            Beds: null,
            Rooms: null,
            Area: null,
            CheckInTime: null,
            CheckOutTime: null,
            ChildrenAllowed: childrenAllowed,
            PetsAllowed: petsAllowed,
            SmokingAllowed: false,
            EventsAllowed: false,
            AmenitySlugs: amenitySlugs,
            PriceFrom: priceFrom,
            PhotoUrls: photos,
            FullDescription: null,
            ExtraAmenities: extraAmenities,
            PriceUnit: "day",
            ContactPhone: null); // телефон в JSON-LD принадлежит площадке, не объекту

        return new ParsedCard(req, photos);
    }

    /// <summary>
    /// Обходит источник и сопоставляет с нашей базой: новых создаёт как Draft,
    /// найденные дополняет через <see cref="ImportService.EnrichAsync"/>.
    /// </summary>
    public async Task<CrawlResult> CrawlAsync(
        int offset = 0,
        int limit = 10,
        bool dryRun = true,
        int? maxPerRegion = null,
        int delayMs = 1500,
        bool enrichExisting = true,
        bool allowOwned = false,
        CancellationToken ct = default)
    {
        var index = await LoadTypeMapAsync(delayMs, ct);
        var typeMap = index.TypeBySlug;
        var urls = await FetchObjectUrlsAsync(index, ct);
        var batch = urls.Skip(offset).Take(limit).ToList();

        var imported = 0;
        var enriched = 0;
        var duplicates = 0;
        var skipped = 0;
        var errors = new List<string>();
        var samples = new List<CrawlSample>();
        var enrichedSamples = new List<EnrichedSample>();
        var perRegion = new Dictionary<string, int>();

        foreach (var url in batch)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var parsed = await ParseAsync(url, typeMap, ct);
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
                        req.SourceUrl, req.Name, req.RegionSlug, req.CitySlug, req.TypeSlug,
                        req.PriceFrom, req.Capacity,
                        req.AmenitySlugs?.ToList() ?? [], parsed.PhotoUrls.Count));
                }

                if (dryRun)
                {
                    // В сухом прогоне всё равно показываем, что бы мы сделали
                    // с уже существующей карточкой: писать ничего не будем.
                    var region = await _db.Regions.AsNoTracking()
                        .FirstOrDefaultAsync(r => r.Slug == req.RegionSlug, ct);
                    var dup = region == null
                        ? (null, null)
                        : await _import.FindDuplicateAsync(
                            ImportService.NormalizeUrl(req.SourceUrl), req.Name,
                            region.Id, cityId: null, lat: req.Latitude, lon: req.Longitude);
                    if (dup.Item1.HasValue) duplicates++; else imported++;
                }
                else
                {
                    var result = await _import.ImportAsync(req);
                    if (result.Created)
                    {
                        imported++;
                    }
                    else
                    {
                        duplicates++;
                        if (enrichExisting)
                        {
                            var e = await _import.EnrichAsync(result.ObjectId, req, allowOwned);
                            var changed = e.Filled.Count > 0 || e.AmenitiesAdded > 0 ||
                                          e.PhotosAdded > 0 || e.TariffAdded || e.SourceLinkAdded;
                            if (changed && e.Writable) enriched++;
                            if (enrichedSamples.Count < 20 && (changed || e.Conflicts.Count > 0))
                            {
                                enrichedSamples.Add(new EnrichedSample(
                                    req.SourceUrl, e.ObjectId, e.Slug, e.Writable,
                                    e.Filled, e.Conflicts, e.AmenitiesAdded, e.PhotosAdded));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                errors.Add($"{url}: {ex.Message}");
                _log.LogWarning(ex, "Naturalist crawl error: {Url}", url);
            }

            await Task.Delay(delayMs, ct);
        }

        return new CrawlResult(
            urls.Count, imported, enriched, duplicates, skipped, errors, samples, enrichedSamples);
    }

    /* ---------- парсинг ---------- */

    private static JsonElement? ExtractHotelLd(string html)
    {
        foreach (Match m in LdJsonRx.Matches(html))
        {
            var raw = WebUtility.HtmlDecode(m.Groups["value"].Value).Trim();
            if (raw.Length == 0) continue;
            JsonDocument doc;
            try { doc = JsonDocument.Parse(raw); }
            catch (JsonException) { continue; }

            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("@type", out var t) &&
                t.ValueKind == JsonValueKind.String &&
                string.Equals(t.GetString(), "Hotel", StringComparison.OrdinalIgnoreCase))
            {
                return root.Clone();
            }
        }
        return null;
    }

    private static string? GetString(JsonElement obj, string prop) =>
        obj.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static string? GetNestedString(JsonElement obj, string prop, string inner) =>
        obj.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Object
            ? GetString(v, inner)
            : null;

    private static (double? Lat, double? Lon) ExtractGeo(JsonElement hotel)
    {
        if (!hotel.TryGetProperty("geo", out var geo) || geo.ValueKind != JsonValueKind.Object)
            return (null, null);
        return (ParseDouble(ReadNumberish(geo, "latitude")), ParseDouble(ReadNumberish(geo, "longitude")));
    }

    /// <summary>В источнике координаты — строки, но подстраховываемся и на числа.</summary>
    private static string? ReadNumberish(JsonElement obj, string prop)
    {
        if (!obj.TryGetProperty(prop, out var v)) return null;
        return v.ValueKind switch
        {
            JsonValueKind.String => v.GetString(),
            JsonValueKind.Number => v.GetRawText(),
            _ => null,
        };
    }

    private static List<string> ExtractAmenityTexts(JsonElement hotel)
    {
        var result = new List<string>();
        if (!hotel.TryGetProperty("amenityFeature", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            // value: "http://schema.org/False" означает, что удобства НЕТ.
            var value = GetString(item, "value");
            if (value != null && value.EndsWith("False", StringComparison.OrdinalIgnoreCase)) continue;
            var n = GetString(item, "name")?.Trim();
            if (!string.IsNullOrWhiteSpace(n)) result.Add(n);
        }
        return result;
    }

    /// <summary>
    /// Вместимость объекта = максимум по номерам. Карточка источника — это
    /// площадка с несколькими вариантами размещения, суммировать их нельзя:
    /// у нас Capacity описывает один арендуемый объект.
    /// </summary>
    private static int ExtractCapacity(string html)
    {
        var best = 0;
        foreach (Match m in SleepingPlacesRx.Matches(html))
            if (int.TryParse(m.Groups["value"].Value, out var v)) best = Math.Max(best, v);
        if (best > 0) return Math.Min(best, 50);

        foreach (Match m in AdultsRx.Matches(html))
            if (int.TryParse(m.Groups["value"].Value, out var v)) best = Math.Max(best, v);
        if (best > 0) return Math.Min(best, 50);

        foreach (Match m in GuestsRx.Matches(html))
            if (int.TryParse(m.Groups["value"].Value, out var v)) best = Math.Max(best, v);
        return Math.Min(best, 50);
    }

    private static decimal? ExtractPrice(string? priceRange)
    {
        if (string.IsNullOrWhiteSpace(priceRange)) return null;
        var m = PriceRx.Match(priceRange);
        if (!m.Success) return null;
        var digits = new string(m.Groups["value"].Value.Where(char.IsDigit).ToArray());
        if (digits.Length == 0) return null;
        return decimal.TryParse(digits, NumberStyles.Integer, CultureInfo.InvariantCulture, out var price)
               && price > 0
            ? price
            : null;
    }

    private static List<string> ExtractPhotos(string html, string? mainImage)
    {
        var urls = new List<string>();
        void Add(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return;
            var abs = raw.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? raw : BaseUrl + raw;
            if (abs.EndsWith(".svg", StringComparison.OrdinalIgnoreCase)) return;
            if (!urls.Contains(abs, StringComparer.OrdinalIgnoreCase)) urls.Add(abs);
        }

        Add(mainImage);
        foreach (Match m in PhotoRx.Matches(html))
        {
            Add(m.Groups["url"].Value);
            if (urls.Count >= 20) break;
        }
        return urls;
    }

    /// <summary>
    /// «Московская область, Рузский район, посёлок Тучково, улица Загородная, 1»
    /// → (регион, район, населённый пункт).
    /// </summary>
    private static (string? Region, string? District, string? Settlement) SplitAddress(string? address)
    {
        if (string.IsNullOrWhiteSpace(address)) return (null, null, null);
        var parts = address.Split(',')
            .Select(p => p.Trim())
            .Where(p => p.Length > 0)
            .ToList();
        if (parts.Count == 0) return (null, null, null);

        var region = parts[0];
        string? district = null;
        string? settlement = null;

        foreach (var part in parts.Skip(1))
        {
            if (district == null && part.Contains("район", StringComparison.OrdinalIgnoreCase))
            {
                district = part;
                continue;
            }
            if (settlement == null && LooksLikeSettlement(part))
            {
                settlement = part;
            }
        }

        // Города федерального значения: «Москва, улица …» — регион и есть город.
        if (settlement == null && district == null &&
            (region.Equals("Москва", StringComparison.OrdinalIgnoreCase) ||
             region.Equals("Санкт-Петербург", StringComparison.OrdinalIgnoreCase)))
        {
            settlement = region;
        }

        return (region, district, settlement);
    }

    private static bool LooksLikeSettlement(string part)
    {
        var lower = part.ToLowerInvariant();
        if (SettlementPrefixes.Any(p => lower.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            return true;
        // Улицы/дома населённым пунктом не считаем.
        if (lower.Contains("улица") || lower.Contains("ул.") || lower.Contains("шоссе") ||
            lower.Contains("проспект") || lower.Contains("переулок") || lower.Contains("влад") ||
            lower.Any(char.IsDigit))
            return false;
        return part.Length > 2;
    }

    private static string StripSettlementPrefix(string value)
    {
        var s = value.Trim();
        foreach (var p in SettlementPrefixes)
        {
            if (s.StartsWith(p, StringComparison.OrdinalIgnoreCase))
                return s[p.Length..].Trim(' ', '.', '-');
        }
        return s;
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
        var bare = StripSettlementPrefix(rawName);
        if (string.IsNullOrWhiteSpace(bare)) return null;

        var citySlug = SlugService.Generate(bare);
        var city = await _db.CitiesAndDistricts.AsNoTracking()
            .Include(c => c.Region)
            .Where(c => c.Region.Slug == regionSlug)
            .FirstOrDefaultAsync(c => c.Slug == citySlug || c.Name == bare, ct);
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

    private static string? ExtractCardSlug(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
            ? uri.AbsolutePath.Trim('/').Split('/').LastOrDefault()
            : null;

    private static string? ResolveTypeSlug(
        string? cardSlug, IReadOnlyDictionary<string, string> typeMap, string name)
    {
        if (cardSlug != null && typeMap.TryGetValue(cardSlug, out var mapped)) return mapped;

        var lower = name.ToLowerInvariant();
        foreach (var (marker, typeSlug) in TypeNameMarkers)
            if (lower.Contains(marker, StringComparison.OrdinalIgnoreCase)) return typeSlug;

        return null;
    }

    private static (List<string> Canonical, List<ImportService.AmenityRef> Extra) MapAmenities(
        IEnumerable<string> texts)
    {
        var canonical = new List<string>();
        var extra = new List<ImportService.AmenityRef>();

        foreach (var raw in texts)
        {
            var text = raw.Trim();
            if (text.Length == 0) continue;
            var lower = text.ToLowerInvariant();

            var hit = AmenityMarkers.FirstOrDefault(a =>
                lower.Contains(a.Marker, StringComparison.OrdinalIgnoreCase));
            if (hit.Slug != null)
            {
                if (!canonical.Contains(hit.Slug)) canonical.Add(hit.Slug);
                continue;
            }

            // Неизвестное удобство не выбрасываем: оно едет как ExtraAmenity,
            // словарь расширяется по факту, а не заранее.
            var slug = SlugService.Generate(text);
            if (slug.Length == 0) continue;
            if (extra.Any(e => e.Slug == slug)) continue;
            extra.Add(new ImportService.AmenityRef(slug, text));
        }

        return (canonical, extra);
    }

    private static string NormalizeSourceUrl(string url)
    {
        // Из mapItems ссылки приходят с датами поиска — они не часть адреса карточки.
        var q = url.IndexOf('?');
        return q >= 0 ? url[..q] : url;
    }

    private static string CleanName(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        var s = WebUtility.HtmlDecode(raw).Trim().Trim('"', '«', '»');
        return Regex.Replace(s, @"\s+", " ").Trim();
    }

    private static double? ParseDouble(string? raw) =>
        double.TryParse((raw ?? string.Empty).Replace(',', '.'),
            NumberStyles.Float, CultureInfo.InvariantCulture, out var v)
            ? v
            : null;

    private static bool ContainsAny(string haystack, params string[] needles) =>
        needles.Any(n => haystack.Contains(n, StringComparison.OrdinalIgnoreCase));

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
}
