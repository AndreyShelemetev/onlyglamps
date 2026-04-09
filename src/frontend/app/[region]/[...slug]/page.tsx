import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchObjects, fetchRegions, fetchObjectTypes, fetchPopularQueries, fetchObjectBySlug, fetchMapPoints } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ObjectCardWide } from "@/components/ObjectCardWide";
import { ListingMap } from "@/components/ListingMap";
import { ObjectDetailView } from "@/components/ObjectDetailView";

interface Props {
  params: { region: string; slug: string[] };
  searchParams: Record<string, string>;
}

type PageKind =
  | { kind: "city"; regionSlug: string; citySlug: string }
  | { kind: "type"; regionSlug: string; typeSlug: string }
  | { kind: "city-type"; regionSlug: string; citySlug: string; typeSlug: string }
  | { kind: "object"; regionSlug: string; citySlug: string; objectSlug: string }
  | null;

function parsePath(region: string, slug: string[]): PageKind {
  if (!slug || slug.length === 0) return null;
  if (slug.length === 1) {
    // Could be city or type — we check later
    return { kind: "city", regionSlug: region, citySlug: slug[0] };
  }
  if (slug.length === 2) {
    // /{region}/{city}/{type}/ or /{region}/{city}/{slug-id}/
    const lastPart = slug[1];
    if (lastPart.match(/-\d+$/)) {
      return { kind: "object", regionSlug: region, citySlug: slug[0], objectSlug: lastPart };
    }
    return { kind: "city-type", regionSlug: region, citySlug: slug[0], typeSlug: slug[1] };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parsePath(params.region, params.slug);
  if (!parsed) return {};

  const [regions, types] = await Promise.all([fetchRegions(), fetchObjectTypes()]);
  const region = regions.find((r) => r.slug === params.region);
  if (!region) return {};

  if (parsed.kind === "object") {
    const obj = await fetchObjectBySlug(parsed.objectSlug);
    if (!obj) return {};
    return {
      title: `${obj.name} — ${obj.objectType.name} в ${region.name}`,
      description: `Фото, цены, вместимость, удобства, карта, отзывы и свободные даты для отдыха в ${obj.name}.`,
      alternates: { canonical: `/${region.slug}/${parsed.citySlug}/${parsed.objectSlug}/` },
    };
  }

  if (parsed.kind === "city") {
    // Check if it's type or city
    const type = types.find((t) => t.slug === parsed.citySlug);
    if (type) {
      return {
        title: `${type.name} в регионе ${region.name} посуточно — цены и фото`,
        description: `Подборка: ${type.name.toLowerCase()} в ${region.name}. Цены, фото, карта, свободные даты.`,
        alternates: { canonical: `/${region.slug}/${type.slug}/` },
      };
    }

    const city = region.cities.find((c) => c.slug === parsed.citySlug);
    if (!city) return {};
    return {
      title: `Глэмпинги, гостевые дома и бани — ${city.name}, ${region.name}`,
      description: `Подборка мест для отдыха в ${city.name}: глэмпинги, гостевые дома, бани. Цены, фото, карта.`,
      alternates: { canonical: `/${region.slug}/${city.slug}/` },
    };
  }

  if (parsed.kind === "city-type") {
    const city = region.cities.find((c) => c.slug === parsed.citySlug);
    const type = types.find((t) => t.slug === parsed.typeSlug);
    if (!city || !type) return {};
    return {
      title: `${type.name} в ${city.name} посуточно — цены и фото`,
      description: `Подборка: ${type.name.toLowerCase()} в ${city.name}, ${region.name}. Цены, фото, карта, удобства и свободные даты.`,
      alternates: { canonical: `/${region.slug}/${city.slug}/${type.slug}/` },
    };
  }

  return {};
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const parsed = parsePath(params.region, params.slug);
  if (!parsed) notFound();

  const [regions, types, popularQueries, allMapPoints] = await Promise.all([
    fetchRegions(),
    fetchObjectTypes(),
    fetchPopularQueries(),
    fetchMapPoints(),
  ]);

  const region = regions.find((r) => r.slug === params.region);
  if (!region) notFound();

  // --- Object detail page ---
  if (parsed.kind === "object") {
    const obj = await fetchObjectBySlug(parsed.objectSlug);
    if (!obj) notFound();

    const city = region.cities.find((c) => c.slug === parsed.citySlug);
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { name: "Главная", url: "/" },
            { name: region.name, url: `/${region.slug}/` },
            ...(city ? [{ name: city.name, url: `/${region.slug}/${city.slug}/` }] : []),
            { name: obj.name },
          ]}
        />
        <ObjectDetailView obj={obj} />
      </div>
    );
  }

  // --- Determine if first segment is type or city ---
  const hasFilters = Object.keys(searchParams).length > 0;
  let isTypePage = false;
  let effectiveCity: string | undefined;
  let effectiveType: string | undefined;

  if (parsed.kind === "city") {
    const type = types.find((t) => t.slug === parsed.citySlug);
    if (type) {
      isTypePage = true;
      effectiveType = type.slug;
    } else {
      const city = region.cities.find((c) => c.slug === parsed.citySlug);
      if (!city) notFound();
      effectiveCity = city.slug;
    }
  } else if (parsed.kind === "city-type") {
    const city = region.cities.find((c) => c.slug === parsed.citySlug);
    const type = types.find((t) => t.slug === parsed.typeSlug);
    if (!city || !type) notFound();
    effectiveCity = city.slug;
    effectiveType = type.slug;
  }

  const apiParams: Record<string, string> = { region: params.region, ...searchParams };
  if (effectiveCity) apiParams.city = effectiveCity;
  if (effectiveType) apiParams.type = effectiveType;

  const { data: objects, total } = await fetchObjects(apiParams);

  // Filter map points
  const mapPoints = allMapPoints.filter((p) => {
    if (p.region.slug !== params.region) return false;
    if (effectiveCity && p.cityOrDistrict.slug !== effectiveCity) return false;
    if (effectiveType && p.objectType.slug !== effectiveType) return false;
    return true;
  });

  // Build page context
  const cityData = effectiveCity ? region.cities.find((c) => c.slug === effectiveCity) : undefined;
  const typeData = effectiveType ? types.find((t) => t.slug === effectiveType) : undefined;

  // Build H1
  let h1: string;
  if (typeData && cityData) {
    h1 = `${typeData.name} в ${cityData.name}`;
  } else if (typeData) {
    h1 = `${typeData.name} в регионе ${region.name}`;
  } else if (cityData) {
    h1 = `Отдых в ${cityData.name}`;
  } else {
    h1 = `Отдых в ${region.name}`;
  }

  // Build breadcrumbs
  const breadcrumbs: { name: string; url?: string }[] = [
    { name: "Главная", url: "/" },
    { name: region.name, url: `/${region.slug}/` },
  ];
  if (cityData) breadcrumbs.push({ name: cityData.name, url: `/${region.slug}/${cityData.slug}/` });
  if (typeData && cityData) breadcrumbs.push({ name: typeData.name });
  else if (typeData) breadcrumbs.push({ name: typeData.name });

  const currentPath = `/${region.slug}/${params.slug.join("/")}/`;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6">
      {hasFilters && (
        <meta name="robots" content="noindex,follow" />
      )}

      <Breadcrumbs items={breadcrumbs} />

      <h1 className="text-2xl md:text-3xl font-bold mb-2">{h1}</h1>
      <p className="text-gray-600 mb-4">
        Глэмпинги, гостевые дома и бани для аренды посуточно
      </p>

      {/* Filter bar: types (if on city page) */}
      {!typeData && !isTypePage && types.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <a
                key={t.id}
                href={effectiveCity ? `/${region.slug}/${effectiveCity}/${t.slug}/` : `/${region.slug}/${t.slug}/`}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200 font-medium"
              >
                {t.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar: cities (if on type page) */}
      {!effectiveCity && region.cities.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {region.cities.map((c) => (
              <a
                key={c.id}
                href={effectiveType ? `/${region.slug}/${c.slug}/${effectiveType}/` : `/${region.slug}/${c.slug}/`}
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
              href={`${currentPath}?${q.filterParam}`}
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

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}
