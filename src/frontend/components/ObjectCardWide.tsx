import { ObjectListItem } from "@/lib/api";
import { SafeImage } from "./SafeImage";

export function ObjectCardWide({ obj }: { obj: ObjectListItem }) {
  const cardUrl = `/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`;
  const extraAmenities = obj.amenities.length - 5;

  return (
    <article className="flex flex-col sm:flex-row border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-150 bg-white">
      {/* Ссылка-картинка дублирует ссылку в заголовке, поэтому скрыта
          от скринридеров — иначе каждая карточка читается дважды. */}
      <a
        href={cardUrl}
        className="block shrink-0 sm:w-[240px] h-[200px] sm:h-auto relative"
        aria-hidden="true"
        tabIndex={-1}
      >
        <SafeImage
          src={obj.mainPhotoUrl || ""}
          alt={obj.mainPhotoAlt || obj.name}
          className="w-full h-full object-cover"
        />
      </a>
      <div className="flex-1 p-4 flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full whitespace-nowrap">
              {obj.objectType?.name}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {obj.cityOrDistrict?.name}
            </span>
          </div>
          {obj.rating != null && (
            <span
              className="shrink-0 text-sm font-bold text-white bg-primary-600 px-2 py-0.5 rounded-md tabular-nums"
              aria-label={`Рейтинг ${obj.rating} из 5`}
            >
              {obj.rating}
            </span>
          )}
        </div>

        <a href={cardUrl}>
          <h3 className="font-semibold text-lg mb-1 hover:text-primary-700 transition-colors duration-150 line-clamp-2 text-balance break-words">
            {obj.name}
          </h3>
        </a>

        {obj.shortDescription && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3 text-pretty">
            {obj.shortDescription}
          </p>
        )}

        {obj.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {obj.amenities.slice(0, 5).map((a) => (
              <span
                key={a}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded whitespace-nowrap"
              >
                {a}
              </span>
            ))}
            {extraAmenities > 0 && (
              <span className="text-xs text-gray-500 px-1 py-0.5 tabular-nums">
                +{extraAmenities}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <div>
            {obj.minPrice ? (
              <span className="font-bold text-lg tabular-nums">
                от {obj.minPrice.toLocaleString("ru-RU")}&nbsp;₽
                <span className="text-sm font-normal text-gray-500"> за сутки</span>
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
              aria-label={`Посмотреть «${obj.name}» на сайте партнёра (откроется в новой вкладке)`}
              className="shrink-0 bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-[0.96]"
            >
              Посмотреть
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
