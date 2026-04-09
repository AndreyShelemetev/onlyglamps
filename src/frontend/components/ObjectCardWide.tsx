import { ObjectListItem } from "@/lib/api";
import { SafeImage } from "./SafeImage";

export function ObjectCardWide({ obj }: { obj: ObjectListItem }) {
  const cardUrl = `/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`;

  return (
    <article className="flex flex-col sm:flex-row border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white">
      <a href={cardUrl} className="block shrink-0 sm:w-[240px] h-[200px] sm:h-auto relative">
        <SafeImage
          src={obj.mainPhotoUrl || ""}
          alt={obj.mainPhotoAlt || obj.name}
          className="w-full h-full object-cover"
        />
      </a>
      <div className="flex-1 p-4 flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
              {obj.objectType?.name}
            </span>
            <span className="text-xs text-gray-500">{obj.cityOrDistrict?.name}</span>
          </div>
          {obj.rating && (
            <span className="shrink-0 text-sm font-bold text-white bg-primary-600 px-2 py-0.5 rounded-md">
              {obj.rating}
            </span>
          )}
        </div>

        <a href={cardUrl}>
          <h3 className="font-semibold text-lg mb-1 hover:text-primary-700 transition line-clamp-1">
            {obj.name}
          </h3>
        </a>

        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{obj.shortDescription}</p>

        {obj.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {obj.amenities.slice(0, 5).map((a) => (
              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {a}
              </span>
            ))}
            {obj.amenities.length > 5 && (
              <span className="text-xs text-gray-400">+{obj.amenities.length - 5}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <div>
            {obj.minPrice ? (
              <span className="font-bold text-lg">
                от {obj.minPrice.toLocaleString("ru-RU")} ₽
                <span className="text-sm font-normal text-gray-500"> /сутки</span>
              </span>
            ) : (
              <span className="text-sm text-gray-500">Цена по запросу</span>
            )}
            <div className="text-xs text-gray-500">до {obj.capacity} гостей</div>
          </div>
          {obj.sourceUrl && (
            <a
              href={obj.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-700 transition"
            >
              Посмотреть
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
