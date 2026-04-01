"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SuggestItem {
  id: number;
  name: string;
  slug: string;
  objectType: { name: string; slug: string };
  region: { name: string; slug: string };
  cityOrDistrict: { name: string; slug: string };
  rating: number | null;
  reviewCount: number;
  amenities: { name: string; icon: string | null }[];
  mainPhotoUrl: string | null;
  minPrice: number | null;
}

const typeIcons: Record<string, JSX.Element> = {
  glempingi: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 20h20L12 2z" strokeLinejoin="round" />
      <path d="M12 20V10" strokeLinecap="round" />
      <path d="M9 20l3-6 3 6" strokeLinejoin="round" />
    </svg>
  ),
  "gostevye-doma": (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 21V9l9-7 9 7v12a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinejoin="round" />
      <path d="M9 21v-8h6v8" strokeLinejoin="round" />
    </svg>
  ),
  bani: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="10" width="20" height="12" rx="1" strokeLinejoin="round" />
      <path d="M4 10V7a1 1 0 011-1h14a1 1 0 011 1v3" strokeLinejoin="round" />
      <path d="M8 2c0 2 2 3 2 4" strokeLinecap="round" />
      <path d="M12 2c0 2 2 3 2 4" strokeLinecap="round" />
      <path d="M16 2c0 2 2 3 2 4" strokeLinecap="round" />
      <path d="M7 15h10" strokeLinecap="round" />
      <path d="M7 18h10" strokeLinecap="round" />
    </svg>
  ),
};

function getTypeIcon(slug: string) {
  return typeIcons[slug] || typeIcons["gostevye-doma"];
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} отзыва`;
  return `${n} отзывов`;
}

export function SearchAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const navigateToObject = (item: SuggestItem) => {
    const url = `/${item.region.slug}/${item.cityOrDistrict.slug}/${item.slug}-${item.id}/`;
    window.location.href = url;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigateToObject(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Куда? Например: баня, глэмпинг, Казань..."
          className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {results.map((item, index) => (
            <button
              key={item.id}
              onClick={() => navigateToObject(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-primary-50
                ${activeIndex === index ? "bg-primary-50" : ""}`}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                {getTypeIcon(item.objectType.slug)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">
                  {item.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px] font-medium">
                    {item.objectType.name}
                  </span>
                  <span>{item.cityOrDistrict.name}, {item.region.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {item.rating != null && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <svg className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-medium text-gray-700">{item.rating}</span>
                      <span className="text-gray-400">({pluralReviews(item.reviewCount)})</span>
                    </span>
                  )}
                  {item.minPrice != null && (
                    <span className="text-xs text-gray-500">
                      от {item.minPrice.toLocaleString("ru-RU")} ₽
                    </span>
                  )}
                </div>
                {item.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.amenities.map((a) => (
                      <span key={a.name} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
