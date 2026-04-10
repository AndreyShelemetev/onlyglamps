import { fetchArticles } from "@/lib/api";

const BASE_URL = "https://onlyglamps.ru";

export async function GET() {
  const { data: articles } = await fetchArticles(1, 10000);

  const urls: { loc: string; changefreq: string; priority: string }[] = [
    { loc: `${BASE_URL}/blog/`, changefreq: "daily", priority: "0.6" },
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
