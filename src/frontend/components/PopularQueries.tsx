import { PopularQueryItem } from "@/lib/api";

interface Props {
  queries: PopularQueryItem[];
  basePath: string;
}

export function PopularQueries({ queries, basePath }: Props) {
  if (queries.length === 0) return null;

  return (
    <section className="mt-8">
      <h3 className="text-lg font-semibold mb-3">Популярные запросы</h3>
      <div className="flex flex-wrap gap-2">
        {queries.map((q) => (
          <a
            key={q.id}
            href={`${basePath}?${q.filterParam}`}
            className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition border border-gray-200"
          >
            {q.text}
          </a>
        ))}
      </div>
    </section>
  );
}
