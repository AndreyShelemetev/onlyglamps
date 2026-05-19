import type { ObjectListItem, RegionData } from "@/lib/api";
import { ObjectCard } from "./ObjectCard";

export function ObjectLinkBlock({
  title,
  objects,
}: {
  title: string;
  objects: ObjectListItem[];
}) {
  if (objects.length === 0) return null;

  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-navy-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {objects.slice(0, 4).map((obj) => (
          <ObjectCard key={obj.id} obj={obj} showSourceButton={false} />
        ))}
      </div>
    </section>
  );
}

export function RegionLinkBlock({
  title = "Другие регионы для отдыха",
  regions,
  currentRegionSlug,
}: {
  title?: string;
  regions: RegionData[];
  currentRegionSlug?: string;
}) {
  const items = regions
    .filter((region) => region.slug !== currentRegionSlug)
    .slice(0, 12);

  if (items.length === 0) return null;

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <h2 className="text-xl md:text-2xl font-bold text-navy-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((region) => (
          <a
            key={region.slug}
            href={`/${region.slug}/`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800 transition"
          >
            <span className="block font-semibold text-sm leading-snug">{region.name}</span>
            <span className="mt-1 block text-xs text-gray-500">
              {region.cities.length > 0
                ? `${region.cities.length} городов и районов`
                : "Подборка объектов"}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
