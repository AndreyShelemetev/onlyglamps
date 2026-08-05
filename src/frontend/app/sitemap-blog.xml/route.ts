import { fetchArticles } from "@/lib/api";
import {
  SITE_URL,
  SITEMAP_BLOG_PAGE_SIZE,
  buildUrlset,
  getSitemapPage,
  type SitemapUrl,
} from "@/lib/seo";

export async function GET(request: Request) {
  const page = getSitemapPage(request);
  const { data: articles, total } = await fetchArticles(page, SITEMAP_BLOG_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil((total || 0) / SITEMAP_BLOG_PAGE_SIZE));
  if (page > totalPages) {
    return new Response("Not found", { status: 404 });
  }

  const urls: SitemapUrl[] = [
    ...(page === 1
      ? [{ loc: `${SITE_URL}/blog/`, changefreq: "daily", priority: "0.6" }]
      : []),
    ...articles.map((article) => ({
      loc: `${SITE_URL}/blog/${article.slug}/`,
      changefreq: "monthly",
      priority: "0.5",
    })),
  ];

  return buildUrlset(urls);
}
