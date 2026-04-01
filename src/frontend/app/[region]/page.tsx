import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchObjects, fetchRegions, fetchObjectTypes, fetchPopularQueries } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ObjectGrid } from "@/components/ObjectGrid";
import { PopularQueries } from "@/components/PopularQueries";

interface Props {
  params: { region: string };
  searchParams: Record<string, string>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const regions = await fetchRegions();
  const region = regions.find((r) => r.slug === params.region);
  if (!region) return {};

  const hasFilters = false; // metadata always for clean URL
  return {
    title: `Глэмпинги, гостевые дома и бани в регионе ${region.name} посуточно — цены и фото`,
    description: `Подборка глэмпингов, гостевых домов и бань в регионе ${region.name}: цены, фото, карта, свободные даты. Выберите вариант для отдыха.`,
    alternates: { canonical: `/${region.slug}/` },
  };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const [regions, types, popularQueries] = await Promise.all([
    fetchRegions(),
    fetchObjectTypes(),
    fetchPopularQueries(),
  ]);

  const region = regions.find((r) => r.slug === params.region);
  if (!region) notFound();

  const hasFilters = Object.keys(searchParams).length > 0;
  const apiParams: Record<string, string> = { region: params.region, ...searchParams };
  const { data: objects, total } = await fetchObjects(apiParams);

  const basePath = `/${region.slug}/`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
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
      <p className="text-gray-600 mb-6">
        Глэмпинги, гостевые дома и бани для аренды посуточно
      </p>

      {/* Cities/districts */}
      {region.cities.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Города и районы</h2>
          <div className="flex flex-wrap gap-2">
            {region.cities.map((c) => (
              <a
                key={c.id}
                href={`/${region.slug}/${c.slug}/`}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Types */}
      {types.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Типы размещения</h2>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <a
                key={t.id}
                href={`/${region.slug}/${t.slug}/`}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200"
              >
                {t.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <ObjectGrid objects={objects} total={total} basePath={basePath} />

      <PopularQueries queries={popularQueries} basePath={basePath} />
    </div>
  );
}
