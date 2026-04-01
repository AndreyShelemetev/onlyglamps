import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchObjects, fetchRegions, fetchObjectTypes, fetchPopularQueries, fetchObjectBySlug } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ObjectGrid } from "@/components/ObjectGrid";
import { PopularQueries } from "@/components/PopularQueries";
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

  const [regions, types, popularQueries] = await Promise.all([
    fetchRegions(),
    fetchObjectTypes(),
    fetchPopularQueries(),
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

  // Current path for popular queries
  const currentPath = `/${region.slug}/${params.slug.join("/")}/`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {hasFilters && (
        <meta name="robots" content="noindex,follow" />
      )}

      <Breadcrumbs items={breadcrumbs} />

      <h1 className="text-2xl md:text-3xl font-bold mb-2">{h1}</h1>
      <p className="text-gray-600 mb-6">
        Глэмпинги, гостевые дома и бани для аренды посуточно
      </p>

      {/* Sub-navigation: types if on city page, cities if on type page */}
      {!typeData && !isTypePage && types.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Типы размещения</h2>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <a
                key={t.id}
                href={effectiveCity ? `/${region.slug}/${effectiveCity}/${t.slug}/` : `/${region.slug}/${t.slug}/`}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200"
              >
                {t.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {!effectiveCity && region.cities.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Города и районы</h2>
          <div className="flex flex-wrap gap-2">
            {region.cities.map((c) => (
              <a
                key={c.id}
                href={effectiveType ? `/${region.slug}/${c.slug}/${effectiveType}/` : `/${region.slug}/${c.slug}/`}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <ObjectGrid objects={objects} total={total} />

      <PopularQueries queries={popularQueries} basePath={currentPath} />
    </div>
  );
}
