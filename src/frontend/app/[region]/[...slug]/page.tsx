import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchObjectBySlug, fetchObjects, fetchRegions } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ListingPage } from "@/components/ListingPage";
import { ObjectDetailView } from "@/components/ObjectDetailView";
import { LISTING_PAGE_SIZE, listingMetadata, resolveListing, splitPageSegment } from "@/lib/listing";
import { INDEX_FOLLOW, pickFilterParams } from "@/lib/seo";

interface Props {
  params: { region: string; slug: string[] };
  searchParams: Record<string, string | string[] | undefined>;
}

type ParsedPath =
  | { kind: "object"; citySlug: string; objectSlug: string }
  | { kind: "listing"; segments: string[]; page: number; explicit: boolean }
  | null;

function parsePath(slug: string[]): ParsedPath {
  if (!slug || slug.length === 0) return null;

  // Карточка объекта: /{region}/{city}/{slug}-{id}/
  if (slug.length === 2 && /-\d+$/.test(slug[1])) {
    return { kind: "object", citySlug: slug[0], objectSlug: slug[1] };
  }

  const split = splitPageSegment(slug);
  if (!split || split.segments.length > 2) return null;
  return { kind: "listing", ...split };
}

/** Единственный правильный URL карточки — строится из данных объекта, не из адреса. */
function objectCanonicalPath(obj: {
  slug: string;
  id: number;
  region: { slug: string };
  cityOrDistrict: { slug: string };
}): string {
  return `/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const parsed = parsePath(params.slug);
  if (!parsed) return {};

  if (parsed.kind === "object") {
    const [regions, obj] = await Promise.all([
      fetchRegions(),
      fetchObjectBySlug(parsed.objectSlug),
    ]);
    const region = regions.find((r) => r.slug === obj?.region.slug);
    if (!region || !obj) return {};

    return {
      title: `${obj.name} — ${obj.objectType.name} в ${region.name}`,
      description: `Фото, цены, вместимость, удобства, карта, отзывы и свободные даты для отдыха в ${obj.name}.`,
      alternates: { canonical: objectCanonicalPath(obj) },
      // Карточка индексируется всегда: GET-параметры её содержимое не меняют.
      robots: INDEX_FOLLOW,
    };
  }

  const ctx = await resolveListing(params.region, parsed.segments, parsed.page);
  if (!ctx) return {};

  const filters = pickFilterParams(searchParams);
  const { total } = await fetchObjects({
    ...filters,
    region: ctx.region.slug,
    ...(ctx.city ? { city: ctx.city.slug } : {}),
    ...(ctx.type ? { type: ctx.type.slug } : {}),
    page: String(ctx.page),
    pageSize: String(LISTING_PAGE_SIZE),
  });

  return listingMetadata(ctx, searchParams, total === 0);
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const parsed = parsePath(params.slug);
  if (!parsed) notFound();

  if (parsed.kind === "listing") {
    // `/page/1/` не существует — первая страница живёт по базовому URL.
    if (parsed.explicit && parsed.page === 1) {
      permanentRedirect(`/${[params.region, ...parsed.segments].join("/")}/`);
    }

    return (
      <ListingPage
        regionSlug={params.region}
        segments={parsed.segments}
        page={parsed.page}
        searchParams={searchParams}
      />
    );
  }

  // --- Карточка объекта ---
  const [regions, obj] = await Promise.all([
    fetchRegions(),
    fetchObjectBySlug(parsed.objectSlug),
  ]);
  if (!obj) notFound();

  // Один объект = один URL: любой другой адрес отдаёт 301 на канонический.
  const canonicalPath = objectCanonicalPath(obj);
  if (`/${params.region}/${parsed.citySlug}/${parsed.objectSlug}/` !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const region = regions.find((r) => r.slug === obj.region.slug);
  if (!region) notFound();
  const city = region.cities.find((c) => c.slug === obj.cityOrDistrict.slug);

  // Похожие рядом: сначала тот же город, добираем по региону. Максимум 4, без текущего.
  const { data: cityNearby } = await fetchObjects({
    region: region.slug,
    city: obj.cityOrDistrict.slug,
    pageSize: "8",
  });
  const nearby = cityNearby.filter((o) => o.id !== obj.id).slice(0, 4);
  if (nearby.length < 4) {
    const { data: regionNearby } = await fetchObjects({
      region: region.slug,
      pageSize: "12",
    });
    const seen = new Set([obj.id, ...nearby.map((n) => n.id)]);
    for (const n of regionNearby) {
      if (seen.has(n.id)) continue;
      nearby.push(n);
      seen.add(n.id);
      if (nearby.length >= 4) break;
    }
  }

  const { data: glampingLinksRaw } = await fetchObjects({
    region: region.slug,
    type: "glempingi",
    pageSize: "8",
  });
  const glampingLinks = glampingLinksRaw.filter((o) => o.id !== obj.id).slice(0, 4);

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
      <ObjectDetailView
        obj={obj}
        nearby={nearby}
        glampingLinks={glampingLinks}
        regionLinks={regions}
      />
    </div>
  );
}
