"use client";

import { useState, useEffect } from "react";

interface Heading {
  id: string;
  text: string;
}

export default function ArticleSidebar({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="sticky top-24">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Содержание
      </p>
      <nav className="space-y-1 border-l-2 border-gray-200">
        {headings.map((h) => (
          <button
            key={h.id}
            onClick={() => scrollTo(h.id)}
            className={`block w-full text-left pl-4 py-1.5 text-sm transition-all border-l-2 -ml-[2px] ${
              activeId === h.id
                ? "border-primary-500 text-primary-600 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {h.text}
          </button>
        ))}
      </nav>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="mt-5 w-10 h-10 bg-primary-600 text-white rounded-full shadow-md flex items-center justify-center hover:bg-primary-700 transition-all duration-200 hover:scale-105"
          aria-label="Наверх"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
