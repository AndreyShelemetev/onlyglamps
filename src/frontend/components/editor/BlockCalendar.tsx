"use client";

import { useState, useMemo } from "react";
import { CalendarItem } from "./types";

interface Props {
  calendar: CalendarItem[];
  onChange: (calendar: CalendarItem[]) => void;
}

const STATUS_OPTIONS = [
  { value: "Available", label: "Свободно", color: "bg-green-200 text-green-800" },
  { value: "Booked", label: "Занято", color: "bg-red-200 text-red-800" },
  { value: "OnRequest", label: "По запросу", color: "bg-yellow-200 text-yellow-800" },
];

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function BlockCalendar({ calendar, onChange }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const maxDate = useMemo(() => addDays(today, 90), [today]);

  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [brushStatus, setBrushStatus] = useState<string>("Available");
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);

  const calMap = useMemo(() => {
    const m: Record<string, string> = {};
    calendar.forEach((c) => { m[c.date] = c.status; });
    return m;
  }, [calendar]);

  // Generate days for current month view
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Offset: Monday = 0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: { date: Date; dateStr: string; inMonth: boolean; disabled: boolean }[] = [];

    // Empty slots
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, 1 - startOffset + i);
      days.push({ date: d, dateStr: toDateStr(d), inMonth: false, disabled: true });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = toDateStr(date);
      const disabled = date < today || date > maxDate;
      days.push({ date, dateStr, inMonth: true, disabled });
    }

    return days;
  }, [currentMonth, today, maxDate]);

  function prevMonth() {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prev.getFullYear() >= today.getFullYear() && prev.getMonth() >= today.getMonth()) {
      setCurrentMonth(prev);
    }
  }

  function nextMonth() {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= maxDate) {
      setCurrentMonth(next);
    }
  }

  function toggleDay(dateStr: string) {
    if (calMap[dateStr] === brushStatus) {
      // Remove
      onChange(calendar.filter((c) => c.date !== dateStr));
    } else {
      const next = calendar.filter((c) => c.date !== dateStr);
      next.push({ date: dateStr, status: brushStatus });
      onChange(next);
    }
  }

  function applyRange() {
    if (!selStart || !selEnd) return;
    const start = new Date(selStart);
    const end = new Date(selEnd);
    if (start > end) return;

    const newEntries: CalendarItem[] = [...calendar];
    let d = new Date(start);
    while (d <= end && d <= maxDate) {
      const ds = toDateStr(d);
      if (d >= today) {
        const idx = newEntries.findIndex((c) => c.date === ds);
        if (idx >= 0) {
          newEntries[idx] = { date: ds, status: brushStatus };
        } else {
          newEntries.push({ date: ds, status: brushStatus });
        }
      }
      d = addDays(d, 1);
    }
    onChange(newEntries);
    setSelStart(null);
    setSelEnd(null);
  }

  function clearRange() {
    if (!selStart || !selEnd) return;
    const start = new Date(selStart);
    const end = new Date(selEnd);
    onChange(calendar.filter((c) => {
      const d = new Date(c.date);
      return d < start || d > end;
    }));
    setSelStart(null);
    setSelEnd(null);
  }

  const statusInfo = STATUS_OPTIONS.find((s) => s.value === brushStatus)!;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Календарь доступности</h2>
      <p className="text-xs text-gray-500 mb-4">Обязателен для публикации. Максимум 90 дней вперёд.</p>

      {/* Brush selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Кисть:</span>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setBrushStatus(s.value)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              brushStatus === s.value
                ? s.color + " border-current font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Range fill */}
      <div className="flex flex-wrap items-end gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs text-gray-500 mb-1">От</label>
          <input
            type="date"
            value={selStart || ""}
            min={toDateStr(today)}
            max={toDateStr(maxDate)}
            onChange={(e) => setSelStart(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">До</label>
          <input
            type="date"
            value={selEnd || ""}
            min={selStart || toDateStr(today)}
            max={toDateStr(maxDate)}
            onChange={(e) => setSelEnd(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyRange}
          disabled={!selStart || !selEnd}
          className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg disabled:opacity-40 hover:bg-primary-700 transition"
        >
          Заполнить «{statusInfo.label}»
        </button>
        <button
          type="button"
          onClick={clearRange}
          disabled={!selStart || !selEnd}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition"
        >
          Очистить диапазон
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="text-gray-500 hover:text-gray-700 px-2 py-1">←</button>
        <span className="text-sm font-medium text-gray-800">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button type="button" onClick={nextMonth} className="text-gray-500 hover:text-gray-700 px-2 py-1">→</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day, i) => {
          if (!day.inMonth) {
            return <div key={i} className="aspect-square" />;
          }

          const status = calMap[day.dateStr];
          const statusOpt = STATUS_OPTIONS.find((s) => s.value === status);
          let cellClass = "aspect-square flex items-center justify-center text-xs rounded cursor-pointer transition ";

          if (day.disabled) {
            cellClass += "text-gray-300 bg-gray-50 cursor-not-allowed";
          } else if (statusOpt) {
            cellClass += statusOpt.color + " font-medium hover:opacity-80";
          } else {
            cellClass += "text-gray-700 bg-white border border-gray-100 hover:bg-gray-100";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={day.disabled}
              onClick={() => !day.disabled && toggleDay(day.dateStr)}
              className={cellClass}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${s.color.split(" ")[0]}`} />
            {s.label}
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          Не указано
        </div>
      </div>

      {calendar.length === 0 && (
        <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          Заполните календарь для отправки на модерацию
        </div>
      )}
    </section>
  );
}
