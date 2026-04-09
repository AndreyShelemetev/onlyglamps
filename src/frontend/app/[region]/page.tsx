import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchObjects, fetchRegions, fetchObjectTypes, fetchPopularQueries, fetchMapPoints } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ObjectCardWide } from "@/components/ObjectCardWide";
import { ListingMap } from "@/components/ListingMap";

interface Props {
  params: { region: string };
  searchParams: Record<string, string>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const regions = await fetchRegions();
  const region = regions.find((r) => r.slug === params.region);
  if (!region) return {};

  return {
    title: `Глэмпинги, гостевые дома и бани в регионе ${region.name} посуточно — цены и фото`,
    description: `Подборка глэмпингов, гостевых домов и бань в регионе ${region.name}: цены, фото, карта, свободные даты. Выберите вариант для отдыха.`,
    alternates: { canonical: `/${region.slug}/` },
  };
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}

export default async function RegionPage({ params, searchParams }: Props) {
  const [regions, types, popularQueries, allMapPoints] = await Promise.all([
    fetchRegions(),
    fetchObjectTypes(),
    fetchPopularQueries(),
    fetchMapPoints(),
  ]);

  const region = regions.find((r) => r.slug === params.region);
  if (!region) notFound();

  const hasFilters = Object.keys(searchParams).length > 0;
  const apiParams: Record<string, string> = { region: params.region, ...searchParams };
  const { data: objects, total } = await fetchObjects(apiParams);

  const mapPoints = allMapPoints.filter((p) => p.region.slug === params.region);
  const basePath = `/${region.slug}/`;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6">
      {hasFilters && (
        <meta name="robots" content="noindex,follow" />
      )}

      <Breadcrumbs
        items={[
          { name: "Главная", url: "/" },
          { name: region.name },
        ]}
      />

      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        Отдых в регионе {region.name}
      </h1>
      <p className="text-gray-600 mb-4">
        Глэмпинги, гостевые дома и бани для аренды посуточно
      </p>

      {/* Filter bar: types */}
      {types.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <a
                key={t.id}
                href={`/${region.slug}/${t.slug}/`}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200 font-medium"
              >
                {t.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar: cities */}
      {region.cities.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {region.cities.map((c) => (
              <a
                key={c.id}
                href={`/${region.slug}/${c.slug}/`}
                className="text-sm px-3 py-1.5 bg-white hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Popular queries */}
      {popularQueries.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {popularQueries.map((q) => (
            <a
              key={q.id}
              href={`${basePath}?${q.filterParam}`}
              className="text-xs px-3 py-1 bg-primary-50 text-primary-700 rounded-full border border-primary-200 hover:bg-primary-100 transition"
            >
              {q.text}
            </a>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-gray-500 mb-4">
        {total > 0
          ? `Найдено: ${total} ${pluralize(total, "объект", "объекта", "объектов")}`
          : "Объекты не найдены"}
      </p>

      {/* Main layout: cards (2/3) + map (1/3) */}
      <div className="flex gap-6">
        {/* Cards */}
        <div className="flex-1 min-w-0">
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

        {/* Map */}
        <div className="hidden lg:block w-[420px] shrink-0">
          <div className="sticky top-20 h-[calc(100vh-6rem)] rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
            <ListingMap points={mapPoints} />
          </div>
        </div>
      </div>
    </div>
  );
}
