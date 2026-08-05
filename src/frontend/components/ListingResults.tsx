import type { MapPoint, ObjectListItem } from "@/lib/api";
import { ListingMap } from "./ListingMap";
import { ObjectCardWide } from "./ObjectCardWide";

/**
 * Общая выдача листинга: колонка карточек + залипающая карта.
 * Используется всеми публичными листингами (регион, город, тип, город+тип).
 */
export function ListingResults({
  objects,
  mapPoints,
}: {
  objects: ObjectListItem[];
  mapPoints: MapPoint[];
}) {
  return (
    <div className="flex gap-6 pb-20 lg:pb-0">
      <div className="w-full lg:w-1/2 min-w-0">
        {objects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Объекты не найдены</p>
            <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {objects.map((obj) => (
              <ObjectCardWide key={obj.id} obj={obj} />
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block w-1/2 shrink-0">
        <div className="sticky top-20 h-[calc(100vh-6rem)] rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
          <ListingMap points={mapPoints} />
        </div>
      </div>
    </div>
  );
}
