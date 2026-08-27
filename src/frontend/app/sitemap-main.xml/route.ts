import { SITE_URL, buildUrlset } from "@/lib/seo";

/**
 * Статические страницы карты сайта.
 *
 * `lastmod` проставляется вручную и двигается ТОЛЬКО при реальной правке текста
 * страницы. Дату сборки или деплоя сюда подставлять нельзя: она менялась бы на
 * каждом релизе независимо от содержимого, а ложный lastmod обесценивает тег
 * целиком — поисковик перестаёт доверять ему по всему сайту.
 *
 * Страницы без lastmod (`/`, `/directions/`, `/map/`) меняются вместе с выдачей,
 * там сигнал даёт changefreq.
 */
const STATIC_PAGES: {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/directions/", changefreq: "weekly", priority: "0.5" },
  { path: "/map/", changefreq: "weekly", priority: "0.5" },

  // 2026-08-27: убраны контактный телефон и реквизиты ИП.
  { path: "/about/", changefreq: "monthly", priority: "0.3", lastmod: "2026-08-27" },
  { path: "/contacts/", changefreq: "monthly", priority: "0.3", lastmod: "2026-08-27" },
  { path: "/owners/", changefreq: "monthly", priority: "0.4", lastmod: "2026-08-27" },
  { path: "/privacy/", changefreq: "yearly", priority: "0.1", lastmod: "2026-08-27" },
  { path: "/terms/", changefreq: "yearly", priority: "0.1", lastmod: "2026-08-27" },
  { path: "/rules/", changefreq: "yearly", priority: "0.1", lastmod: "2026-08-27" },
  { path: "/cookies/", changefreq: "yearly", priority: "0.1", lastmod: "2026-08-27" },
];

export async function GET() {
  return buildUrlset(
    STATIC_PAGES.map((p) => ({
      loc: `${SITE_URL}${p.path}`,
      lastmod: p.lastmod,
      changefreq: p.changefreq,
      priority: p.priority,
    }))
  );
}
