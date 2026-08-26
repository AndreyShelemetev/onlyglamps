import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  fetchMapPoints,
  fetchObjectTypes,
  fetchObjects,
  fetchPopularQueries,
  fetchRegions,
} from "@/lib/api";
import {
  LISTING_PAGE_SIZE,
  listingBreadcrumbs,
  listingH1,
  resolveListing,
} from "@/lib/listing";
import { pickFilterParams } from "@/lib/seo";
import { REGION_INTENTS } from "@/lib/intents";
import { Breadcrumbs } from "./Breadcrumbs";
import { FilterBar } from "./FilterBar";
import { ListingLinkBlocks } from "./InternalLinkBlocks";
import { ListingResults } from "./ListingResults";
import { Pagination } from "./Pagination";

interface Props {
  regionSlug: string;
  /** Сегменты после региона, без хвоста /page/N. */
  segments: string[];
  page: number;
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Единая публичная страница листинга: регион, город, тип и город+тип.
 * Используется и `/{region}/`, и катч-олл маршрутом — вёрстка и SEO-правила
 * не должны расходиться между ними.
 */
export async function ListingPage({ regionSlug, segments, page, searchParams }: Props) {
  const ctx = await resolveListing(regionSlug, segments, page);
  if (!ctx) notFound();

  const { region, city, type, basePath } = ctx;
  const filters = pickFilterParams(searchParams);
  const hasFilters = Object.keys(filters).length > 0;

  // Сегменты пути важнее одноимённых GET-параметров: /kazan/bani/ остаётся банями Казани.
  const apiParams: Record<string, string> = {
    ...filters,
    region: region.slug,
    page: String(page),
    pageSize: String(LISTING_PAGE_SIZE),
  };
  if (city) apiParams.city = city.slug;
  if (type) apiParams.type = type.slug;

  const [types, popularQueries, allMapPoints, regions, { data: objects, total }] =
    await Promise.all([
      fetchObjectTypes(),
      fetchPopularQueries(),
      fetchMapPoints(),
      fetchRegions(),
      fetchObjects(apiParams),
    ]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LISTING_PAGE_SIZE));
  if (page > totalPages) notFound();

  const { data: glampingLinks } = hasFilters
    ? { data: [] }
    : await fetchObjects({ region: region.slug, type: "glempingi", pageSize: "4" });

  const mapPoints = allMapPoints.filter((p) => {
    if (p.region.slug !== region.slug) return false;
    if (city && p.cityOrDistrict.slug !== city.slug) return false;
    if (type && p.objectType.slug !== type.slug) return false;
    return true;
  });

  const isRegionRoot = !city && !type;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6">
      <Breadcrumbs items={listingBreadcrumbs(ctx)} />

      <h1 className="text-2xl md:text-3xl font-bold mb-2">{listingH1(ctx)}</h1>
      <p className="text-gray-600 mb-4">
        Глэмпинги, гостевые дома и бани для аренды посуточно
      </p>

      <Suspense fallback={null}>
        <FilterBar
          types={types}
          cities={!city ? region.cities : undefined}
          popularQueries={popularQueries}
          basePath={basePath}
          activeType={type?.slug}
          activeCity={city?.slug}
          regionSlug={region.slug}
          total={total}
          prices={mapPoints.map((p) => p.minPrice).filter((p): p is number => p !== null)}
          mapPoints={mapPoints}
        />
      </Suspense>

      <ListingResults
        objects={objects}
        mapPoints={mapPoints}
        resetHref={hasFilters ? basePath : undefined}
      />

      <Pagination
        basePath={basePath}
        page={page}
        totalPages={totalPages}
        query={new URLSearchParams(filters).toString()}
      />

      {/* Перелинковка — только на канонических (нефильтрованных) URL */}
      {!hasFilters && (
        <ListingLinkBlocks
          regionName={region.name}
          regionSlug={region.slug}
          glampingLinks={glampingLinks}
          regions={regions}
        />
      )}

      {!hasFilters && isRegionRoot && page === 1 && (
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
        <div>
          <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-2">
            Идеи для отдыха
          </h3>
          <div className="flex flex-wrap gap-2">
            {REGION_INTENTS.map((c) => (
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
