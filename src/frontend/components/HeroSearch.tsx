"use client";

import { useState } from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { DateRangePicker } from "./DateRangePicker";

interface RegionOption {
  name: string;
  slug: string;
}

interface SuggestItem {
  id: number;
  slug: string;
  region: { slug: string };
  cityOrDistrict: { slug: string };
}

export function HeroSearch({ regions = [] }: { regions?: RegionOption[] }) {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const buildQs = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const matchRegion = (q: string): RegionOption | null => {
    const norm = q.trim().toLowerCase();
    if (!norm) return null;
    return (
      regions.find((r) => r.name.toLowerCase() === norm) ||
      regions.find((r) => r.name.toLowerCase().includes(norm)) ||
      null
    );
  };

  const handleSearch = async () => {
    const trimmed = query.trim();

    // Empty query — scroll to regions/popular section instead of forcing a region.
    if (!trimmed) {
      if (typeof document !== "undefined") {
        const target = document.getElementById("regions");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      return;
    }

    // 1) Try region match locally (cheap, no extra request).
    const region = matchRegion(trimmed);
    if (region) {
      window.location.href = `/${region.slug}/${buildQs()}`;
      return;
    }

    // 2) Try suggest API → navigate to first object.
    setSearching(true);
    try {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: SuggestItem[] = await res.json();
        if (data.length > 0) {
          const first = data[0];
          window.location.href = `/${first.region.slug}/${first.cityOrDistrict.slug}/${first.slug}-${first.id}/${buildQs()}`;
          return;
        }
      }
    } catch {
      // ignore — fall through to fallback
    } finally {
      setSearching(false);
    }

    // 3) Fallback — direct user to regions index on the page.
    const target = document.getElementById("regions");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur rounded-2xl p-5 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-start">
        <SearchAutocomplete onQueryChange={setQuery} />
        <DateRangePicker
          onRangeChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="bg-accent-500 text-white rounded-xl px-6 py-3 font-semibold text-sm hover:bg-accent-600 transition whitespace-nowrap shadow-md disabled:opacity-60"
        >
          {searching ? "Ищем..." : "Найти"}
        </button>
      </div>
    </div>
  );
}
