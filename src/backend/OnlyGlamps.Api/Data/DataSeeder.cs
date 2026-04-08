using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Data;

public static class DataSeeder
{
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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Adm!n@Gl4mps#2026xQ"),
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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Own3r@Gl4mps#2026zR"),
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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Us3r@Gl4mps#2026wK"),
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
    }
}
