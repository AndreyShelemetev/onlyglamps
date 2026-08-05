import { fetchRegions } from "@/lib/api";
import { SITE_URL, buildUrlset, type SitemapUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const regions = await fetchRegions();
  const urls: SitemapUrl[] = [];

  for (const region of regions) {
    if (region.objectCount <= 0) continue;

    // /{region}/
    urls.push({ loc: `${SITE_URL}/${region.slug}/`, changefreq: "daily", priority: "0.8" });

    // /{region}/{city}/ и /{region}/{city}/{type}/
    for (const city of region.cities.filter((c) => c.objectCount > 0)) {
      urls.push({
        loc: `${SITE_URL}/${region.slug}/${city.slug}/`,
        changefreq: "daily",
        priority: "0.7",
      });

      for (const type of city.typeCounts) {
        urls.push({
          loc: `${SITE_URL}/${region.slug}/${city.slug}/${type.slug}/`,
          changefreq: "weekly",
          priority: "0.6",
        });
      }
    }

    // /{region}/{type}/
    for (const type of region.typeCounts) {
      urls.push({
        loc: `${SITE_URL}/${region.slug}/${type.slug}/`,
        changefreq: "weekly",
        priority: "0.7",
      });
    }
  }

  return buildUrlset(urls);
}
