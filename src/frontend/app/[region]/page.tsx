import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchObjects, fetchRegions, fetchObjectTypes, fetchPopularQueries, fetchMapPoints } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ObjectCardWide } from "@/components/ObjectCardWide";
import { ListingMap } from "@/components/ListingMap";
import { FilterBar } from "@/components/FilterBar";
import { Suspense } from "react";

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

      <Suspense fallback={null}>
        <FilterBar
          types={types}
          cities={region.cities}
          popularQueries={popularQueries}
          basePath={basePath}
          regionSlug={region.slug}
          total={total}
          prices={mapPoints.map((p) => p.minPrice).filter((p): p is number => p !== null)}
          mapPoints={mapPoints}
        />
      </Suspense>

      {/* Main layout: cards (50%) + map (50%) */}
      <div className="flex gap-6 pb-20 lg:pb-0">
        {/* Cards */}
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

        {/* Map */}
        <div className="hidden lg:block w-1/2 shrink-0">
          <div className="sticky top-20 h-[calc(100vh-6rem)] rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
            <ListingMap points={mapPoints} />
          </div>
        </div>
      </div>
    </div>
  );
}
