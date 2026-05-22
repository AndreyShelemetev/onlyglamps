import { fetchRegions } from "@/lib/api";

const BASE_URL = "https://onlyglamps.ru";

export const dynamic = "force-dynamic";

export async function GET() {
  const regions = await fetchRegions();

  const urls: { loc: string; changefreq: string; priority: string }[] = [];

  for (const region of regions) {
    if (region.objectCount <= 0) continue;

    // /{region}/
    urls.push({ loc: `${BASE_URL}/${region.slug}/`, changefreq: "daily", priority: "0.8" });

    // /{region}/{city}/
    for (const city of region.cities.filter((c) => c.objectCount > 0)) {
      urls.push({ loc: `${BASE_URL}/${region.slug}/${city.slug}/`, changefreq: "daily", priority: "0.7" });

      // /{region}/{city}/{type}/
      for (const type of city.typeCounts) {
        urls.push({ loc: `${BASE_URL}/${region.slug}/${city.slug}/${type.slug}/`, changefreq: "weekly", priority: "0.6" });
      }
    }

    // /{region}/{type}/
    for (const type of region.typeCounts) {
      urls.push({ loc: `${BASE_URL}/${region.slug}/${type.slug}/`, changefreq: "weekly", priority: "0.7" });
    }
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
