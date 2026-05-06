"use client";

import { useEffect, useRef } from "react";

/**
 * Активирует аккордеоны вида .article-faq внутри произвольного HTML
 * (например, отрендеренного через dangerouslySetInnerHTML).
 *
 * До гидрации все ответы видны — это важно для SEO и для случая,
 * когда JS не загрузился. После монтирования компонент помечает
 * корневой узел `data-faq-hydrated`, и CSS прячет ответы у пунктов
 * без класса `is-open`.
 *
 * Использование:
 *   <ArticleFaqHydrator>
 *     <article dangerouslySetInnerHTML={...} />
 *   </ArticleFaqHydrator>
 */
export default function ArticleFaqHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.setAttribute("data-faq-hydrated", "true");

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest<HTMLButtonElement>(".article-faq__question");
      if (!btn || !root.contains(btn)) return;
      const item = btn.closest<HTMLElement>(".article-faq__item");
      if (!item) return;
      e.preventDefault();
      const isOpen = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    // Инициализация aria-атрибутов
    root.querySelectorAll<HTMLButtonElement>(".article-faq__question").forEach((btn) => {
      const item = btn.closest<HTMLElement>(".article-faq__item");
      const isOpen = item?.classList.contains("is-open") ?? false;
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  return <div ref={ref}>{children}</div>;
}
