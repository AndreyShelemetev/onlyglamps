using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Data;

public static class DataSeeder
{
    // Idempotent: добавляет недостающие регионы РФ + главный город каждого.
    // Вызывается при каждом старте, после SeedAsync.
    public static async Task SeedRegionsExpandAsync(AppDbContext db)
    {
        var existing = (await db.Regions.Select(r => r.Slug).ToListAsync()).ToHashSet();

        // (название, slug, главный город, slug города)
        var regions = new (string Name, string Slug, string CityName, string CitySlug)[]
        {
            ("Московская область",                  "moskovskaya-oblast",               "Москва",               "moskva"),
            ("Ленинградская область",               "leningradskaya-oblast",            "Санкт-Петербург",      "sankt-peterburg"),
            ("Краснодарский край",                  "krasnodarskiy-kray",               "Краснодар",            "krasnodar"),
            ("Республика Крым",                     "respublika-krym",                  "Симферополь",          "simferopol"),
            ("Ставропольский край",                 "stavropolskiy-kray",               "Ставрополь",           "stavropol"),
            ("Республика Башкортостан",             "respublika-bashkortostan",         "Уфа",                  "ufa"),
            ("Свердловская область",                "sverdlovskaya-oblast",             "Екатеринбург",         "ekaterinburg"),
            ("Пермский край",                       "permskiy-kray",                    "Пермь",                "perm"),
            ("Тюменская область",                   "tyumenskaya-oblast",               "Тюмень",               "tyumen"),
            ("Челябинская область",                 "chelyabinskaya-oblast",            "Челябинск",            "chelyabinsk"),
            ("Ярославская область",                 "yaroslavskaya-oblast",             "Ярославль",            "yaroslavl"),
            ("Тверская область",                    "tverskaya-oblast",                 "Тверь",                "tver"),
            ("Вологодская область",                 "vologodskaya-oblast",              "Вологда",              "vologda"),
            ("Псковская область",                   "pskovskaya-oblast",                "Псков",                "pskov"),
            ("Мурманская область",                  "murmanskaya-oblast",               "Мурманск",             "murmansk"),
            ("Архангельская область",               "arkhangelskaya-oblast",            "Архангельск",          "arkhangelsk"),
            ("Новгородская область",                "novgorodskaya-oblast",             "Великий Новгород",     "velikiy-novgorod"),
            ("Калужская область",                   "kaluzhskaya-oblast",               "Калуга",               "kaluga"),
            ("Тульская область",                    "tulskaya-oblast",                  "Тула",                 "tula"),
            ("Рязанская область",                   "ryazanskaya-oblast",               "Рязань",               "ryazan"),
            ("Владимирская область",                "vladimirskaya-oblast",             "Владимир",             "vladimir"),
            ("Костромская область",                 "kostromskaya-oblast",              "Кострома",             "kostroma"),
            ("Смоленская область",                  "smolenskaya-oblast",               "Смоленск",             "smolensk"),
            ("Воронежская область",                 "voronezhskaya-oblast",             "Воронеж",              "voronezh"),
            ("Белгородская область",                "belgorodskaya-oblast",             "Белгород",             "belgorod"),
            ("Курская область",                     "kurskaya-oblast",                  "Курск",                "kursk"),
            ("Орловская область",                   "orlovskaya-oblast",                "Орёл",                 "oryol"),
            ("Липецкая область",                    "lipetskaya-oblast",                "Липецк",               "lipetsk"),
            ("Тамбовская область",                  "tambovskaya-oblast",               "Тамбов",               "tambov"),
            ("Саратовская область",                 "saratovskaya-oblast",              "Саратов",              "saratov"),
            ("Самарская область",                   "samarskaya-oblast",                "Самара",               "samara"),
            ("Ульяновская область",                 "ulyanovskaya-oblast",              "Ульяновск",            "ulyanovsk"),
            ("Оренбургская область",                "orenburgskaya-oblast",             "Оренбург",             "orenburg"),
            ("Волгоградская область",               "volgogradskaya-oblast",            "Волгоград",            "volgograd"),
            ("Ростовская область",                  "rostovskaya-oblast",               "Ростов-на-Дону",       "rostov-na-donu"),
            ("Астраханская область",                "astrakhanskaya-oblast",            "Астрахань",            "astrakhan"),
            ("Кабардино-Балкарская Республика",     "kabardino-balkarskaya-respublika", "Нальчик",              "nalchik"),
            ("Карачаево-Черкесская Республика",     "karachayevo-cherkesskaya-respublika","Черкесск",           "cherkessk"),
            ("Республика Северная Осетия — Алания", "respublika-severnaya-osetiya",     "Владикавказ",          "vladikavkaz"),
            ("Калининградская область",             "kaliningradskaya-oblast",          "Калининград",          "kaliningrad"),
            ("Иркутская область",                   "irkutskaya-oblast",                "Иркутск",              "irkutsk"),
            ("Красноярский край",                   "krasnoyarskiy-kray",               "Красноярск",           "krasnoyarsk"),
            ("Хабаровский край",                    "khabarovskiy-kray",                "Хабаровск",            "khabarovsk"),
            ("Приморский край",                     "primorskiy-kray",                  "Владивосток",          "vladivostok"),
            ("Республика Бурятия",                  "respublika-buryatiya",             "Улан-Удэ",             "ulan-ude"),
            ("Кемеровская область",                 "kemerovskaya-oblast",              "Кемерово",             "kemerovo"),
            ("Томская область",                     "tomskaya-oblast",                  "Томск",                "tomsk"),
            ("Курганская область",                  "kurganskaya-oblast",               "Курган",               "kurgan"),
            ("Ханты-Мансийский АО — Югра",          "khanty-mansiyskiy-ao",             "Ханты-Мансийск",       "khanty-mansiysk"),
            ("Республика Хакасия",                  "respublika-khakasiya",             "Абакан",               "abakan"),
            ("Республика Тыва",                     "respublika-tyva",                  "Кызыл",                "kyzyl"),
            ("Республика Калмыкия",                 "respublika-kalmykiya",             "Элиста",               "elista"),
            ("Республика Алтай",                    "respublika-altay",                 "Горно-Алтайск",        "gorno-altaysk"),
            ("Кировская область",                   "kirovskaya-oblast",                "Киров",                "kirov"),
            ("Забайкальский край",                  "zabaykalskiy-kray",                "Чита",                 "chita"),
            ("Амурская область",                    "amurskaya-oblast",                 "Благовещенск",         "blagoveshchensk"),
            ("Сахалинская область",                 "sakhalinskaya-oblast",             "Южно-Сахалинск",       "yuzhno-sakhalinsk"),
        };

        foreach (var (name, slug, cityName, citySlug) in regions)
        {
            if (existing.Contains(slug)) continue;
            var region = new Region { Name = name, Slug = slug };
            db.Regions.Add(region);
            await db.SaveChangesAsync();
            db.CitiesAndDistricts.Add(new CityOrDistrict
            {
                RegionId = region.Id,
                Name = cityName,
                Slug = citySlug,
                IsCity = true,
            });
            await db.SaveChangesAsync();
        }
    }

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Regions.AnyAsync())
            return;

        // --- Regions ---
        var mariEl = new Region { Name = "Марий Эл", Slug = "mari-el" };
        var tatarstan = new Region { Name = "Татарстан", Slug = "tatarstan" };
        var nizhny = new Region { Name = "Нижегородская область", Slug = "nizhegorodskaya-oblast" };
        var mordovia = new Region { Name = "Республика Мордовия", Slug = "respublika-mordoviya" };
        var chuvashia = new Region { Name = "Чувашская республика", Slug = "chuvashskaya-respublika" };
        var altay = new Region { Name = "Алтайский край", Slug = "altayskiy-kray" };
        var dagestan = new Region { Name = "Дагестан", Slug = "dagestan" };
        var karelia = new Region { Name = "Карелия", Slug = "kareliya" };
        db.Regions.AddRange(mariEl, tatarstan, nizhny, mordovia, chuvashia, altay, dagestan, karelia);
        await db.SaveChangesAsync();

        // --- Cities/Districts ---
        var yoshkarOla = new CityOrDistrict { RegionId = mariEl.Id, Name = "Йошкар-Ола", Slug = "yoshkar-ola", IsCity = true };
        var zvenigovskiy = new CityOrDistrict { RegionId = mariEl.Id, Name = "Звениговский район", Slug = "zvenigovskii-rayon", IsCity = false };
        var kazan = new CityOrDistrict { RegionId = tatarstan.Id, Name = "Казань", Slug = "kazan", IsCity = true };
        var nizhnyNovgorod = new CityOrDistrict { RegionId = nizhny.Id, Name = "Нижний Новгород", Slug = "nizhniy-novgorod", IsCity = true };
        var semyonov = new CityOrDistrict { RegionId = nizhny.Id, Name = "Семёнов", Slug = "semyonov", IsCity = true };
        var cheboksary = new CityOrDistrict { RegionId = chuvashia.Id, Name = "Чебоксары", Slug = "cheboksary", IsCity = true };
        var sortavalla = new CityOrDistrict { RegionId = karelia.Id, Name = "Сортовалла", Slug = "sortovalla", IsCity = true };
        var belokurikha = new CityOrDistrict { RegionId = altay.Id, Name = "Белокуриха", Slug = "belokurikha", IsCity = true };
        var derbent = new CityOrDistrict { RegionId = dagestan.Id, Name = "Дербент", Slug = "derbent", IsCity = true };
        db.CitiesAndDistricts.AddRange(yoshkarOla, zvenigovskiy, kazan, nizhnyNovgorod, semyonov, cheboksary, sortavalla, belokurikha, derbent);
        await db.SaveChangesAsync();

        // --- Object Types ---
        var glamping = new ObjectType { Name = "Глэмпинг", Slug = "glempingi" };
        var guestHouse = new ObjectType { Name = "Гостевой дом", Slug = "gostevye-doma" };
        var bathhouse = new ObjectType { Name = "Баня", Slug = "bani" };
        var cottage = new ObjectType { Name = "Коттедж", Slug = "kottedzhi" };
        var baseOtdykha = new ObjectType { Name = "База отдыха", Slug = "bazy-otdykha" };
        var parkHotel = new ObjectType { Name = "Парк-отель", Slug = "park-oteli" };
        db.ObjectTypes.AddRange(glamping, guestHouse, bathhouse, cottage, baseOtdykha, parkHotel);
        await db.SaveChangesAsync();

        // --- Amenities ---
        var wifi = new Amenity { Name = "Wi-Fi", Slug = "wifi", Icon = "wifi" };
        var sauna = new Amenity { Name = "Баня / сауна", Slug = "banya", Icon = "sauna" };
        var tub = new Amenity { Name = "Чан / купель", Slug = "chan", Icon = "hot-tub" };
        var grill = new Amenity { Name = "Мангал", Slug = "mangal", Icon = "grill" };
        var parking = new Amenity { Name = "Парковка", Slug = "parkovka", Icon = "parking" };
        var gazebo = new Amenity { Name = "Беседка", Slug = "besedka", Icon = "gazebo" };
        var water = new Amenity { Name = "У воды", Slug = "u-vody", Icon = "water" };
        var forest = new Amenity { Name = "У леса", Slug = "u-lesa", Icon = "forest" };
        var pets = new Amenity { Name = "Можно с питомцами", Slug = "s-pitomtsami", Icon = "pets" };
        var children = new Amenity { Name = "Можно с детьми", Slug = "s-detmi", Icon = "children" };
        var kitchen = new Amenity { Name = "Кухня", Slug = "kuhnya", Icon = "kitchen" };
        var wholePlace = new Amenity { Name = "Весь объект целиком", Slug = "ves-obekt", Icon = "house" };
        db.Amenities.AddRange(wifi, sauna, tub, grill, parking, gazebo, water, forest, pets, children, kitchen, wholePlace);
        await db.SaveChangesAsync();

        // --- Admin user ---
        var admin = new User
        {
            TelegramId = 100000001,
            Username = "admin",
            FirstName = "Админ",
            Email = "admin@onlyglamps.ru",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Glamps2026Admin!"),
            Role = UserRole.Admin,
            AuthDate = DateTime.UtcNow
        };
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        // --- Owner user ---
        var owner = new User
        {
            TelegramId = 100000002,
            Username = "testowner",
            FirstName = "Тестовый",
            LastName = "Владелец",
            Email = "owner@onlyglamps.ru",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("owner123"),
            Role = UserRole.Owner,
            AuthDate = DateTime.UtcNow
        };
        db.Users.Add(owner);
        await db.SaveChangesAsync();

        var ownerProfile = new OwnerProfile
        {
            UserId = owner.Id,
            ContactName = "Тестовый Владелец",
            ContactPhone = "+79001234567",
            ContactTelegram = "@testowner"
        };
        db.OwnerProfiles.Add(ownerProfile);
        await db.SaveChangesAsync();

        // === Object 1: Елки на Волге (глэмпинг) ===
        var obj1 = new GlampingObject
        {
            OwnerId = owner.Id,
            ObjectTypeId = glamping.Id,
            RegionId = mariEl.Id,
            CityOrDistrictId = zvenigovskiy.Id,
            Name = "Елки на Волге",
            Slug = "elki-na-volge",
            ShortDescription = "Уютный глэмпинг на берегу Волги с панорамным видом",
            FullDescription = "Комфортабельный глэмпинг-комплекс на берегу Волги в Звениговском районе Марий Эл. Идеальное место для отдыха на природе с семьёй или компанией друзей. К вашим услугам: тёплые домики, баня, мангальная зона, выход к воде.",
            Area = 120,
            Capacity = 8,
            Beds = 4,
            Address = "Республика Марий Эл, Звениговский район, д. Кокшайск",
            Latitude = 56.3127,
            Longitude = 48.2543,
            CheckInTime = "14:00",
            CheckOutTime = "12:00",
            ChildrenAllowed = true,
            PetsAllowed = false,
            SmokingAllowed = false,
            EventsAllowed = true,
            Deposit = "5000 ₽",
            Rules = "Тишина после 23:00. Не курить внутри домиков.",
            Status = ObjectStatus.Published
        };
        db.GlampingObjects.Add(obj1);
        await db.SaveChangesAsync();

        db.ObjectAmenities.AddRange(
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = wifi.Id },
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = sauna.Id },
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = grill.Id },
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = parking.Id },
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = water.Id },
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = forest.Id },
            new ObjectAmenity { ObjectId = obj1.Id, AmenityId = wholePlace.Id }
        );

        db.Tariffs.AddRange(
            new Tariff { ObjectId = obj1.Id, Name = "Дом целиком", Price = 15000, Description = "Аренда всего дома на сутки" },
            new Tariff { ObjectId = obj1.Id, Name = "Дом + баня", Price = 20000, Description = "Аренда дома и бани на сутки" }
        );

        db.SourceLinks.Add(new SourceLink
        {
            ObjectId = obj1.Id,
            SourceName = "Официальный сайт",
            SourceUrl = "https://example.com/elki-na-volge",
            SourceType = "website"
        });

        db.ObjectPhotos.AddRange(
            new ObjectPhoto { ObjectId = obj1.Id, Url = "/images/seed/glamping-1.jpg", Alt = "Глэмпинг Елки на Волге — вид снаружи", SortOrder = 1 },
            new ObjectPhoto { ObjectId = obj1.Id, Url = "/images/seed/glamping-2.jpg", Alt = "Интерьер домика глэмпинга Елки на Волге", SortOrder = 2 }
        );

        // === Object 2: Уютный берег (гостевой дом) ===
        var obj2 = new GlampingObject
        {
            OwnerId = owner.Id,
            ObjectTypeId = guestHouse.Id,
            RegionId = mariEl.Id,
            CityOrDistrictId = yoshkarOla.Id,
            Name = "Уютный берег",
            Slug = "uyutnyy-bereg",
            ShortDescription = "Гостевой дом с кухней в центре Йошкар-Олы",
            FullDescription = "Уютный гостевой дом рядом с набережной Йошкар-Олы. Полностью оборудованная кухня, бесплатная парковка, отличное расположение для семейного отдыха. Рядом — все достопримечательности города.",
            Area = 80,
            Capacity = 6,
            Beds = 3,
            Address = "Республика Марий Эл, г. Йошкар-Ола, ул. Набережная, 15",
            Latitude = 56.6345,
            Longitude = 47.8998,
            CheckInTime = "15:00",
            CheckOutTime = "11:00",
            ChildrenAllowed = true,
            PetsAllowed = true,
            SmokingAllowed = false,
            EventsAllowed = false,
            Status = ObjectStatus.Published
        };
        db.GlampingObjects.Add(obj2);
        await db.SaveChangesAsync();

        db.ObjectAmenities.AddRange(
            new ObjectAmenity { ObjectId = obj2.Id, AmenityId = wifi.Id },
            new ObjectAmenity { ObjectId = obj2.Id, AmenityId = parking.Id },
            new ObjectAmenity { ObjectId = obj2.Id, AmenityId = kitchen.Id },
            new ObjectAmenity { ObjectId = obj2.Id, AmenityId = children.Id },
            new ObjectAmenity { ObjectId = obj2.Id, AmenityId = pets.Id },
            new ObjectAmenity { ObjectId = obj2.Id, AmenityId = wholePlace.Id }
        );

        db.Tariffs.Add(new Tariff { ObjectId = obj2.Id, Name = "Сутки", Price = 8000, Description = "Аренда всего дома на сутки" });

        db.SourceLinks.Add(new SourceLink
        {
            ObjectId = obj2.Id,
            SourceName = "Авито",
            SourceUrl = "https://example.com/avito-uyutnyy-bereg",
            SourceType = "avito"
        });

        db.ObjectPhotos.AddRange(
            new ObjectPhoto { ObjectId = obj2.Id, Url = "/images/seed/guesthouse-1.jpg", Alt = "Гостевой дом Уютный берег — фасад", SortOrder = 1 },
            new ObjectPhoto { ObjectId = obj2.Id, Url = "/images/seed/guesthouse-2.jpg", Alt = "Кухня гостевого дома Уютный берег", SortOrder = 2 }
        );

        // === Object 3: Парная у озера (баня) ===
        var obj3 = new GlampingObject
        {
            OwnerId = owner.Id,
            ObjectTypeId = bathhouse.Id,
            RegionId = mariEl.Id,
            CityOrDistrictId = yoshkarOla.Id,
            Name = "Парная у озера",
            Slug = "parnaya-u-ozera",
            ShortDescription = "Русская баня с чаном и купелью у лесного озера",
            FullDescription = "Настоящая русская баня на берегу лесного озера. Берёзовые веники, чан под открытым небом, купель, мангальная зона и беседка. Идеально для компании до 10 человек.",
            Area = 60,
            Capacity = 10,
            Beds = 0,
            Address = "Республика Марий Эл, г. Йошкар-Ола, п. Сосновый Бор",
            Latitude = 56.6150,
            Longitude = 47.8700,
            CheckInTime = "10:00",
            CheckOutTime = "22:00",
            ChildrenAllowed = true,
            PetsAllowed = false,
            SmokingAllowed = true,
            EventsAllowed = true,
            Rules = "Бережное отношение к имуществу. Мусор забирать с собой.",
            Status = ObjectStatus.Published
        };
        db.GlampingObjects.Add(obj3);
        await db.SaveChangesAsync();

        db.ObjectAmenities.AddRange(
            new ObjectAmenity { ObjectId = obj3.Id, AmenityId = sauna.Id },
            new ObjectAmenity { ObjectId = obj3.Id, AmenityId = tub.Id },
            new ObjectAmenity { ObjectId = obj3.Id, AmenityId = grill.Id },
            new ObjectAmenity { ObjectId = obj3.Id, AmenityId = gazebo.Id },
            new ObjectAmenity { ObjectId = obj3.Id, AmenityId = water.Id },
            new ObjectAmenity { ObjectId = obj3.Id, AmenityId = parking.Id }
        );

        db.Tariffs.AddRange(
            new Tariff { ObjectId = obj3.Id, Name = "2 часа", Price = 5000, Description = "Аренда бани на 2 часа" },
            new Tariff { ObjectId = obj3.Id, Name = "4 часа", Price = 8000, Description = "Аренда бани на 4 часа" },
            new Tariff { ObjectId = obj3.Id, Name = "Целый день", Price = 15000, Description = "Аренда бани на весь день (10:00–22:00)" }
        );

        db.ObjectPhotos.AddRange(
            new ObjectPhoto { ObjectId = obj3.Id, Url = "/images/seed/bathhouse-1.jpg", Alt = "Баня Парная у озера — вид снаружи", SortOrder = 1 },
            new ObjectPhoto { ObjectId = obj3.Id, Url = "/images/seed/bathhouse-2.jpg", Alt = "Чан и купель бани Парная у озера", SortOrder = 2 }
        );

        // === Object 4: Парк-отель «Вудлэнд Кэмп» ===
        var obj4 = new GlampingObject
        {
            OwnerId = owner.Id,
            ObjectTypeId = parkHotel.Id,
            RegionId = mariEl.Id,
            CityOrDistrictId = yoshkarOla.Id,
            Name = "Парк-отель «Вудлэнд Кэмп»",
            Slug = "park-otel-vudlend-kemp",
            ShortDescription = "Парк-отель «Вудлэнд» расположен на живописном берегу озера Шап, в самом сердце Республики Марий Эл — региона, который находится всего в часе лета от Москвы.\nЭто место, где можно по-настоящему отключиться от городской суеты, почувствовать ритм природы и позволить себе отдых, о котором давно мечталось",
            FullDescription = "Парк-отель «Вудлэнд» расположен на живописном берегу озера Шап, в самом сердце Республики Марий Эл — региона, который находится всего в часе лета от Москвы.\nЭто место, где можно по-настоящему отключиться от городской суеты, почувствовать ритм природы и позволить себе отдых, о котором давно мечталось.\n\nКак добраться\n\nНА АВТОМОБИЛЕ:\nИз Йошкар-Олы - 25 км - 30 минут\nИз Чебоксар - 75 км - 1 час\nИз Казани - 150 км - 2 часа 30 минут\nК озеру ведёт трасса Йошкар-Ола-Чебоксары (автотрасса «Вятка»). В навигаторе — парк-отель «Вудлэнд». Координаты 56.461421 | 47.873517.",
            Area = 0,
            Capacity = 4,
            Beds = 2,
            Address = "Марий Эл, г. Йошкар-Ола, пос. Шап, озеро Шап, ул. Санаторная, д. 5",
            Latitude = 56.46085,
            Longitude = 47.871847,
            CheckInTime = "14:00",
            CheckOutTime = "12:00",
            ChildrenAllowed = true,
            PetsAllowed = true,
            SmokingAllowed = false,
            EventsAllowed = true,
            Deposit = "",
            Rules = "Отдельно стоящий стильный дом с собственной террасой. Расположен на первой линии у озера Шап.",
            Status = ObjectStatus.Published
        };
        db.GlampingObjects.Add(obj4);
        await db.SaveChangesAsync();

        db.ObjectAmenities.AddRange(
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = wifi.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = sauna.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = grill.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = water.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = forest.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = pets.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = children.Id },
            new ObjectAmenity { ObjectId = obj4.Id, AmenityId = kitchen.Id }
        );

        db.Tariffs.AddRange(
            new Tariff { ObjectId = obj4.Id, Name = "Дом с видом на озеро", Price = 19600, Description = "Отдельно стоящий стильный дом вместимостью до 4 человек. Панорамные окна выходят прямо на озеро." },
            new Tariff { ObjectId = obj4.Id, Name = "Дом с общей террасой", Price = 16500, Description = "Дом, соединенный общей террасой с соседним домом. На первой линии у озера Шап." },
            new Tariff { ObjectId = obj4.Id, Name = "Геокупол", Price = 12500, Description = "Уникальные эмоции от проживания в геокуполе!" },
            new Tariff { ObjectId = obj4.Id, Name = "Дом с видом на лес", Price = 14500, Description = "Отдельно стоящий стильный дом вместимостью до 4 человек с собственной террасой." }
        );

        db.SourceLinks.Add(new SourceLink
        {
            ObjectId = obj4.Id,
            SourceName = "Официальный сайт",
            SourceUrl = "https://vudlandcamp.ru/",
            SourceType = "website"
        });

        db.ObjectPhotos.AddRange(
            new ObjectPhoto { ObjectId = obj4.Id, Url = "https://vudlandcamp.ru/upload/resize_cache/iblock/757/1346_640_2619711fa078991f0a23d032687646b21/qxuzdgngafgeh3mu6nqj8d96zuqlx6yd.webp", Alt = "Вудленд — вид зимой на домики", SortOrder = 1 },
            new ObjectPhoto { ObjectId = obj4.Id, Url = "https://vudlandcamp.ru/upload/resize_cache/iblock/312/1152_592_1619711fa078991f0a23d032687646b21/hz1cbmxex29kuzm9djujnyi6jpvd9kpj.webp", Alt = "Шатёр-купол в парк-отеле Вудленд", SortOrder = 2 },
            new ObjectPhoto { ObjectId = obj4.Id, Url = "https://vudlandcamp.ru/upload/resize_cache/iblock/0bd/1346_640_2619711fa078991f0a23d032687646b21/a5uiyqrg4288l3cnmju0nuheh0ladl6b.webp", Alt = "Вид из номера на озеро", SortOrder = 3 }
        );

        // --- Popular queries ---
        var popularQueries = new[]
        {
            ("с баней", "sauna=1"),
            ("с чаном", "chan=1"),
            ("у воды", "u-vody=1"),
            ("у леса", "u-lesa=1"),
            ("с мангалом", "mangal=1"),
            ("с беседкой", "besedka=1"),
            ("можно с питомцами", "s-pitomtsami=1"),
            ("можно с детьми", "s-detmi=1"),
            ("с парковкой", "parkovka=1"),
            ("с Wi-Fi", "wifi=1"),
            ("весь дом целиком", "ves-obekt=1"),
            ("с кухней", "kuhnya=1"),
            ("недорого", "sort=price_asc"),
            ("для компании", "guests=6"),
            ("для семьи", "guests=4&s-detmi=1")
        };

        for (var i = 0; i < popularQueries.Length; i++)
        {
            db.PopularQueries.Add(new PopularQuery
            {
                Text = popularQueries[i].Item1,
                FilterParam = popularQueries[i].Item2,
                SortOrder = i + 1,
                IsActive = true
            });
        }

        // --- Availability (next 30 days) ---
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var random = new Random(42);
        foreach (var objId in new[] { obj1.Id, obj2.Id, obj3.Id })
        {
            for (var d = 0; d < 30; d++)
            {
                var status = random.Next(10) < 7 ? AvailabilityStatus.Available
                    : random.Next(2) == 0 ? AvailabilityStatus.Booked : AvailabilityStatus.OnRequest;
                db.AvailabilityCalendars.Add(new AvailabilityCalendar
                {
                    ObjectId = objId,
                    Date = today.AddDays(d),
                    Status = status
                });
            }
        }

        // --- Reviews ---
        var guest = new User
        {
            TelegramId = 100000003,
            Username = "testguest",
            FirstName = "Гость",
            Email = "user@onlyglamps.ru",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
            Role = UserRole.User,
            AuthDate = DateTime.UtcNow
        };
        db.Users.Add(guest);
        await db.SaveChangesAsync();

        db.Reviews.AddRange(
            new Review { ObjectId = obj1.Id, UserId = guest.Id, Rating = 5, Text = "Отличное место! Красивый вид на Волгу, чистые домики, приветливые хозяева.", Status = ReviewStatus.Published },
            new Review { ObjectId = obj2.Id, UserId = guest.Id, Rating = 4, Text = "Хороший дом, удобное расположение. Кухня полностью оборудована.", Status = ReviewStatus.Published }
        );

        // --- Tags ---
        var tags = new[]
        {
            ("Дом с баней", "dom-s-baney"),
            ("Дом с чаном", "dom-s-chanom"),
            ("Дом у воды", "dom-u-vody"),
            ("Дом у леса", "dom-u-lesa"),
            ("Для семьи", "dlya-semi"),
            ("Для компании", "dlya-kompanii"),
            ("Для двоих", "dlya-dvoikh"),
            ("С мангалом", "s-mangalom"),
            ("С беседкой", "s-besedkoy"),
            ("Можно с питомцами", "mozhno-s-pitomtsami")
        };
        foreach (var (name, slug) in tags)
            db.Tags.Add(new Tag { Name = name, Slug = slug });

        await db.SaveChangesAsync();

        // --- Author user ---
        var author = new User
        {
            TelegramId = 100000004,
            Username = "author",
            FirstName = "Автор",
            LastName = "Статей",
            Email = "author@onlyglamps.ru",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("author123"),
            Role = UserRole.Author,
            AuthDate = DateTime.UtcNow,
            Bio = "Пишу об отдыхе на природе: глэмпингах, гостевых домах, банях и базах отдыха. Отдыхай на природе с комфортом!",
            AvatarUrl = "/images/author-avatar.jpg",
            VkUrl = "https://vk.com/onlyglamps",
            TelegramUrl = "https://t.me/onlyglamps"
        };
        db.Users.Add(author);
        await db.SaveChangesAsync();

        // --- Default article ---
        var articleContent = @"<p>Йошкар-Ола – единственный город России, название которого начинается с буквы «Й». Оно дано на марийском языке, национальном языке республики Марий Эл, столицей которой является город. В переводе «йошкар» означает «красный», а «ола» – «город».</p>

<p>Город небольшой: здесь живёт около 285 тысяч человек по данным на 2025 год. Несмотря на компактность, Йошкар-Ола предлагает множество достопримечательностей.</p>

<p>За последние пятнадцать лет Йошкар-Ола стала популярным туристическим направлением. В этот период центр города обзавёлся новыми архитектурными ансамблями, в облике которых угадываются черты различных европейских городов. Так появились набережные Брюгге и Амстердам, Национальная художественная галерея, напоминающая Дворец дожей, театр кукол, построенный в стиле немецкого неоромантизма, и Вознесенская башня, повторяющая очертания одной из московских кремлёвских башен.</p>

<h2>Йошкин Кот (и его «родственники»)</h2>

<p>Просторечное выражение «ёшкин кот» в городе превратилось в небольшой символ. Скульптура кота, сидящего на скамейке возле главного корпуса местного университета, стала одним из самых узнаваемых образов столицы Марий Эл. Туристы часто дотрагиваются до его лапы, а загадывающие желания шепчут их на ухо коту. У него есть и «родственники»: Йошкина кошка и семь котят, расположенные в разных местах центра.</p>

<h2>Площадь имени Оболенского-Ноготкова</h2>

<p>В минуте ходьбы от Йошкиного Кота расположена одна из самых насыщенных достопримечательностями площадей Йошкар-Олы. Здания в стиле, отсылающем к венецианской архитектуре, создают цельный ансамбль. Сюда стоит прийти к началу нового часа, чтобы увидеть короткое представление: механическая фигура ослика проходит по большим часам на фасаде центрального здания.</p>

<p>Если позволяет время, загляните в Национальную художественную галерею. Помимо временных выставок, здесь представлена постоянная экспозиция, посвящённая марийской культуре.</p>

<h2>Площадь Республики и Пресвятой Девы Марии</h2>

<p>Эти две площади образуют единое пространство, обрамлённое архитектурными и культурными объектами. Одно из главных зданий – Благовещенская башня. Она выполняет функции смотровой площадки, музея современного искусства и часов с курантами.</p>

<p>Рядом расположен фонтан-памятник Архангелу Гавриилу и скульптура Девы Марии с младенцем Христом. К площади примыкает Итальянский парк с красными клёнами.</p>

<h2>Патриаршая площадь</h2>

<p>Спустившись к реке, продолжите прогулку по набережной. Летом здесь работают прокаты лодок и катамаранов. Перейдя Воскресенский мост, вы окажетесь на Патриаршей площади.</p>

<p>Главное развлечение здесь – динамическая композиция «12 апостолов». Фигуры появляются на балконе здания каждые три часа – в 9:00, 12:00, 15:00, 18:00 и 21:00.</p>

<h2>Набережная Брюгге</h2>

<p>Продолжая путь вдоль реки, можно увидеть ряд зданий, стилизованных под европейскую средневековую архитектуру. На маршруте вам встретятся памятник императрице Елизавете Петровне, барельефные изображения апостолов и композиция, посвящённая Грейс Келли и князю Монако Ренье III.</p>

<p>За Театральным мостом расположены новые городские арт-объекты: надпись «Красота внутри», скульптура «Буква Й» и миниатюрная уточка Серая Шейка.</p>

<h2>Набережная Амстердам</h2>

<p>Перейдя Гоголевский мост, вы окажетесь на набережной Амстердам. Первым объектом на вашем пути станет памятник Н.В. Гоголю. На крыше соседнего здания размещена композиция с Гамельнским Крысоловом.</p>

<p>Следующая зона, посвящённая Нидерландам, – памятник Рембрандту Харменсу ван Рейну. Чуть дальше находится скульптурная пара А.С. Пушкина и Евгения Онегина.</p>

<h2>Бульвар Чавайна и бульвар Победы</h2>

<p>Завершите маршрут прогулкой по центральным бульварам. Через 10–20 минут вы выйдете к Центральному парку культуры и отдыха. Летом работает Городок аттракционов, а отдельно расположено колесо обозрения – пожалуй, лучшая смотровая площадка города.</p>

<p>Длинный вариант маршрута (от ТЦ «Эссен») составляет около 4,2 км (примерно час), короткий (от Вознесенской башни) – 2,75 км (около 36 минут).</p>

<h2>Стоит ли ехать в Йошкар-Олу?</h2>

<p>В статье описана лишь часть достопримечательностей столицы Марий Эл. Чтобы спокойно осмотреть основные места, понадобится полный день, а для того чтобы узнать город глубже, лучше остаться ещё на сутки.</p>

<p>Для выбора места проживания можно воспользоваться нашим сервисом. Переходите по ссылке <a href=""/mari-el/yoshkar-ola/"">глэмпинги и гостевые дома в Йошкар-Оле</a>, марийский колорит и современный ритм Йошкар-Олы позволяют провести несколько дней интересно и разнообразно.</p>";

        var defaultArticle = new Article
        {
            Title = "Йошкар-Ола: Европа в центре России — достопримечательности и маршрут",
            H1 = "Йошкар-Ола: Европа в центре России",
            Description = "Путеводитель по Йошкар-Оле: набережные Брюгге и Амстердам, Патриаршая площадь, Йошкин Кот и другие достопримечательности. Маршрут прогулки по центру города.",
            Slug = "yoshkar-ola-evropa-v-tsentre-rossii",
            CoverImageUrl = "/images/blog/yoshkar-ola-cover.jpg",
            Content = articleContent,
            Views = 247,
            ReadTimeMinutes = 9,
            Status = ArticleStatus.Published,
            AuthorId = author.Id,
            CreatedAt = new DateTime(2025, 11, 21, 12, 0, 0, DateTimeKind.Utc)
        };
        db.Articles.Add(defaultArticle);
        await db.SaveChangesAsync();
    }
}
