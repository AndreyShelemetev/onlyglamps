import { fetchObjects } from "@/lib/api";

const BASE_URL = "https://onlyglamps.ru";
const SITEMAP_PAGE_SIZE = 100;

function getPageFromRequest(request: Request): number {
  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get("page") || "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

export async function GET(request: Request) {
  const page = getPageFromRequest(request);
  const meta = await fetchObjects({ page: "1", pageSize: "1" });
  const total = meta.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / SITEMAP_PAGE_SIZE));

  if (page > totalPages) {
    return new Response("Not found", { status: 404 });
  }

  const { data: objects } = await fetchObjects({
    page: String(page),
    pageSize: String(SITEMAP_PAGE_SIZE),
  });

  const urls = objects.map((obj) => ({
    loc: `${BASE_URL}/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`,
    changefreq: "weekly",
    priority: "0.9",
    lastmod: new Date(obj.updatedAt).toISOString(),
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
