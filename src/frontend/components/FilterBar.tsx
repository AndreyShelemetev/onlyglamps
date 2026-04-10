"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListingMap } from "@/components/ListingMap";
import type { MapPoint } from "@/lib/api";

interface FilterBarProps {
  types: { id: number; name: string; slug: string }[];
  cities?: { id: number; name: string; slug: string }[];
  popularQueries?: { id: number; text: string; filterParam: string }[];
  basePath: string;
  activeType?: string;
  activeCity?: string;
  regionSlug: string;
  total: number;
  /** All prices for histogram (from mapPoints minPrice) */
  prices?: number[];
  /** Map points for mobile map modal */
  mapPoints?: MapPoint[];
}

const amenityFilters = [
  { param: "sauna", label: "С баней", icon: "🧖" },
  { param: "chan", label: "С чаном", icon: "🛁" },
  { param: "mangal", label: "С мангалом", icon: "🔥" },
  { param: "besedka", label: "С беседкой", icon: "🏡" },
  { param: "s-pitomtsami", label: "С питомцами", icon: "🐾" },
  { param: "s-detmi", label: "Для детей", icon: "👶" },
  { param: "parkovka", label: "Парковка", icon: "🅿️" },
  { param: "wifi", label: "Wi-Fi", icon: "📶" },
  { param: "u-vody", label: "У воды", icon: "🏊" },
  { param: "u-lesa", label: "У леса", icon: "🌲" },
  { param: "ves-obekt", label: "Весь объект", icon: "🏠" },
];

const sortOptions = [
  { value: "", label: "Рекомендации" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
  { value: "rating", label: "По рейтингу" },
  { value: "reviews", label: "По отзывам" },
  { value: "capacity", label: "По вместимости" },
];

const typeColors: Record<string, { active: string; inactive: string }> = {
  glempingi: {
    active: "bg-primary-600 text-white ring-2 ring-primary-300",
    inactive: "bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200",
  },
  "gostevye-doma": {
    active: "bg-blue-600 text-white ring-2 ring-blue-300",
    inactive: "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200",
  },
  bani: {
    active: "bg-red-600 text-white ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200",
  },
  kottedzhi: {
    active: "bg-orange-600 text-white ring-2 ring-orange-300",
    inactive: "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200",
  },
  "bazy-otdykha": {
    active: "bg-violet-600 text-white ring-2 ring-violet-300",
    inactive: "bg-violet-50 text-violet-800 hover:bg-violet-100 border border-violet-200",
  },
  "park-oteli": {
    active: "bg-amber-600 text-white ring-2 ring-amber-300",
    inactive: "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200",
  },
};

const defaultTypeColor = {
  active: "bg-gray-700 text-white ring-2 ring-gray-400",
  inactive: "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200",
};

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}

/* ---- Price histogram ---- */
function PriceHistogram({
  prices,
  from,
  to,
}: {
  prices: number[];
  from: string;
  to: string;
}) {
  const BINS = 20;
  const sorted = useMemo(() => [...prices].sort((a, b) => a - b), [prices]);
  if (sorted.length === 0) return null;

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return null;

  const step = (max - min) / BINS;
  const bins = Array.from({ length: BINS }, (_, i) => {
    const lo = min + step * i;
    const hi = min + step * (i + 1);
    return prices.filter((p) => (i === BINS - 1 ? p >= lo && p <= hi : p >= lo && p < hi)).length;
  });
  const maxBin = Math.max(...bins, 1);

  const fromVal = from ? Number(from) : min;
  const toVal = to ? Number(to) : max;

  return (
    <div className="flex items-end gap-px h-16 mt-2 mb-1">
      {bins.map((count, i) => {
        const lo = min + step * i;
        const hi = min + step * (i + 1);
        const midpoint = (lo + hi) / 2;
        const inRange = midpoint >= fromVal && midpoint <= toVal;

        return (
          <div
            key={i}
            className={`flex-1 rounded-t transition-colors ${
              inRange ? "bg-primary-500" : "bg-gray-200"
            }`}
            style={{ height: `${Math.max((count / maxBin) * 100, 4)}%` }}
          />
        );
      })}
    </div>
  );
}

/* ---- Close icon ---- */
function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export function FilterBar({
  types,
  cities,
  popularQueries,
  basePath,
  activeType,
  activeCity,
  regionSlug,
  total,
  prices = [],
  mapPoints = [],
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modalRef = useRef<HTMLDivElement>(null);

  const currentSort = searchParams.get("sort") || "";
  const currentPriceFrom = searchParams.get("price_from") || "";
  const currentPriceTo = searchParams.get("price_to") || "";
  const currentGuests = searchParams.get("guests") || "";

  const [modalOpen, setModalOpen] = useState(false);
  const [priceFrom, setPriceFrom] = useState(currentPriceFrom);
  const [priceTo, setPriceTo] = useState(currentPriceTo);
  const [guests, setGuests] = useState(currentGuests);
  const [draftAmenities, setDraftAmenities] = useState<Record<string, boolean>>({});

  // Sync draft amenities when modal opens
  useEffect(() => {
    if (modalOpen) {
      const draft: Record<string, boolean> = {};
      amenityFilters.forEach((a) => {
        if (searchParams.get(a.param) === "1") draft[a.param] = true;
      });
      setDraftAmenities(draft);
      setPriceFrom(currentPriceFrom);
      setPriceTo(currentPriceTo);
      setGuests(currentGuests);
    }
  }, [modalOpen, searchParams, currentPriceFrom, currentPriceTo, currentGuests]);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  const isAmenityActive = useCallback(
    (param: string) => searchParams.get(param) === "1",
    [searchParams]
  );

  const activeAmenities = amenityFilters.filter((a) => isAmenityActive(a.param));
  const filterCount =
    activeAmenities.length +
    (currentPriceFrom ? 1 : 0) +
    (currentPriceTo ? 1 : 0) +
    (currentGuests ? 1 : 0);

  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      return `${basePath}${qs ? `?${qs}` : ""}`;
    },
    [searchParams, basePath]
  );

  const setSort = (value: string) => {
    router.push(buildUrl({ sort: value || null }), { scroll: false });
  };

  const removeFilter = (param: string) => {
    router.push(buildUrl({ [param]: null }), { scroll: false });
  };

  const clearAllFilters = () => {
    router.push(basePath, { scroll: false });
  };

  const applyModal = () => {
    const updates: Record<string, string | null> = {
      price_from: priceFrom || null,
      price_to: priceTo || null,
      guests: guests || null,
    };
    amenityFilters.forEach((a) => {
      updates[a.param] = draftAmenities[a.param] ? "1" : null;
    });
    router.push(buildUrl(updates), { scroll: false });
    setModalOpen(false);
  };

  const clearModal = () => {
    setPriceFrom("");
    setPriceTo("");
    setGuests("");
    setDraftAmenities({});
  };

  const sortLabel = sortOptions.find((o) => o.value === currentSort)?.label || "Рекомендации";

  const [mapOpen, setMapOpen] = useState(false);

  // Close map modal on Escape
  useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mapOpen]);

  return (
    <>
      <div className="mb-5 space-y-3">
        {/* ── Row 1: Type pills ── */}
        {types.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 lg:hidden">Типы объектов</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {types.map((t) => {
              const isActive = activeType === t.slug;
              const colors = typeColors[t.slug] || defaultTypeColor;
              const href = isActive
                ? `/${regionSlug}/${activeCity ? activeCity + "/" : ""}`
                : activeCity
                ? `/${regionSlug}/${activeCity}/${t.slug}/`
                : `/${regionSlug}/${t.slug}/`;
              return (
                <a
                  key={t.id}
                  href={href}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition inline-flex items-center gap-1.5 ${
                    isActive ? colors.active : colors.inactive
                  }`}
                >
                  {t.name}
                  {isActive && <XIcon />}
                </a>
              );
            })}
          </div>
          </div>
        )}

        {/* ── Row 2: City pills ── */}
        {cities && cities.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 lg:hidden">Города, районы</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {cities.map((c) => {
              const isActive = activeCity === c.slug;
              const href = isActive
                ? `/${regionSlug}/${activeType ? activeType + "/" : ""}`
                : activeType
                ? `/${regionSlug}/${c.slug}/${activeType}/`
                : `/${regionSlug}/${c.slug}/`;
              return (
                <a
                  key={c.id}
                  href={href}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition inline-flex items-center gap-1.5 ${
                    isActive
                      ? "bg-navy-700 text-white font-semibold ring-2 ring-navy-400"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {c.name}
                  {isActive && <XIcon />}
                </a>
              );
            })}
          </div>
          </div>
        )}

        {/* ── Row 3: Sort (full-width on mobile) + Count ── */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
          {/* Sort */}
          <div className="relative flex-1 lg:flex-none">
            <select
              value={currentSort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none w-full lg:w-auto bg-transparent text-sm font-semibold text-gray-800 pr-7 cursor-pointer focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Count */}
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {total > 0
              ? `${total} ${pluralize(total, "объект", "объекта", "объектов")}`
              : "Не найдено"}
          </span>

          {/* Clear all */}
          {filterCount > 0 && (
            <>
              <div className="w-px h-6 bg-gray-200" />
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap transition"
              >
                Сбросить
              </button>
            </>
          )}
        </div>

        {/* ── Row 4: Active filter tags ── */}
        {(filterCount > 0 || (currentSort && currentSort !== "")) && (
          <div className="flex flex-wrap items-center gap-2">
            {currentPriceFrom && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
                от {Number(currentPriceFrom).toLocaleString("ru-RU")} ₽
                <button onClick={() => removeFilter("price_from")} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
              </span>
            )}
            {currentPriceTo && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
                до {Number(currentPriceTo).toLocaleString("ru-RU")} ₽
                <button onClick={() => removeFilter("price_to")} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
              </span>
            )}
            {currentGuests && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-full font-medium">
                от {currentGuests} гостей
                <button onClick={() => removeFilter("guests")} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
              </span>
            )}
            {activeAmenities.map((a) => (
              <span
                key={a.param}
                className="inline-flex items-center gap-1.5 text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded-full font-medium"
              >
                {amenityFilters.find((af) => af.param === a.param)?.icon}{" "}
                {a.label}
                <button onClick={() => removeFilter(a.param)} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* ── Row 5: Popular queries (desktop only, on mobile inside filter modal) ── */}
        {popularQueries && popularQueries.length > 0 && (
          <div className="hidden lg:flex flex-wrap gap-2">
            {popularQueries.map((q) => (
              <a
                key={q.id}
                href={`${basePath}?${q.filterParam}`}
                className="text-xs px-3 py-1.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200 hover:bg-amber-100 font-medium transition"
              >
                {q.text}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================
         FILTER MODAL (full-screen overlay)
         ================================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:items-center sm:pt-0">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <div
            ref={modalRef}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">Фильтры</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ── Price ── */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Цена за сутки</h3>
                {prices.length > 0 && (
                  <PriceHistogram prices={prices} from={priceFrom} to={priceTo} />
                )}
                <div className="flex gap-3 mt-2">
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">от</span>
                      <input
                        type="number"
                        value={priceFrom}
                        onChange={(e) => setPriceFrom(e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₽</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">до</span>
                      <input
                        type="number"
                        value={priceTo}
                        onChange={(e) => setPriceTo(e.target.value)}
                        placeholder="∞"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₽</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Guests ── */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Гостей</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests(String(Math.max(1, Number(guests || 1) - 1)))}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium transition"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    placeholder="Любое"
                    className="w-20 text-center border border-gray-200 rounded-xl py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                  />
                  <button
                    onClick={() => setGuests(String(Number(guests || 0) + 1))}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Amenities ── */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Удобства</h3>
                <div className="grid grid-cols-2 gap-2">
                  {amenityFilters.map((a) => {
                    const active = !!draftAmenities[a.param];
                    return (
                      <button
                        key={a.param}
                        onClick={() =>
                          setDraftAmenities((prev) => ({
                            ...prev,
                            [a.param]: !prev[a.param],
                          }))
                        }
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition text-left ${
                          active
                            ? "bg-primary-50 text-primary-800 border-2 border-primary-400 font-semibold"
                            : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-base">{a.icon}</span>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Popular queries (shown in modal on mobile) ── */}
              {popularQueries && popularQueries.length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Быстрые фильтры</h3>
                    <div className="flex flex-wrap gap-2">
                      {popularQueries.map((q) => (
                        <a
                          key={q.id}
                          href={`${basePath}?${q.filterParam}`}
                          onClick={() => setModalOpen(false)}
                          className="text-xs px-3 py-1.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200 hover:bg-amber-100 font-medium transition"
                        >
                          {q.text}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-3 rounded-b-2xl">
              <button
                onClick={clearModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition"
              >
                Сбросить всё
              </button>
              <button
                onClick={applyModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition shadow-sm"
              >
                Показать результаты
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
         STICKY BOTTOM BAR (mobile only)
         ================================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => setModalOpen(true)}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
            filterCount > 0
              ? "bg-primary-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Фильтры{filterCount > 0 ? ` (${filterCount})` : ""}
        </button>
        <button
          onClick={() => setMapOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white text-gray-800 border-2 border-gray-300 transition hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          На карте
        </button>
      </div>

      {/* ================================================================
         MAP MODAL (fullscreen, mobile)
         ================================================================ */}
      {mapOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-900">Карта объектов</h2>
            <button
              onClick={() => setMapOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          {/* Map container */}
          <div className="flex-1 relative">
            <ListingMap points={mapPoints} />
          </div>
        </div>
      )}
    </>
  );
}
