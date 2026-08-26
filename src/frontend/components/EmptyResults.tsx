/**
 * Пустая выдача листинга.
 *
 * Один компонент на все точки входа: до этого одна и та же пара строк
 * была скопирована в ListingResults и ObjectGrid и оставляла пользователя
 * в тупике — без объяснения, что делать дальше, и без выхода из фильтров.
 */
export function EmptyResults({
  title = "Ничего не нашлось",
  hint = "Попробуйте расширить условия: другой город, тип размещения или более широкий диапазон цен.",
  resetHref,
}: {
  title?: string;
  hint?: string;
  /** Чистый URL листинга без GET-параметров. Показывается, только когда фильтры реально стоят. */
  resetHref?: string;
}) {
  return (
    <div className="py-12 px-4 text-center">
      <p className="text-lg font-semibold text-gray-900 text-balance">{title}</p>
      <p className="mx-auto mt-2 max-w-[60ch] text-sm text-gray-600 text-pretty">{hint}</p>
      {resetHref && (
        <a
          href={resetHref}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-[0.96]"
        >
          Сбросить фильтры
        </a>
      )}
    </div>
  );
}
