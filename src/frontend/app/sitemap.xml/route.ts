import { fetchArticles, fetchObjects } from "@/lib/api";

const BASE_URL = "https://onlyglamps.ru";
const SITEMAP_PAGE_SIZE = 5000;

export async function GET() {
  const [objectsMeta, articlesMeta] = await Promise.all([
    fetchObjects({ page: "1", pageSize: "1" }),
    fetchArticles(1, 1),
  ]);

  const objectPages = Math.max(1, Math.ceil((objectsMeta.total || 0) / SITEMAP_PAGE_SIZE));
  const articlePages = Math.max(1, Math.ceil((articlesMeta.total || 0) / SITEMAP_PAGE_SIZE));

  const sitemaps = [
    `${BASE_URL}/sitemap-main.xml`,
    `${BASE_URL}/sitemap-regions.xml`,
    ...Array.from({ length: objectPages }, (_, i) => `${BASE_URL}/sitemap-objects.xml${i === 0 ? "" : `?page=${i + 1}`}`),
    ...Array.from({ length: articlePages }, (_, i) => `${BASE_URL}/sitemap-blog.xml${i === 0 ? "" : `?page=${i + 1}`}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${s}</loc>
  </sitemap>`).join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
