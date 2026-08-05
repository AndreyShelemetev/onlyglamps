import { pagePath } from "@/lib/listing";

/** Номера страниц с многоточиями: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  const around = new Set<number>([1, total, current]);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i > 1 && i < total) around.add(i);
  }

  const sorted = Array.from(around)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) result.push("gap");
    result.push(n);
    previous = n;
  }
  return result;
}

/**
 * Пагинация листинга обычными ссылками — это единственный путь,
 * которым краулер добирается до карточек глубже первой страницы.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  query = "",
}: {
  basePath: string;
  page: number;
  totalPages: number;
  /** Строка активных фильтров вида `chan=1&sort=price_asc`, без `?`. */
  query?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (n: number) => `${pagePath(basePath, n)}${query ? `?${query}` : ""}`;
  const linkClass =
    "inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-lg border text-sm transition";

  return (
    <nav
      aria-label="Пагинация"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 && (
        <a
          href={href(page - 1)}
          rel="prev"
          className={`${linkClass} border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700`}
        >
          Назад
        </a>
      )}

      {pageWindow(page, totalPages).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-gray-400 select-none">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={`${linkClass} border-primary-600 bg-primary-600 font-semibold text-white`}
          >
            {item}
          </span>
        ) : (
          <a
            key={item}
            href={href(item)}
            className={`${linkClass} border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700`}
          >
            {item}
          </a>
        )
      )}

      {page < totalPages && (
        <a
          href={href(page + 1)}
          rel="next"
          className={`${linkClass} border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700`}
        >
          Вперёд
        </a>
      )}
    </nav>
  );
}
