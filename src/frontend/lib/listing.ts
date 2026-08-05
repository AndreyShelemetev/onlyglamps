import type { Metadata } from "next";
import { fetchObjectTypes, fetchRegions, type RegionData } from "./api";
import { hasActiveFilters, listingRobots } from "./seo";

/** Объектов на странице листинга. Совпадает с дефолтом ObjectsController. */
export const LISTING_PAGE_SIZE = 20;

const PAGE_SEGMENT = "page";

type City = RegionData["cities"][number];
type ObjectTypeItem = { id: number; name: string; slug: string };

export interface PathWithPage {
  /** Сегменты пути без хвоста /page/N. */
  segments: string[];
  page: number;
  /** Был ли /page/N явно указан в URL. */
  explicit: boolean;
}

/**
 * Отделяет хвост `/page/N` от сегментов пути.
 * Возвращает null для битого хвоста (`/page/`, `/page/abc`, `/page/2/foo`) —
 * такие URL должны отдавать 404, а не молча показывать первую страницу.
 */
export function splitPageSegment(segments: string[]): PathWithPage | null {
  const index = segments.indexOf(PAGE_SEGMENT);
  if (index === -1) return { segments, page: 1, explicit: false };

  // `page` допустим только предпоследним сегментом: /.../page/2/
  if (index !== segments.length - 2) return null;

  const raw = segments[segments.length - 1];
  if (!/^\d+$/.test(raw)) return null;

  const page = Number(raw);
  if (page < 1) return null;

  return { segments: segments.slice(0, index), page, explicit: true };
}

export interface ListingContext {
  region: RegionData;
  city?: City;
  type?: ObjectTypeItem;
  page: number;
  /** Канонический путь листинга без пагинации, всегда со слешем на конце. */
  basePath: string;
  /** Канонический путь текущей страницы (с /page/N при page > 1). */
  canonicalPath: string;
}

/** Путь страницы N для данного листинга. `/page/1/` не существует — это basePath. */
export function pagePath(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}${PAGE_SEGMENT}/${page}/`;
}

/**
 * Разбирает сегменты после региона в город/тип.
 * Один сегмент может быть и городом, и типом — сначала проверяется тип.
 */
export async function resolveListing(
  regionSlug: string,
  segments: string[],
  page: number
): Promise<ListingContext | null> {
  if (segments.length > 2) return null;

  const [regions, types] = await Promise.all([fetchRegions(), fetchObjectTypes()]);
  const region = regions.find((r) => r.slug === regionSlug);
  if (!region) return null;

  let city: City | undefined;
  let type: ObjectTypeItem | undefined;

  if (segments.length === 1) {
    type = types.find((t) => t.slug === segments[0]);
    if (!type) {
      city = region.cities.find((c) => c.slug === segments[0]);
      if (!city) return null;
    }
  } else if (segments.length === 2) {
    city = region.cities.find((c) => c.slug === segments[0]);
    type = types.find((t) => t.slug === segments[1]);
    if (!city || !type) return null;
  }

  const basePath = `/${[region.slug, ...segments].join("/")}/`;

  return { region, city, type, page, basePath, canonicalPath: pagePath(basePath, page) };
}

/** H1 страницы. По CONVENTIONS должен отличаться от title. */
export function listingH1({ region, city, type }: ListingContext): string {
  if (type && city) return `${type.name} в ${city.name}`;
  if (type) return `${type.name} в регионе ${region.name}`;
  if (city) return `Отдых в ${city.name}`;
  return `Отдых в регионе ${region.name}`;
}

function listingTitle({ region, city, type }: ListingContext): string {
  if (type && city) return `${type.name} в ${city.name} посуточно — цены и фото`;
  if (type) return `${type.name} в регионе ${region.name} посуточно — цены и фото`;
  if (city) return `Глэмпинги, гостевые дома и бани — ${city.name}, ${region.name}`;
  return `Глэмпинги, гостевые дома и бани в регионе ${region.name} посуточно — цены и фото`;
}

function listingDescription({ region, city, type }: ListingContext): string {
  if (type && city) {
    return `Подборка: ${type.name.toLowerCase()} в ${city.name}, ${region.name}. Цены, фото, карта, удобства и свободные даты.`;
  }
  if (type) {
    return `Подборка: ${type.name.toLowerCase()} в ${region.name}. Цены, фото, карта, свободные даты.`;
  }
  if (city) {
    return `Подборка мест для отдыха в ${city.name}: глэмпинги, гостевые дома, бани. Цены, фото, карта.`;
  }
  return `Подборка глэмпингов, гостевых домов и бань в регионе ${region.name}: цены, фото, карта, свободные даты. Выберите вариант для отдыха.`;
}

export function listingBreadcrumbs(ctx: ListingContext): { name: string; url?: string }[] {
  const items: { name: string; url?: string }[] = [
    { name: "Главная", url: "/" },
  ];
  const leafIsRegion = !ctx.city && !ctx.type;
  items.push(
    leafIsRegion
      ? { name: ctx.region.name }
      : { name: ctx.region.name, url: `/${ctx.region.slug}/` }
  );
  if (ctx.city) {
    items.push(
      ctx.type
        ? { name: ctx.city.name, url: `/${ctx.region.slug}/${ctx.city.slug}/` }
        : { name: ctx.city.name }
    );
  }
  if (ctx.type) items.push({ name: ctx.type.name });
  return items;
}

/**
 * Метаданные листинга.
 * Пагинация индексируется с self-canonical: страницы под noindex со временем
 * теряют вес исходящих ссылок, и карточки глубже первой страницы остаются сиротами.
 */
export function listingMetadata(
  ctx: ListingContext,
  searchParams: Record<string, string | string[] | undefined>,
  isEmpty: boolean
): Metadata {
  const base = listingTitle(ctx);
  return {
    title: ctx.page > 1 ? `${base} — страница ${ctx.page}` : base,
    description: listingDescription(ctx),
    alternates: { canonical: ctx.canonicalPath },
    // Пустая выдача не индексируется — CONVENTIONS §SEO.
    robots: listingRobots(hasActiveFilters(searchParams) || isEmpty),
  };
}
