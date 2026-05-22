import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { fetchRegions, type TypeCount } from "@/lib/api";

export const metadata: Metadata = {
  title: "Все направления отдыха",
  description: "Список регионов и городов, где представлены объекты для отдыха.",
  alternates: { canonical: "/directions/" },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

const typeBadgeClasses = [
  "border-emerald-200 bg-emerald-50 text-emerald-800",
  "border-sky-200 bg-sky-50 text-sky-800",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-rose-200 bg-rose-50 text-rose-800",
  "border-violet-200 bg-violet-50 text-violet-800",
  "border-slate-200 bg-slate-50 text-slate-700",
];

function formatObjectCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} объекта`;
  return `${count} объектов`;
}

function TypeCountBadge({
  type,
  index,
  href,
}: {
  type: TypeCount;
  index: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${typeBadgeClasses[index % typeBadgeClasses.length]}`}
    >
      <span>{type.name}</span>
      <span className="rounded bg-white/70 px-1.5 py-0.5 text-xs font-semibold">
        {type.count}
      </span>
    </a>
  );
}

export default async function DirectionsPage() {
  const regions = await fetchRegions();
  const sortedRegions = [...regions].sort((a, b) => {
    if (b.objectCount !== a.objectCount) return b.objectCount - a.objectCount;
    return a.name.localeCompare(b.name, "ru");
  });
  const totalObjects = sortedRegions.reduce((sum, region) => sum + region.objectCount, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumbs
        items={[
          { name: "Главная", url: "/" },
          { name: "Все направления" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-2">
          Все направления
        </h1>
        <p className="text-gray-600">
          Регионы и города для отдыха в глэмпингах, гостевых домах, банях и базах отдыха.
          Сейчас в каталоге {formatObjectCount(totalObjects)}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedRegions.map((region) => {
          const activeCities = region.cities
            .filter((city) => city.objectCount > 0)
            .sort((a, b) => b.objectCount - a.objectCount || a.name.localeCompare(b.name, "ru"));

          return (
            <section
              key={region.slug}
              className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  {region.objectCount > 0 ? (
                    <a
                      href={`/${region.slug}/`}
                      className="text-lg font-semibold text-navy-900 hover:text-primary-700 transition"
                    >
                      {region.name}
                    </a>
                  ) : (
                    <span className="text-lg font-semibold text-navy-900">{region.name}</span>
                  )}
                  <div className="mt-2 inline-flex items-baseline gap-2 rounded-md bg-navy-900 px-3 py-1.5 text-white">
                    <span className="text-xl font-bold leading-none">{region.objectCount}</span>
                    <span className="text-xs text-white/75">
                      {formatObjectCount(region.objectCount).replace(String(region.objectCount), "").trim()}
                    </span>
                  </div>
                </div>
                {region.objectCount > 0 && (
                  <a
                    href={`/${region.slug}/`}
                    className="shrink-0 rounded-md border border-primary-200 px-2.5 py-1 text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-primary-800"
                  >
                    Открыть
                  </a>
                )}
              </div>

              {region.typeCounts.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {region.typeCounts.map((type, index) => (
                    <TypeCountBadge
                      key={`${region.slug}-${type.slug}`}
                      type={type}
                      index={index}
                      href={`/${region.slug}/${type.slug}/`}
                    />
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Пока нет опубликованных объектов
                </div>
              )}

              {activeCities.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  {activeCities.map((city) => (
                    <a
                      key={`${region.slug}-${city.slug}`}
                      href={`/${region.slug}/${city.slug}/`}
                      className="px-2.5 py-1 rounded-md bg-gray-50 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
                    >
                      {city.name}
                      <span className="ml-1 text-xs text-gray-400">{city.objectCount}</span>
                    </a>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
