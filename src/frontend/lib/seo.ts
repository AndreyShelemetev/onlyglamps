import type { Metadata } from "next";

/** Канонический хост. Единственное место, где он задаётся. */
export const SITE_URL = "https://onlyglamps.ru";

/**
 * GET-параметры, по которым каталог реально фильтрует выдачу.
 * Зеркалит сигнатуру ObjectsController.GetAll — при добавлении фильтра
 * в бэкенде параметр нужно добавить и сюда.
 */
export const FILTER_PARAMS = [
  "city",
  "type",
  "guests",
  "price_from",
  "price_to",
  "sauna",
  "chan",
  "mangal",
  "besedka",
  "s-pitomtsami",
  "s-detmi",
  "parkovka",
  "wifi",
  "u-vody",
  "u-lesa",
  "ves-obekt",
  "sort",
] as const;

const FILTER_PARAM_SET: ReadonlySet<string> = new Set(FILTER_PARAMS);

/**
 * Оставляет только реальные параметры фильтрации.
 * Метки трафика (utm_*, yclid, gclid, from …) отбрасываются: они не меняют
 * выдачу, поэтому не должны ни уходить в API, ни превращать страницу в noindex,
 * ни прятать блоки перелинковки.
 */
export function pickFilterParams(
  searchParams: Record<string, string | string[] | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (!FILTER_PARAM_SET.has(key)) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single === undefined || single === "") continue;
    result[key] = single;
  }
  return result;
}

/** Активен ли хотя бы один фильтр — страница становится noindex,follow. */
export function hasActiveFilters(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  return Object.keys(pickFilterParams(searchParams)).length > 0;
}

export const INDEX_FOLLOW: Metadata["robots"] = { index: true, follow: true };
export const NOINDEX_FOLLOW: Metadata["robots"] = { index: false, follow: true };

/** Правило CONVENTIONS: чистый URL — index, выдача под фильтром — noindex,follow. */
export function listingRobots(filtered: boolean): Metadata["robots"] {
  return filtered ? NOINDEX_FOLLOW : INDEX_FOLLOW;
}

/* ---------- sitemap ---------- */

/**
 * Размер страницы sitemap для объектов.
 * Не может превышать потолок пагинации ObjectsController (Math.Clamp(pageSize, 1, 100)) —
 * иначе часть URL молча выпадет из карты сайта.
 */
export const SITEMAP_OBJECTS_PAGE_SIZE = 100;

/** Размер страницы sitemap для блога (BlogController пагинацию не ограничивает). */
export const SITEMAP_BLOG_PAGE_SIZE = 5000;

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

/** Экранирование символов, недопустимых в XML-тексте. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const XML_HEADERS = {
  "Content-Type": "application/xml",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

function xmlResponse(xml: string): Response {
  return new Response(xml, { headers: XML_HEADERS });
}

/** Номер страницы из ?page= — для постраничных sitemap-ов. */
export function getSitemapPage(request: Request): number {
  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get("page") || "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

export function buildUrlset(urls: SitemapUrl[]): Response {
  const body = urls
    .map((u) => {
      const parts = [`    <loc>${xmlEscape(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
}

export function buildSitemapIndex(locs: string[]): Response {
  const body = locs
    .map((loc) => `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`)
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`);
}

/**
 * lastmod по спецификации sitemaps.org — дата W3C.
 * Возвращает undefined для пустых и некорректных значений, чтобы в карту сайта
 * не попал заведомо ложный тег (поисковики перестают доверять lastmod целиком).
 */
export function toLastmod(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
