import { SITE_URL, buildUrlset } from "@/lib/seo";

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/directions/", changefreq: "weekly", priority: "0.5" },
  { path: "/map/", changefreq: "weekly", priority: "0.5" },
  { path: "/about/", changefreq: "monthly", priority: "0.3" },
  { path: "/contacts/", changefreq: "monthly", priority: "0.3" },
  { path: "/owners/", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy/", changefreq: "yearly", priority: "0.1" },
  { path: "/terms/", changefreq: "yearly", priority: "0.1" },
  { path: "/rules/", changefreq: "yearly", priority: "0.1" },
  { path: "/cookies/", changefreq: "yearly", priority: "0.1" },
];

export async function GET() {
  return buildUrlset(
    STATIC_PAGES.map((p) => ({
      loc: `${SITE_URL}${p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
    }))
  );
}
