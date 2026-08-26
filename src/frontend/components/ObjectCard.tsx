import { ObjectListItem } from "@/lib/api";
import { SafeImage } from "./SafeImage";

// Map of amenity name (lowercase, RU) → emoji icon.
// Keep in sync with seeded amenities; falls back to a neutral dot.
const AMENITY_ICONS: { match: RegExp; icon: string; short: string }[] = [
  { match: /горячий\s*чан|джакузи/i, icon: "♨️", short: "Чан" },
  { match: /бан[яи]/i, icon: "🧖", short: "Баня" },
  { match: /сауна/i, icon: "🧖", short: "Сауна" },
  { match: /мангал|барбекю|bbq/i, icon: "🔥", short: "Мангал" },
  { match: /бассейн/i, icon: "🏊", short: "Бассейн" },
  { match: /у\s*вод|у\s*реки|у\s*озера|водоем/i, icon: "💧", short: "У воды" },
  { match: /лес/i, icon: "🌲", short: "В лесу" },
  { match: /питом|собак/i, icon: "🐾", short: "Питомцы" },
  { match: /wi-?fi|вай-?фай/i, icon: "📶", short: "Wi-Fi" },
  { match: /парков/i, icon: "🅿️", short: "Парковка" },
  { match: /кострищ|костров/i, icon: "🪵", short: "Костёр" },
  { match: /рыбалк/i, icon: "🎣", short: "Рыбалка" },
  { match: /детск/i, icon: "🧸", short: "Для детей" },
  { match: /кухн|плита|холодильник/i, icon: "🍳", short: "Кухня" },
];

function pickAmenityIcons(amenities: string[], limit = 6) {
  const seen = new Set<string>();
  const result: { icon: string; label: string }[] = [];
  for (const name of amenities) {
    for (const rule of AMENITY_ICONS) {
      if (rule.match.test(name) && !seen.has(rule.short)) {
        seen.add(rule.short);
        result.push({ icon: rule.icon, label: rule.short });
        break;
      }
    }
    if (result.length >= limit) break;
  }
  return result;
}

export function ObjectCard({
  obj,
  basePath,
  showSourceButton = true,
  imageLoading = "lazy",
  imageFetchPriority = "auto",
}: {
  obj: ObjectListItem;
  basePath?: string;
  showSourceButton?: boolean;
  imageLoading?: "eager" | "lazy";
  imageFetchPriority?: "high" | "low" | "auto";
}) {
  const cardUrl = `/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`;
  const iconAmenities = pickAmenityIcons(obj.amenities);

  return (
    <article className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-150 bg-white flex flex-col">
      {/* Бейджи вынесены из ссылки: внутри неё их текст приклеивался
          к имени ссылки («Глэмпинг Лесная сказка Глэмпинг ★ 4.8 · 12»). */}
      <div className="relative">
        <a href={cardUrl} className="block" aria-hidden="true" tabIndex={-1}>
          <SafeImage
            src={obj.mainPhotoUrl || ""}
            alt={obj.mainPhotoAlt || obj.name}
            className="w-full h-48 object-cover"
            loading={imageLoading}
            fetchPriority={imageFetchPriority}
          />
        </a>
        {obj.objectType?.name && (
          <span className="absolute top-3 left-3 text-xs bg-white/90 backdrop-blur text-primary-800 px-2 py-1 rounded-full font-medium shadow-sm">
            {obj.objectType.name}
          </span>
        )}
        {obj.rating != null && (
          <span
            className="absolute top-3 right-3 text-xs bg-white/90 backdrop-blur text-gray-900 px-2 py-1 rounded-full font-semibold shadow-sm tabular-nums"
            aria-label={`Рейтинг ${obj.rating} из 5${
              obj.reviewCount > 0 ? `, отзывов: ${obj.reviewCount}` : ""
            }`}
          >
            <span aria-hidden>★ {obj.rating}</span>
            {obj.reviewCount > 0 && (
              <span className="text-gray-500 font-normal" aria-hidden>
                {" "}
                · {obj.reviewCount}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Название и адрес — одна смысловая группа, поэтому внутри gap-1,
            а между группами карточки gap-3. */}
        <div className="flex flex-col gap-1">
          <a href={cardUrl}>
            <h3 className="font-semibold text-base leading-snug hover:text-primary-700 transition-colors duration-150 line-clamp-2 text-balance break-words">
              {obj.name}
            </h3>
          </a>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span aria-hidden>📍</span>
            <span className="truncate">
              {obj.cityOrDistrict?.name}
              {obj.region?.name ? `, ${obj.region.name}` : ""}
            </span>
          </div>
        </div>

        {iconAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {iconAmenities.map((a) => (
              <span
                key={a.label}
                className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap"
              >
                <span aria-hidden>{a.icon}</span>
                <span>{a.label}</span>
              </span>
            ))}
          </div>
        )}

        {obj.shortDescription && (
          <p className="text-sm text-gray-600 line-clamp-2 text-pretty">
            {obj.shortDescription}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            {obj.minPrice ? (
              <>
                <div className="font-bold text-lg leading-none tabular-nums">
                  от {obj.minPrice.toLocaleString("ru-RU")}&nbsp;₽
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  за сутки · до {obj.capacity} гостей
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">
                Цена по запросу · до {obj.capacity} гостей
              </div>
            )}
          </div>
        </div>

        {showSourceButton && obj.sourceUrl && (
          <a
            href={obj.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Посмотреть «${obj.name}» на сайте партнёра (откроется в новой вкладке)`}
            className="mt-1 block text-center bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-[0.96]"
          >
            Посмотреть
          </a>
        )}
      </div>
    </article>
  );
}
