import { fetchArticles, fetchObjects } from "@/lib/api";
import {
  SITE_URL,
  SITEMAP_BLOG_PAGE_SIZE,
  SITEMAP_OBJECTS_PAGE_SIZE,
  buildSitemapIndex,
} from "@/lib/seo";

function pagedSitemaps(name: string, totalItems: number, pageSize: number): string[] {
  const pages = Math.max(1, Math.ceil((totalItems || 0) / pageSize));
  return Array.from(
    { length: pages },
    (_, i) => `${SITE_URL}/${name}${i === 0 ? "" : `?page=${i + 1}`}`
  );
}

export async function GET() {
  const [objectsMeta, articlesMeta] = await Promise.all([
    fetchObjects({ page: "1", pageSize: "1" }),
    fetchArticles(1, 1),
  ]);

  return buildSitemapIndex([
    `${SITE_URL}/sitemap-main.xml`,
    `${SITE_URL}/sitemap-regions.xml`,
    ...pagedSitemaps("sitemap-objects.xml", objectsMeta.total, SITEMAP_OBJECTS_PAGE_SIZE),
    ...pagedSitemaps("sitemap-blog.xml", articlesMeta.total, SITEMAP_BLOG_PAGE_SIZE),
  ]);
}
