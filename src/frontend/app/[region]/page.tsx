import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchObjects, fetchRegions, fetchObjectTypes, fetchPopularQueries, fetchMapPoints } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ObjectCardWide } from "@/components/ObjectCardWide";
import { ListingMap } from "@/components/ListingMap";
import { FilterBar } from "@/components/FilterBar";
import { ObjectLinkBlock, RegionLinkBlock } from "@/components/InternalLinkBlocks";
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
  const [{ data: objects, total }, { data: glampingLinks }] = await Promise.all([
    fetchObjects(apiParams),
    hasFilters
      ? Promise.resolve({ data: [], total: 0, page: 1, pageSize: 4 })
      : fetchObjects({ region: params.region, type: "glempingi", pageSize: "4" }),
  ]);

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

      {!hasFilters && (
        <>
          <ObjectLinkBlock
            title={`Глэмпинги в регионе ${region.name}`}
            objects={glampingLinks}
          />
          <RegionLinkBlock
            regions={regions}
            currentRegionSlug={region.slug}
          />
        </>
      )}

      {/* SEO footer block — render only on the canonical (non-filtered) page */}
      {!hasFilters && (
        <RegionSeoFooter
          regionName={region.name}
          regionSlug={region.slug}
          types={types}
          cities={region.cities}
          total={total}
        />
      )}
    </div>
  );
}

/* ---------- SEO footer ---------- */

const intentChips: { label: string; emoji: string; param: string }[] = [
  { label: "С горячим чаном", emoji: "♨️", param: "chan=1" },
  { label: "С баней", emoji: "🧖", param: "sauna=1" },
  { label: "С мангалом", emoji: "🔥", param: "mangal=1" },
  { label: "У воды", emoji: "💧", param: "u-vody=1" },
  { label: "В лесу", emoji: "🌲", param: "u-lesa=1" },
  { label: "Можно с питомцами", emoji: "🐾", param: "s-pitomtsami=1" },
  { label: "Для детей", emoji: "🧸", param: "s-detmi=1" },
  { label: "Wi-Fi", emoji: "📶", param: "wifi=1" },
  { label: "Парковка", emoji: "🅿️", param: "parkovka=1" },
];

function RegionSeoFooter({
  regionName,
  regionSlug,
  types,
  cities,
  total,
}: {
  regionName: string;
  regionSlug: string;
  types: { id: number; name: string; slug: string }[];
  cities: { id: number; name: string; slug: string; isCity: boolean }[];
  total: number;
}) {
  return (
    <section className="mt-12 border-t border-gray-200 pt-10 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h2 className="text-xl md:text-2xl font-bold text-navy-900 mb-3">
          Отдых в регионе {regionName}
        </h2>
        <div className="space-y-3 text-gray-700 leading-relaxed text-[15px]">
          <p>
            Каталог OnlyGlamps собрал {total > 0 ? `${total} ` : ""}
            проверенных вариантов размещения в регионе {regionName}: глэмпинги, гостевые
            дома, бани и базы отдыха. Для каждого объекта — фото, цены, удобства, точка
            на карте и контакты владельца. Бронировать можно посуточно.
          </p>
          <p>
            Используйте фильтры выше, чтобы быстро подобрать вариант под ваш сценарий
            отдыха: с горячим чаном или баней, у воды, в лесу, с возможностью разместиться
            с питомцами или большой компанией. Карточки показывают только живые
            предложения с актуальной ценой и доступностью дат.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Intents */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-2">
            Идеи для отдыха
          </h3>
          <div className="flex flex-wrap gap-2">
            {intentChips.map((c) => (
              <a
                key={c.param}
                href={`/${regionSlug}/?${c.param}`}
                className="inline-flex items-center gap-1 text-sm bg-gray-50 hover:bg-primary-50 hover:text-primary-700 border border-gray-200 hover:border-primary-200 text-gray-700 px-3 py-1.5 rounded-full transition"
              >
                <span aria-hidden>{c.emoji}</span>
                <span>{c.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Types */}
        {types.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-2">
              По типу размещения
            </h3>
            <ul className="grid grid-cols-2 gap-1.5 text-sm">
              {types.map((t) => (
                <li key={t.id}>
                  <a
                    href={`/${regionSlug}/${t.slug}/`}
                    className="text-gray-700 hover:text-primary-700 hover:underline"
                  >
                    {t.name} в {regionName.replace(/ая$/, "ой").replace(/ий$/, "ом")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cities */}
        {cities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-2">
              Города и районы
            </h3>
            <ul className="grid grid-cols-2 gap-1.5 text-sm">
              {cities.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <a
                    href={`/${regionSlug}/${c.slug}/`}
                    className="text-gray-700 hover:text-primary-700 hover:underline"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
