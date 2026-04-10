const BASE_URL = "https://onlyglamps.ru";

export async function GET() {
  const sitemaps = [
    "sitemap-main.xml",
    "sitemap-regions.xml",
    "sitemap-objects.xml",
    "sitemap-blog.xml",
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${BASE_URL}/${s}</loc>
  </sitemap>`).join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
