import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { fetchMapPoints, fetchRegions } from "@/lib/api";

export const metadata: Metadata = {
  title: "Все направления отдыха",
  description: "Список регионов и городов, где представлены объекты для отдыха.",
  alternates: { canonical: "/directions/" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

function formatObjectCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} объекта`;
  return `${count} объектов`;
}

export default async function DirectionsPage() {
  const [regions, points] = await Promise.all([
    fetchRegions(),
    fetchMapPoints(),
  ]);

  const regionCounts = new Map<string, number>();
  for (const point of points) {
    regionCounts.set(point.region.slug, (regionCounts.get(point.region.slug) || 0) + 1);
  }

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
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {regions.map((region) => {
          const count = regionCounts.get(region.slug) || 0;

          return (
            <section
              key={region.slug}
              className="border border-gray-200 rounded-lg bg-white p-4 hover:border-primary-200 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <a
                    href={`/${region.slug}/`}
                    className="text-lg font-semibold text-navy-900 hover:text-primary-700 transition"
                  >
                    {region.name}
                  </a>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatObjectCount(count)}
                  </div>
                </div>
                <a
                  href={`/${region.slug}/`}
                  className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800"
                >
                  Открыть
                </a>
              </div>

              {region.cities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {region.cities.map((city) => (
                    <a
                      key={`${region.slug}-${city.slug}`}
                      href={`/${region.slug}/${city.slug}/`}
                      className="px-2.5 py-1 rounded-md bg-gray-50 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
                    >
                      {city.name}
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
