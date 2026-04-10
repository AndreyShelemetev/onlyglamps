import { fetchObjects } from "@/lib/api";

const BASE_URL = "https://onlyglamps.ru";

export async function GET() {
  // Fetch all objects (large pageSize to get everything)
  const { data: objects } = await fetchObjects({ pageSize: "10000" });

  const urls = objects.map((obj) => ({
    loc: `${BASE_URL}/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}/`,
    changefreq: "weekly",
    priority: "0.9",
  }));

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
