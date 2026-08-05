import { fetchObjects } from "@/lib/api";
import {
  SITE_URL,
  SITEMAP_OBJECTS_PAGE_SIZE,
  buildUrlset,
  getSitemapPage,
  toLastmod,
} from "@/lib/seo";

export async function GET(request: Request) {
  const page = getSitemapPage(request);

  const { data: objects, total } = await fetchObjects({
    page: String(page),
    pageSize: String(SITEMAP_OBJECTS_PAGE_SIZE),
  });

  const totalPages = Math.max(1, Math.ceil((total || 0) / SITEMAP_OBJECTS_PAGE_SIZE));
  if (page > totalPages) {
    return new Response("Not found", { status: 404 });
  }

  return buildUrlset(
    objects.map((obj) => ({
      loc: `${SITE_URL}/${obj.region.slug}/${obj.cityOrDistrict.slug}/${obj.slug}-${obj.id}/`,
      lastmod: toLastmod(obj.updatedAt),
      changefreq: "weekly",
      priority: "0.9",
    }))
  );
}
