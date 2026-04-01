"use client";

import { useState } from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { DateRangePicker } from "./DateRangePicker";

export function HeroSearch() {
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    window.location.href = `/mari-el/${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur rounded-2xl p-5 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-start">
        <SearchAutocomplete />
        <DateRangePicker
          onRangeChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
        <button
          onClick={handleSearch}
          className="bg-accent-500 text-white rounded-xl px-6 py-3 font-semibold text-sm hover:bg-accent-600 transition whitespace-nowrap shadow-md"
        >
          Найти
        </button>
      </div>
    </div>
  );
}
