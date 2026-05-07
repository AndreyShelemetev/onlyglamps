"use client";

import { useEffect, useState } from "react";

const TABS: { id: string; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "amenities", label: "Удобства" },
  { id: "rules", label: "Правила" },
  { id: "location", label: "Как добраться" },
  { id: "tariffs", label: "Цены" },
  { id: "reviews", label: "Отзывы" },
  { id: "faq", label: "Вопросы" },
];

export function ObjectTabs({ available }: { available: Record<string, boolean> }) {
  const tabs = TABS.filter((t) => available[t.id]);
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "overview");

  useEffect(() => {
    if (tabs.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    tabs.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tabs]);

  if (tabs.length === 0) return null;

  return (
    <nav className="sticky top-16 z-20 -mx-4 sm:mx-0 mb-6 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="flex overflow-x-auto no-scrollbar px-4 sm:px-0 gap-1">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(t.id);
              if (!el) return;
              const y = el.getBoundingClientRect().top + window.scrollY - 100;
              window.scrollTo({ top: y, behavior: "smooth" });
              setActive(t.id);
            }}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              active === t.id
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
