import { ObjectListItem } from "@/lib/api";
import { SafeImage } from "./SafeImage";

export function ObjectCard({ obj, basePath }: { obj: ObjectListItem; basePath?: string }) {
  const cardUrl = `/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`;

  return (
    <article className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white">
      <a href={cardUrl} className="block">
        <SafeImage
          src={obj.mainPhotoUrl || ""}
          alt={obj.mainPhotoAlt || obj.name}
          className="w-full h-48 object-cover"
        />
      </a>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
            {obj.objectType?.name}
          </span>
          <span className="text-xs text-gray-500">{obj.cityOrDistrict?.name}</span>
        </div>
        <a href={cardUrl}>
          <h3 className="font-semibold text-lg mb-1 hover:text-primary-700 transition">
            {obj.name}
          </h3>
        </a>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{obj.shortDescription}</p>
        {obj.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {obj.amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {a}
              </span>
            ))}
            {obj.amenities.length > 4 && (
              <span className="text-xs text-gray-400">+{obj.amenities.length - 4}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            {obj.minPrice && (
              <span className="font-bold text-lg">
                от {obj.minPrice.toLocaleString("ru-RU")} ₽
              </span>
            )}
            <span className="text-sm text-gray-500 ml-1">· до {obj.capacity} гостей</span>
          </div>
          {obj.rating && (
            <span className="text-sm font-medium">
              ★ {obj.rating} ({obj.reviewCount})
            </span>
          )}
        </div>
        {obj.sourceUrl && (
          <a
            href={obj.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-700 transition"
          >
            Посмотреть
          </a>
        )}
      </div>
    </article>
  );
}
