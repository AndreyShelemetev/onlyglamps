const BASE_URL = "https://onlyglamps.ru";

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about/", changefreq: "monthly", priority: "0.3" },
  { path: "/contacts/", changefreq: "monthly", priority: "0.3" },
  { path: "/directions/", changefreq: "weekly", priority: "0.5" },
  { path: "/owners/", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy/", changefreq: "yearly", priority: "0.1" },
  { path: "/terms/", changefreq: "yearly", priority: "0.1" },
  { path: "/rules/", changefreq: "yearly", priority: "0.1" },
  { path: "/cookies/", changefreq: "yearly", priority: "0.1" },
];

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(
  (p) => `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
