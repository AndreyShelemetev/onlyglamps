using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;

namespace OnlyGlamps.Api.Services;

/// <summary>
/// Crawler карточек с глэмпинги.рф (xn--c1aaobmgio8j.xn--p1ai).
/// 
/// Поведение:
/// - читает <c>/sitemap.xml</c>, отбирает URL вида <c>/glampings/{id|slug}</c>;
/// - для каждой карточки парсит JSON-LD (<c>application/ld+json</c>) +
///   несколько DOM-крючков (H1, координаты <c>pv12Coords</c>, "интент-чипы");
/// - возвращает <see cref="ImportService.ImportRequest"/> + список URL фото;
/// - регион определяется по <c>addressLocality</c> (рус. название) -> наш Region.Name;
/// - тип объекта: всегда <c>glempingi</c> (источник не различает).
/// 
/// robots.txt сайта: <c>Allow: /</c> для всех. Карточки <c>/glampings/{id}</c>
/// явно не запрещены. Соблюдаем вежливый delay 1.5 сек/запрос и ставим
/// собственный User-Agent. Фото НЕ скачиваем, только сохраняем URL-ссылки.
/// </summary>
public class GlampingsRfCrawler
{
    public const string SourceName = "глэмпинги.рф";
    public const string BaseUrl = "https://xn--c1aaobmgio8j.xn--p1ai";
    public const string SitemapUrl = BaseUrl + "/sitemap.xml";

    private static readonly Regex JsonLdRx = new(
        @"<script[^>]*type\s*=\s*[""']application/ld\+json[""'][^>]*>(.*?)</script>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex H1Rx = new(
        @"<h1[^>]*>(.*?)</h1>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex CoordsRx = new(
        @"pv12Coords\s*=\s*\[\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\]",
        RegexOptions.Compiled);

    private static readonly Regex ChipRx = new(
        @"<span class=""t-chip-emoji"">[^<]*</span>\s*([^<]+)</span>",
        RegexOptions.Compiled);

    private static readonly Regex PriceRx = new(
        @"от\s+([\d\s]+)\s*₽",
        RegexOptions.Compiled);

    private static readonly Regex GuestsRx = new(
        @"(\d+)\s+гост[а-я]+",
        RegexOptions.Compiled);

    // Тэги/классы фото в html DOM (запасной путь, основной — image[] из JSON-LD)
    private static readonly Regex GalleryImgRx = new(
        @"<img[^>]+src=""(https?://[^""]+/cache/catalog/[^""]+)""",
        RegexOptions.Compiled);

    // Полный список «Удобства и услуги» в DOM: <div class="am-name">Имя[ <span class="am-badge-...">Платно/Бесплатно</span>]</div>
    private static readonly Regex AmNameRx = new(
        @"<div class=""am-name"">\s*([^<]+?)\s*(?:<span class=""am-badge-(?:paid|free)"">([^<]+)</span>)?\s*</div>",
        RegexOptions.Compiled);

    // Описание (длинные <p>/<ul> блоки в content-section). Берём весь html секции «Описание».
    private static readonly Regex DescriptionSectionRx = new(
        @"<div class=""content-section""[^>]*>\s*<h2[^>]*>\s*(?:📋|📝|📃)?\s*Описание\s*</h2>(.*?)</div>\s*</section>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // «Поблизости» — категории и пункты с расстоянием
    private static readonly Regex NearbyGridRx = new(
        @"<div class=""nearby-grid"">(.*?)</div>\s*</div>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex NearbyCatRx = new(
        @"<div class=""nearby-cat-title"">(?:\s*<span[^>]*>[^<]*</span>)?\s*([^<]+?)\s*</div>",
        RegexOptions.Compiled);

    private static readonly Regex NearbyItemRx = new(
        @"<span class=""name"">([^<]+)</span>\s*<span class=""dist"">([^<]+)</span>",
        RegexOptions.Compiled);

    // Заголовок секции
    private static readonly Regex SectionRx = new(
        @"<h2[^>]*>\s*(?:[^A-Za-zА-Яа-я]+\s*)?([А-Яа-яA-Za-z][^<]+?)\s*</h2>",
        RegexOptions.Compiled);

    /// <summary>Маппинг русского названия региона (addressLocality) → наш Region.Name.</summary>
    private static readonly Dictionary<string, string> RegionAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Подмосковье"] = "Московская область",
        ["Крым"] = "Республика Крым",
        ["Республика Крым"] = "Республика Крым",
        ["Карелия"] = "Республика Карелия",
        ["Республика Карелия"] = "Республика Карелия",
        ["Татарстан"] = "Республика Татарстан",
        ["Республика Татарстан"] = "Республика Татарстан",
        ["Башкортостан"] = "Республика Башкортостан",
        ["Республика Башкортостан"] = "Республика Башкортостан",
        ["Алтай"] = "Республика Алтай",
        ["Республика Алтай"] = "Республика Алтай",
        ["Алтайский край"] = "Алтайский край",
        ["Адыгея"] = "Республика Адыгея",
        ["Бурятия"] = "Республика Бурятия",
        ["Дагестан"] = "Республика Дагестан",
        ["Кабардино-Балкария"] = "Кабардино-Балкарская Республика",
        ["Карачаево-Черкесия"] = "Карачаево-Черкесская Республика",
        ["Калмыкия"] = "Республика Калмыкия",
        ["Коми"] = "Республика Коми",
        ["Марий Эл"] = "Республика Марий Эл",
        ["Мордовия"] = "Республика Мордовия",
        ["Северная Осетия"] = "Республика Северная Осетия — Алания",
        ["Тыва"] = "Республика Тыва",
        ["Удмуртия"] = "Удмуртская Республика",
        ["Хакасия"] = "Республика Хакасия",
        ["Чечня"] = "Чеченская Республика",
        ["Чувашия"] = "Чувашская Республика",
        ["Якутия"] = "Республика Саха (Якутия)",
        ["Югра"] = "Ханты-Мансийский автономный округ — Югра",
        ["ХМАО"] = "Ханты-Мансийский автономный округ — Югра",
        ["ЯНАО"] = "Ямало-Ненецкий автономный округ",
        ["НАО"] = "Ненецкий автономный округ",
        ["Чукотка"] = "Чукотский автономный округ",
        ["Москва"] = "Москва",
        ["Санкт-Петербург"] = "Санкт-Петербург",
        ["Севастополь"] = "Севастополь",
    };

    /// <summary>Маппинг amenity-названий и интент-чипов конкурента → наши slug.
    /// Сюда попадают только «канонические» наши amenity (которые уже в DataSeeder).
    /// Прочие пункты (микроволновка, шезлонги и т.п.) не теряются — они уезжают
    /// в <c>ExtraAmenities</c> и автосоздаются в БД через <see cref="ImportService"/>.</summary>
    private static readonly Dictionary<string, string> AmenityMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // amenityFeature
        ["Интернет"] = "wifi",
        ["Wi-Fi"] = "wifi",
        ["Wifi"] = "wifi",
        ["Есть WI-FI"] = "wifi",
        ["Парковка"] = "parkovka",
        ["Общая кухня"] = "kuhnya",
        ["Кухня"] = "kuhnya",
        ["Домашние животные"] = "s-pitomtsami",
        ["Можно с питомцем"] = "s-pitomtsami",
        ["Можно с Питомцем"] = "s-pitomtsami",
        // интент-чипы (с эмодзи)
        ["У воды"] = "u-vody",
        ["У леса"] = "u-lesa",
        ["В лесу"] = "u-lesa",
        ["Горячий чан"] = "chan",
        ["Чан"] = "chan",
        ["Купель"] = "chan",
        ["Баня"] = "banya",
        ["Сауна"] = "banya",
        ["Мангал"] = "mangal",
        ["Беседка"] = "besedka",
        ["С детьми"] = "s-detmi",
        ["Можно с детьми"] = "s-detmi",
        ["Весь объект"] = "ves-obekt",
        // частые «Собственная Баня…»/«Собственная Мангальная зона…»
        ["Собственная Баня около домика"] = "banya",
        ["Собственная Мангальная зона около домика"] = "mangal",
    };

    /// <summary>Префиксы из «Собственная X около домика» → канонический slug.</summary>
    private static readonly (string Marker, string Slug, string Name)[] AmenityKeywordSlugs =
    {
        ("баня", "banya", "Баня / сауна"),
        ("сауна", "banya", "Баня / сауна"),
        ("чан", "chan", "Чан / купель"),
        ("купель", "chan", "Чан / купель"),
        ("мангал", "mangal", "Мангал"),
        ("беседк", "besedka", "Беседка"),
        ("wi-fi", "wifi", "Wi-Fi"),
        ("wifi", "wifi", "Wi-Fi"),
        ("интернет", "wifi", "Wi-Fi"),
        ("парковк", "parkovka", "Парковка"),
        ("кухн", "kuhnya", "Кухня"),
        ("костр", "kostrovaya-zona", "Костровая зона"),
        ("шезлонг", "shezlongi", "Шезлонги"),
        ("гамак", "gamaki", "Гамаки и качели"),
        ("микроволнов", "mikrovolnovka", "Микроволновая печь"),
        ("холодильник", "kholodilnik", "Холодильник"),
        ("чайник", "chaynik", "Чайник"),
        ("sup", "sup-serf", "SUP-серф"),
        ("лыж", "lyzhi", "Лыжи"),
        ("настольн", "nastolnye-igry", "Настольные игры"),
        ("экскурс", "ekskursii", "Экскурсии"),
        ("конные прогулк", "konnye-progulki", "Конные прогулки"),
        ("трансфер", "transfer", "Трансфер"),
    };

    /// <summary>Тексты, которые нужно игнорировать (категории/негативные).</summary>
    private static readonly HashSet<string> AmenityStopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "Общие", "Развлечения", "Территория",
        "Размещение домашних животных не допускается",
    };

    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly ImportService _import;
    private readonly ILogger<GlampingsRfCrawler> _log;

    public GlampingsRfCrawler(
        HttpClient http,
        AppDbContext db,
        ImportService import,
        ILogger<GlampingsRfCrawler> log)
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

    // ============================================================
    // SITEMAP
    // ============================================================

    /// <summary>
    /// Возвращает список URL карточек (только <c>/glampings/{id|slug}</c>,
    /// без trailing slash — это страницы регионов).
    /// </summary>
    public async Task<List<string>> FetchObjectUrlsAsync(CancellationToken ct = default)
    {
        var xml = await _http.GetStringAsync(SitemapUrl, ct);
        var doc = XDocument.Parse(xml);
        XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
        var allLocs = doc.Descendants(ns + "loc").Select(x => x.Value.Trim()).ToList();

        // Если это sitemap-index — рекурсивно загрузим вложенные.
        if (doc.Root?.Name.LocalName == "sitemapindex")
        {
            var urls = new List<string>();
            foreach (var sub in allLocs)
            {
                try
                {
                    var subXml = await _http.GetStringAsync(sub, ct);
                    var subDoc = XDocument.Parse(subXml);
                    urls.AddRange(subDoc.Descendants(ns + "loc").Select(x => x.Value.Trim()));
                    await Task.Delay(500, ct);
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Failed to load sub-sitemap {Url}", sub);
                }
            }
            allLocs = urls;
        }

        // /glampings/{что-то-без-слэша} — карточка.
        // /glampings/{регион}/ — список региона (skip).
        // /stories/... — статьи (skip).
        var rx = new Regex(@"^https?://[^/]+/glampings/[^/?#]+$", RegexOptions.IgnoreCase);
        return allLocs
            .Where(u => rx.IsMatch(u))
            .Distinct()
            .ToList();
    }

    // ============================================================
    // PARSE ONE PAGE
    // ============================================================

    public record ParsedCard(
        ImportService.ImportRequest Request,
        List<string> PhotoUrls);

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

        // ---- JSON-LD (LodgingBusiness) ----
        JsonElement? ld = null;
        foreach (Match m in JsonLdRx.Matches(html))
        {
            // ВАЖНО: не делать HtmlDecode на JSON-LD — внутри строк бывают валидные
            // &quot; (например, в text-полях FAQ), которые после decode сломают JSON.
            var raw = m.Groups[1].Value.Trim();
            try
            {
                var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;
                var type = root.TryGetProperty("@type", out var t) ? t.GetString() : null;
                if (type != null && type.Contains("Lodging", StringComparison.OrdinalIgnoreCase) ||
                    type != null && type.Contains("Hotel", StringComparison.OrdinalIgnoreCase) ||
                    type != null && type.Contains("BedAndBreakfast", StringComparison.OrdinalIgnoreCase) ||
                    type != null && type.Contains("Campground", StringComparison.OrdinalIgnoreCase))
                {
                    ld = root.Clone();
                    break;
                }
            }
            catch { /* ignore */ }
        }

        // ---- H1 (реальное название площадки, надёжнее JSON-LD.name) ----
        string? h1 = null;
        var h1m = H1Rx.Match(html);
        if (h1m.Success)
        {
            // Уберём вложенные теги/badge
            var raw = Regex.Replace(h1m.Groups[1].Value, @"<[^>]+>", " ");
            raw = WebUtility.HtmlDecode(raw);
            raw = Regex.Replace(raw, @"\s+", " ").Trim();
            // Уберём финальный "#999"
            raw = Regex.Replace(raw, @"\s*#\d+\s*$", "");
            if (!string.IsNullOrWhiteSpace(raw)) h1 = raw;
        }

        // ---- Координаты ----
        double? lat = null, lon = null;
        var cm = CoordsRx.Match(html);
        if (cm.Success
            && double.TryParse(cm.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var la)
            && double.TryParse(cm.Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lo))
        {
            lat = la; lon = lo;
        }

        // ---- Чипы (интенты) ----
        var chips = ChipRx.Matches(html)
            .Select(m => WebUtility.HtmlDecode(m.Groups[1].Value).Trim())
            .Where(s => s.Length > 0)
            .ToList();

        // ---- Поля из JSON-LD ----
        string? name = null;
        string? description = null;
        string? streetAddress = null;
        string? addressLocality = null;
        string? checkin = null;
        string? checkout = null;
        var amenityNames = new List<string>();
        var photos = new List<string>();
        decimal? priceFrom = null;

        if (ld is JsonElement L)
        {
            if (L.TryGetProperty("name", out var jn) && jn.ValueKind == JsonValueKind.String)
                name = WebUtility.HtmlDecode(jn.GetString() ?? "").Trim();
            if (L.TryGetProperty("description", out var jd) && jd.ValueKind == JsonValueKind.String)
                description = WebUtility.HtmlDecode(jd.GetString() ?? "").Trim();
            if (L.TryGetProperty("checkinTime", out var jci) && jci.ValueKind == JsonValueKind.String)
                checkin = jci.GetString();
            if (L.TryGetProperty("checkoutTime", out var jco) && jco.ValueKind == JsonValueKind.String)
                checkout = jco.GetString();

            if (L.TryGetProperty("address", out var ja) && ja.ValueKind == JsonValueKind.Object)
            {
                if (ja.TryGetProperty("streetAddress", out var sa) && sa.ValueKind == JsonValueKind.String)
                    streetAddress = sa.GetString()?.Trim();
                if (ja.TryGetProperty("addressLocality", out var al) && al.ValueKind == JsonValueKind.String)
                    addressLocality = al.GetString()?.Trim();
            }

            if (L.TryGetProperty("priceRange", out var pr) && pr.ValueKind == JsonValueKind.String)
            {
                var pm = PriceRx.Match(pr.GetString() ?? "");
                if (pm.Success && decimal.TryParse(
                        Regex.Replace(pm.Groups[1].Value, @"\s+", ""),
                        NumberStyles.Number, CultureInfo.InvariantCulture, out var p))
                {
                    priceFrom = p;
                }
            }

            if (L.TryGetProperty("amenityFeature", out var af) && af.ValueKind == JsonValueKind.Array)
            {
                foreach (var a in af.EnumerateArray())
                {
                    if (a.TryGetProperty("name", out var an) && an.ValueKind == JsonValueKind.String)
                        amenityNames.Add(an.GetString() ?? "");
                }
            }

            if (L.TryGetProperty("image", out var jim))
            {
                if (jim.ValueKind == JsonValueKind.Array)
                    foreach (var i in jim.EnumerateArray())
                        if (i.ValueKind == JsonValueKind.String)
                            photos.Add(i.GetString() ?? "");
                else if (jim.ValueKind == JsonValueKind.String)
                    photos.Add(jim.GetString() ?? "");
            }
        }

        // Запасной путь по фото — из DOM (если JSON-LD пуст)
        if (photos.Count == 0)
        {
            photos = GalleryImgRx.Matches(html)
                .Select(m => m.Groups[1].Value)
                .Distinct()
                .Take(20)
                .ToList();
        }

        // Нормализация: приоритет 912x912 над 450x450, дедуп по «корню» имени файла.
        photos = NormalizePhotos(photos);

        // Capacity — берём первое число «гостей» в DOM (грубая эвристика).
        int capacity = 2;
        var gm = GuestsRx.Match(html);
        if (gm.Success && int.TryParse(gm.Groups[1].Value, out var cap) && cap >= 1 && cap <= 50)
            capacity = cap;

        // Финальное название. H1 usually carries a cleaner marketing title,
        // but some pages use generic "Объект #123"; then JSON-LD is better.
        var jsonName = !string.IsNullOrWhiteSpace(name) ? name.Trim() : null;
        var finalName = !IsGenericObjectName(h1) ? h1
            : (!IsGenericObjectName(jsonName) ? jsonName : h1 ?? jsonName);
        if (string.IsNullOrWhiteSpace(finalName)) return null;

        // Регион
        var regionSlug = await ResolveRegionSlugAsync(addressLocality, ct);
        if (regionSlug == null)
        {
            _log.LogInformation("Skip {Url}: region not resolved (locality='{L}')", url, addressLocality);
            return null;
        }

        // Amenity slugs (amenityFeature + чипы + DOM .am-name) с дедупом.
        // Что не маппится в наши канонические — уезжает в ExtraAmenities (auto-create).
        var amenitySlugs = new List<string>();
        var extraAmenities = new List<ImportService.AmenityRef>();
        var seenExtras = new HashSet<string>();

        // Структурированный список «am-name» (с пометкой Платно/Бесплатно)
        var amItems = ExtractAmNameItems(html);

        var allAmenityTexts = amenityNames
            .Concat(chips)
            .Concat(amItems.Select(i => i.Name))
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var src in allAmenityTexts)
        {
            // Stop-words: чистые категории/негативные фразы.
            if (AmenityStopWords.Contains(src)) continue;
            if (src.Contains("не допуска", StringComparison.OrdinalIgnoreCase) ||
                src.Contains("Не разреш", StringComparison.OrdinalIgnoreCase))
                continue;

            // 1) точное совпадение в каноническом словаре
            if (AmenityMap.TryGetValue(src, out var slug))
            {
                if (!amenitySlugs.Contains(slug)) amenitySlugs.Add(slug);
                continue;
            }
            // 2) ключевые слова — нормализуем «Собственная Баня около домика» -> banya
            (string Slug, string Name)? matched = null;
            foreach (var (marker, ms, mn) in AmenityKeywordSlugs)
            {
                if (src.Contains(marker, StringComparison.OrdinalIgnoreCase))
                {
                    matched = (ms, mn);
                    break;
                }
            }
            if (matched is { } mt)
            {
                // Канонические (есть в DataSeeder) — кладём в amenitySlugs;
                // Не-канонические (kostrovaya-zona, sup-serf и т.п.) — в extras с фикс. slug+name.
                if (IsCanonicalAmenitySlug(mt.Slug))
                {
                    if (!amenitySlugs.Contains(mt.Slug)) amenitySlugs.Add(mt.Slug);
                }
                else if (seenExtras.Add(mt.Slug))
                {
                    extraAmenities.Add(new ImportService.AmenityRef(mt.Slug, mt.Name));
                }
                continue;
            }
            // 3) extra (auto-create в ImportService) — на всякий случай
            var extraSlug = SlugService.Generate(src);
            if (string.IsNullOrEmpty(extraSlug)) continue;
            if (!seenExtras.Add(extraSlug)) continue;
            var displayName = src.Length > 60 ? src[..60].Trim() : src;
            extraAmenities.Add(new ImportService.AmenityRef(extraSlug, displayName));
        }

        var pets = amenityNames.Any(a => a.Contains("животн", StringComparison.OrdinalIgnoreCase))
            || chips.Any(c => c.Contains("питомц", StringComparison.OrdinalIgnoreCase));
        // Если в am-name есть «не допускается» — фактически нельзя.
        if (amItems.Any(i => i.Name.Contains("не допуска", StringComparison.OrdinalIgnoreCase)))
            pets = false;

        // ---- Описание из DOM (длинный текст) ----
        var domDescription = ExtractDescriptionHtml(html);

        // ---- «Как добраться» ----
        var howToGet = ExtractHowToGetThere(html);

        // ---- «Поблизости» ----
        var nearby = ExtractNearby(html);

        // ---- FAQ ----
        var faqs = ExtractFaq(html);

        // ---- Сводка по отзывам (aggregateRating) ----
        string? reviewsSummary = null;
        if (ld is JsonElement ld2 && ld2.TryGetProperty("aggregateRating", out var agg)
            && agg.ValueKind == JsonValueKind.Object)
        {
            string? rv = agg.TryGetProperty("ratingValue", out var rva) ? rva.ToString() : null;
            string? rc = agg.TryGetProperty("reviewCount", out var rcc) ? rcc.ToString() : null;
            if (!string.IsNullOrEmpty(rv) && !string.IsNullOrEmpty(rc))
                reviewsSummary = $"Рейтинг {rv}/5 на основе {rc} отзывов на источнике.";
        }

        // ---- Сборка FullDescription (HTML) ----
        var fullDescription = BuildFullDescription(
            domDescription, amItems, howToGet, nearby, faqs, reviewsSummary);

        // Short description: первые 300 символов чистого текста описания (без HTML)
        var shortDescription = description;
        if (string.IsNullOrWhiteSpace(shortDescription) && !string.IsNullOrEmpty(domDescription))
        {
            var plain = StripHtml(domDescription);
            shortDescription = plain.Length > 300 ? plain[..297].TrimEnd() + "…" : plain;
        }
        if (shortDescription != null && shortDescription.Length > 350)
            shortDescription = shortDescription[..347].TrimEnd() + "…";

        var req = new ImportService.ImportRequest(
            Name: finalName!,
            SourceUrl: url,
            SourceName: SourceName,
            RegionSlug: regionSlug,
            CitySlug: null,
            TypeSlug: "glempingi",
            ShortDescription: shortDescription,
            Address: streetAddress,
            Settlement: null,
            Latitude: lat,
            Longitude: lon,
            Capacity: capacity,
            Beds: null,
            Rooms: null,
            Area: null,
            CheckInTime: checkin,
            CheckOutTime: checkout,
            ChildrenAllowed: chips.Any(c => c.Contains("детьми", StringComparison.OrdinalIgnoreCase)),
            PetsAllowed: pets,
            SmokingAllowed: false,
            EventsAllowed: false,
            AmenitySlugs: amenitySlugs,
            PriceFrom: priceFrom,
            PhotoUrls: photos,
            FullDescription: fullDescription,
            ExtraAmenities: extraAmenities);

        return new ParsedCard(req, photos);
    }

    // ============================================================
    // EXTRACTORS (DOM)
    // ============================================================

    private record AmItem(string Name, string? Badge);

    /// <summary>Slug, который точно есть в DataSeeder (см. DataSeeder.SeedAsync).</summary>
    private static bool IsCanonicalAmenitySlug(string slug) => slug switch
    {
        "wifi" or "banya" or "chan" or "mangal" or "parkovka" or "besedka"
            or "u-vody" or "u-lesa" or "s-pitomtsami" or "s-detmi"
            or "kuhnya" or "ves-obekt" => true,
        _ => false,
    };

    private static List<AmItem> ExtractAmNameItems(string html)
    {
        var list = new List<AmItem>();
        foreach (Match m in AmNameRx.Matches(html))
        {
            var nm = WebUtility.HtmlDecode(m.Groups[1].Value).Trim();
            if (string.IsNullOrEmpty(nm)) continue;
            var badge = m.Groups[2].Success ? m.Groups[2].Value.Trim() : null;
            list.Add(new AmItem(nm, badge));
        }
        return list;
    }

    /// <summary>Возвращает безопасный HTML описания (длинный текст из секции «Описание»).
    /// Если выделенной секции нет — собирает <p>/<ul> из общего описания BedAndBreakfast-блока.</summary>
    private static string ExtractDescriptionHtml(string html)
    {
        var sec = DescriptionSectionRx.Match(html);
        var raw = sec.Success ? sec.Groups[1].Value : null;
        if (string.IsNullOrWhiteSpace(raw))
        {
            // Запасной путь: ищем длинные блоки <p>...</p> подряд (≥ 200 символов суммарно)
            var paras = Regex.Matches(html, @"<p>([^<]{30,}|[^<]+(?:<strong>[^<]+</strong>[^<]*){1,})</p>", RegexOptions.Singleline)
                .Cast<Match>()
                .Select(m => m.Value)
                .Take(15)
                .ToList();
            if (paras.Sum(p => p.Length) >= 200)
                raw = string.Concat(paras);
        }
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        var sanitized = SanitizeHtml(raw);
        // Удаляем «модальные» подсказки сайта-источника, которые попадают в общий
        // список <p>: «Войдите, чтобы…», «Подарите сертификат…» и т.п.
        sanitized = Regex.Replace(
            sanitized,
            @"<p>\s*(?:Войдите[^<]*|Подарите сертификат[^<]*)</p>",
            "",
            RegexOptions.IgnoreCase);
        return ReorderLeadParagraphs(sanitized);
    }

    /// <summary>
    /// Переставляет первые абзацы местами (1<->2), чтобы описание не совпадало
    /// с источником дословно при сохранении смысла и фактов.
    /// </summary>
    private static string ReorderLeadParagraphs(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return html;

        var lead = Regex.Match(
            html,
            @"^\s*((?:<p>.*?</p>\s*){2,})",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);
        if (!lead.Success) return html;

        var paras = Regex.Matches(lead.Groups[1].Value, @"<p>.*?</p>", RegexOptions.Singleline | RegexOptions.IgnoreCase)
            .Select(m => m.Value)
            .ToList();
        if (paras.Count < 2) return html;

        (paras[0], paras[1]) = (paras[1], paras[0]);
        var reorderedLead = string.Concat(paras);
        return reorderedLead + html[lead.Length..];
    }

    /// <summary>Параграф после «<strong>Как добраться?</strong>» (если есть).</summary>
    private static string? ExtractHowToGetThere(string html)
    {
        var m = Regex.Match(html,
            @"<strong>\s*Как добраться\??\s*</strong>\s*</p>\s*((?:<p>.*?</p>\s*){1,3})",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);
        if (!m.Success) return null;
        return SanitizeHtml(m.Groups[1].Value);
    }

    private record NearbyCat(string Title, List<NearbyItem> Items);
    private record NearbyItem(string Name, string Distance);

    /// <summary>HtmlDecode в два прохода: источник иногда хранит двойные entity
    /// (напр. <c>&amp;quot;</c>) — после одного декода было бы <c>&quot;</c>, после второго — <c>"</c>.</summary>
    private static string Decode2(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        var first = WebUtility.HtmlDecode(s);
        if (string.Equals(first, s, StringComparison.Ordinal)) return first;
        var second = WebUtility.HtmlDecode(first);
        return second;
    }

    private static List<NearbyCat> ExtractNearby(string html)
    {
        var result = new List<NearbyCat>();
        var grid = NearbyGridRx.Match(html);
        if (!grid.Success) return result;

        var inner = grid.Groups[1].Value;
        // Разделяем по cat-title
        var parts = Regex.Split(inner, @"(?=<div class=""nearby-cat-title"">)");
        foreach (var part in parts)
        {
            var cm = NearbyCatRx.Match(part);
            if (!cm.Success) continue;
            var title = Decode2(cm.Groups[1].Value).Trim();
            var items = NearbyItemRx.Matches(part)
                .Select(m => new NearbyItem(
                    Decode2(m.Groups[1].Value).Trim(),
                    Decode2(m.Groups[2].Value).Trim()))
                .Where(i => !string.IsNullOrEmpty(i.Name))
                .Take(20)
                .ToList();
            if (items.Count > 0) result.Add(new NearbyCat(title, items));
        }
        return result;
    }

    private record FaqItem(string Question, string Answer);

    private static List<FaqItem> ExtractFaq(string html)
    {
        var list = new List<FaqItem>();
        foreach (Match m in JsonLdRx.Matches(html))
        {
            var raw = m.Groups[1].Value.Trim();
            try
            {
                var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;
                var type = root.TryGetProperty("@type", out var t) ? t.GetString() : null;
                if (type != "FAQPage") continue;
                if (!root.TryGetProperty("mainEntity", out var me) || me.ValueKind != JsonValueKind.Array) continue;
                foreach (var q in me.EnumerateArray())
                {
                    if (q.ValueKind != JsonValueKind.Object) continue;
                    string? qn = q.TryGetProperty("name", out var qv) ? qv.GetString() : null;
                    string? an = null;
                    if (q.TryGetProperty("acceptedAnswer", out var aa) && aa.ValueKind == JsonValueKind.Object &&
                        aa.TryGetProperty("text", out var at) && at.ValueKind == JsonValueKind.String)
                        an = at.GetString();
                    if (!string.IsNullOrWhiteSpace(qn) && !string.IsNullOrWhiteSpace(an))
                        list.Add(new FaqItem(qn!.Trim(), an!.Trim()));
                }
                break;
            }
            catch { /* ignore */ }
        }
        return list;
    }

    /// <summary>Очень простая «безопасная» санитизация HTML: оставляем только
    /// разрешённые теги (p, ul, ol, li, strong, em, br) без атрибутов.</summary>
    private static string SanitizeHtml(string raw)
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        { "p", "ul", "ol", "li", "strong", "em", "b", "i", "br" };
        // Удалить script/style целиком
        raw = Regex.Replace(raw, @"<(script|style)[^>]*>.*?</\1>", "", RegexOptions.Singleline | RegexOptions.IgnoreCase);
        // Заменить теги: разрешённые → без атрибутов, остальные → пустота
        raw = Regex.Replace(raw, @"<(/?)([A-Za-z][A-Za-z0-9]*)[^>]*>", m =>
        {
            var name = m.Groups[2].Value.ToLowerInvariant();
            return allowed.Contains(name) ? $"<{m.Groups[1].Value}{name}>" : "";
        });
        // Сжать пробелы
        raw = Regex.Replace(raw, @"\s+", " ");
        // Двойной HTML-encode: текст вида «&amp;quot;Хохловка&amp;quot;» расшифровываем
        // в «&quot;Хохловка&quot;» → браузер далее покажет как «"Хохловка"».
        raw = raw.Replace("&amp;quot;", "&quot;")
                 .Replace("&amp;amp;", "&amp;")
                 .Replace("&amp;#39;", "&#39;")
                 .Replace("&amp;#x27;", "&#x27;");
        return raw.Trim();
    }

    private static string StripHtml(string html)
    {
        var t = Regex.Replace(html, @"<[^>]+>", " ");
        t = WebUtility.HtmlDecode(t);
        return Regex.Replace(t, @"\s+", " ").Trim();
    }

    private static bool IsGenericObjectName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        var normalized = Regex.Replace(value, @"\s*#\d+\s*$", "");
        normalized = Regex.Replace(normalized, @"\s+", " ").Trim().ToLowerInvariant();
        return normalized is "объект" or "объект размещения";
    }

    /// <summary>Собирает FullDescription как HTML (sanitized) с разделами:
    /// Описание / Удобства и услуги / Как добраться / Поблизости / FAQ / Отзывы.</summary>
    private static string? BuildFullDescription(
        string? descriptionHtml,
        List<AmItem> amItems,
        string? howToGet,
        List<NearbyCat> nearby,
        List<FaqItem> faqs,
        string? reviewsSummary)
    {
        var sb = new System.Text.StringBuilder();

        if (!string.IsNullOrWhiteSpace(descriptionHtml))
        {
            sb.Append(descriptionHtml);
        }

        if (amItems.Count > 0)
        {
            // Удобства уже выводятся отдельным блоком чипов на фронте — в FullDescription
            // не дублируем (раньше это давало <ul> «Удобства и услуги» в общем описании).
        }

        if (!string.IsNullOrWhiteSpace(howToGet))
        {
            sb.Append("<h3>Как добраться</h3>").Append(howToGet);
        }

        if (nearby.Count > 0)
        {
            sb.Append("<h3>Поблизости</h3>");
            foreach (var cat in nearby)
            {
                sb.Append("<p><strong>").Append(WebUtility.HtmlEncode(cat.Title)).Append("</strong></p><ul>");
                foreach (var i in cat.Items)
                {
                    sb.Append("<li>")
                      .Append(WebUtility.HtmlEncode(i.Name))
                      .Append(" — ")
                      .Append(WebUtility.HtmlEncode(i.Distance))
                      .Append("</li>");
                }
                sb.Append("</ul>");
            }
        }

        if (faqs.Count > 0)
        {
            // FAQ выводится отдельным аккордеоном на фронтенде — в FullDescription не дублируем.
        }

        if (!string.IsNullOrWhiteSpace(reviewsSummary))
        {
            // Сводка отзывов не выводится в описание — фронт использует obj.rating / obj.reviewCount.
        }

        var s = sb.ToString();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static List<string> NormalizePhotos(IEnumerable<string> raw)
    {
        // Картинки имеют суффиксы -450x450 / -912x912 / -1920x1080 и т.п.
        // Берём по одной версии каждого фото (приоритет: больше).
        var rx = new Regex(@"-(\d+)x(\d+)\.(jpg|jpeg|png|webp)(\?.*)?$", RegexOptions.IgnoreCase);
        var grouped = new Dictionary<string, (int Size, string Url)>();
        foreach (var u in raw)
        {
            if (string.IsNullOrWhiteSpace(u)) continue;
            var m = rx.Match(u);
            var key = m.Success ? rx.Replace(u, ".$3") : u;
            int size = m.Success && int.TryParse(m.Groups[1].Value, out var s) ? s : 0;
            if (!grouped.TryGetValue(key, out var cur) || size > cur.Size)
                grouped[key] = (size, u);
        }
        return grouped.Values.Select(v => v.Url).Take(20).ToList();
    }

    private async Task<string?> ResolveRegionSlugAsync(string? locality, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(locality)) return null;
        var originalName = locality.Trim();
        var candidates = new List<string> { originalName };
        if (RegionAliases.TryGetValue(originalName, out var canon) &&
            !candidates.Contains(canon, StringComparer.OrdinalIgnoreCase))
        {
            candidates.Add(canon);
        }

        // Exact name match, first by the source text and then by aliases.
        var slug = await _db.Regions
            .Where(r => candidates.Contains(r.Name))
            .Select(r => r.Slug)
            .FirstOrDefaultAsync(ct);
        if (slug != null) return slug;

        // Slug match covers cases where our DB stores a short historical name
        // ("Карелия") while the source or alias says "Республика Карелия".
        var candidateSlugs = candidates
            .Select(SlugService.Generate)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (candidateSlugs.Count > 0)
        {
            slug = await _db.Regions
                .Where(r => candidateSlugs.Contains(r.Slug))
                .Select(r => r.Slug)
                .FirstOrDefaultAsync(ct);
            if (slug != null) return slug;
        }

        // Match shortened variants: "Республика Татарстан" -> "Татарстан",
        // "Ханты-Мансийский автономный округ — Югра" -> "Ханты-Мансийский".
        var nameVariants = candidates
            .SelectMany(GetRegionNameVariants)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        foreach (var variant in nameVariants)
        {
            slug = await _db.Regions
                .Where(r => r.Name == variant || r.Name.StartsWith(variant))
                .Select(r => r.Slug)
                .FirstOrDefaultAsync(ct);
            if (slug != null) return slug;
        }

        return null;
    }

    private static IEnumerable<string> GetRegionNameVariants(string name)
    {
        yield return name;

        var withoutRepublicPrefix = Regex.Replace(
            name,
            @"^(республика|респ\.)\s+",
            "",
            RegexOptions.IgnoreCase).Trim();
        if (!string.Equals(withoutRepublicPrefix, name, StringComparison.OrdinalIgnoreCase))
            yield return withoutRepublicPrefix;

        var withoutSuffix = Regex.Replace(
            name,
            @"\s+(область|край|республика|автономный округ|ао)(?:\s+[—-]\s+.*)?$",
            "",
            RegexOptions.IgnoreCase).Trim();
        if (!string.Equals(withoutSuffix, name, StringComparison.OrdinalIgnoreCase))
            yield return withoutSuffix;
    }

    // ============================================================
    // BATCH RUN
    // ============================================================

    public record CrawlResult(
        int Found,
        int Imported,
        int Duplicates,
        int Skipped,
        int Errors,
        List<object> Samples);

    /// <summary>
    /// Загружает sitemap, парсит карточки и сохраняет их через <see cref="ImportService"/>.
    /// dryRun=true — только парсит, в БД ничего не пишет.
    /// maxPerRegion ограничивает число объектов на регион в рамках одного запуска.
    /// </summary>
    public async Task<CrawlResult> CrawlAsync(
        int offset,
        int limit,
        bool dryRun,
        int? maxPerRegion = null,
        int delayMs = 1500,
        CancellationToken ct = default)
    {
        var urls = await FetchObjectUrlsAsync(ct);
        var maxItems = Math.Clamp(limit, 1, 2000);
        var politeDelay = Math.Clamp(delayMs, 1000, 15000);
        var source = urls.Skip(Math.Max(0, offset));

        var samples = new List<object>();
        int imported = 0, duplicates = 0, skipped = 0, errors = 0;
        var selected = 0;
        var regionCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var url in source)
        {
            if (selected >= maxItems) break;
            ct.ThrowIfCancellationRequested();
            try
            {
                var parsed = await ParseAsync(url, ct);
                if (parsed == null) { skipped++; continue; }

                if (maxPerRegion is > 0)
                {
                    var region = parsed.Request.RegionSlug;
                    regionCounts.TryGetValue(region, out var count);
                    if (count >= maxPerRegion.Value)
                    {
                        skipped++;
                        continue;
                    }
                }

                if (dryRun)
                {
                    selected++;
                    if (maxPerRegion is > 0)
                    {
                        var region = parsed.Request.RegionSlug;
                        regionCounts.TryGetValue(region, out var count);
                        regionCounts[region] = count + 1;
                    }

                    samples.Add(new
                    {
                        url,
                        name = parsed.Request.Name,
                        region = parsed.Request.RegionSlug,
                        photos = parsed.PhotoUrls.Count,
                        amenities = parsed.Request.AmenitySlugs,
                        priceFrom = parsed.Request.PriceFrom,
                    });
                }
                else
                {
                    var res = await _import.ImportAsync(parsed.Request);
                    if (res.Created)
                    {
                        selected++;
                        if (maxPerRegion is > 0)
                        {
                            var region = parsed.Request.RegionSlug;
                            regionCounts.TryGetValue(region, out var count);
                            regionCounts[region] = count + 1;
                        }

                        imported++;
                        samples.Add(new { url, created = true, objectId = res.ObjectId, slug = res.Slug });
                    }
                    else
                    {
                        duplicates++;
                        samples.Add(new { url, duplicate = true, objectId = res.ObjectId, reason = res.DuplicateReason });
                    }
                }
            }
            catch (Exception ex)
            {
                errors++;
                _log.LogWarning(ex, "Crawl error for {Url}", url);
                samples.Add(new { url, error = ex.Message });
            }

            // Polite delay between requests
            await Task.Delay(TimeSpan.FromMilliseconds(politeDelay), ct);
        }

        return new CrawlResult(urls.Count, imported, duplicates, skipped, errors, samples);
    }
}
