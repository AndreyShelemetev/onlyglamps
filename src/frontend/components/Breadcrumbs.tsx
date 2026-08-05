import { SITE_URL } from "@/lib/seo";

interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: `${SITE_URL}${item.url}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-4">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              {item.url ? (
                <a href={item.url} className="hover:text-primary-700 transition">
                  {item.name}
                </a>
              ) : (
                <span className="text-gray-900">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
