import { fetchArticles } from "@/lib/api";

const BASE_URL = "https://onlyglamps.ru";
const SITEMAP_PAGE_SIZE = 5000;

function getPageFromRequest(request: Request): number {
  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get("page") || "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

export async function GET(request: Request) {
  const page = getPageFromRequest(request);
  const meta = await fetchArticles(1, 1);
  const total = meta.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / SITEMAP_PAGE_SIZE));

  if (page > totalPages) {
    return new Response("Not found", { status: 404 });
  }

  const { data: articles } = await fetchArticles(page, SITEMAP_PAGE_SIZE);

  const urls: { loc: string; changefreq: string; priority: string }[] = [
    ...(page === 1 ? [{ loc: `${BASE_URL}/blog/`, changefreq: "daily", priority: "0.6" }] : []),
  ];

  for (const article of articles) {
    urls.push({
      loc: `${BASE_URL}/blog/${article.slug}/`,
      changefreq: "monthly",
      priority: "0.5",
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
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
