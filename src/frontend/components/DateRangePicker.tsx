"use client";

import { useState, useRef, useEffect } from "react";

interface DateRangePickerProps {
  onRangeChange?: (from: string | null, to: string | null) => void;
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()].slice(0, 3).toLowerCase()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday first
}

export function DateRangePicker({ onRangeChange }: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month);

  // Second month
  const nextMonth = new Date(year, month + 1, 1);
  const year2 = nextMonth.getFullYear();
  const month2 = nextMonth.getMonth();
  const daysInMonth2 = getDaysInMonth(year2, month2);
  const firstDayOffset2 = getFirstDayOfWeek(year2, month2);

  const handleDayClick = (d: Date) => {
    if (d < today) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(d);
      setEndDate(null);
      onRangeChange?.(formatDateISO(d), null);
    } else {
      if (d < startDate) {
        setStartDate(d);
        setEndDate(null);
        onRangeChange?.(formatDateISO(d), null);
      } else {
        setEndDate(d);
        onRangeChange?.(formatDateISO(startDate), formatDateISO(d));
        setIsOpen(false);
      }
    }
  };

  const isInRange = (d: Date) => {
    if (!startDate) return false;
    const end = endDate || hoverDate;
    if (!end) return false;
    const [from, to] = end >= startDate ? [startDate, end] : [end, startDate];
    return d >= from && d <= to;
  };

  const isStart = (d: Date) => startDate && sameDay(d, startDate);
  const isEnd = (d: Date) => endDate ? sameDay(d, endDate) : hoverDate ? sameDay(d, hoverDate) && d >= (startDate || d) : false;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayText = startDate
    ? endDate
      ? `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`
      : formatDateShort(startDate)
    : "";

  function renderMonth(yr: number, mo: number, days: number, offset: number) {
    const cells: JSX.Element[] = [];
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`pad-${i}`} />);
    }
    for (let d = 1; d <= days; d++) {
      const date = new Date(yr, mo, d);
      const isPast = date < today;
      const inRange = isInRange(date);
      const start = isStart(date);
      const end = isEnd(date);

      cells.push(
        <button
          key={d}
          type="button"
          disabled={isPast}
          onClick={() => handleDayClick(date)}
          onMouseEnter={() => startDate && !endDate && setHoverDate(date)}
          className={`
            w-9 h-9 text-sm rounded-full flex items-center justify-center transition-colors
            ${isPast ? "text-gray-400 cursor-default" : "hover:bg-primary-100 cursor-pointer text-gray-800"}
            ${inRange && !start && !end ? "bg-primary-100 text-primary-900 font-medium" : ""}
            ${start || end ? "bg-primary-600 text-white font-semibold" : ""}
            ${sameDay(date, today) && !start && !end ? "ring-2 ring-primary-500 font-bold" : ""}
          `}
        >
          {d}
        </button>
      );
    }
    return cells;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-left flex items-center gap-2 hover:border-primary-400 transition"
      >
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <span className={displayText ? "text-gray-900" : "text-gray-500"}>
          {displayText || "Заезд — Выезд"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 w-max">
          <div className="flex gap-6">
            {/* Month 1 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(year, month - 1, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-900">
                  {MONTHS_RU[month]} {year}
                </span>
                <div className="w-6" />
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS_RU.map((wd) => (
                  <div key={wd} className="w-9 h-7 text-[11px] text-gray-400 flex items-center justify-center font-medium">
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setHoverDate(null)}>
                {renderMonth(year, month, daysInMonth, firstDayOffset)}
              </div>
            </div>

            {/* Month 2 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-6" />
                <span className="text-sm font-semibold text-gray-900">
                  {MONTHS_RU[month2]} {year2}
                </span>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(year, month + 1, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS_RU.map((wd) => (
                  <div key={wd} className="w-9 h-7 text-[11px] text-gray-400 flex items-center justify-center font-medium">
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setHoverDate(null)}>
                {renderMonth(year2, month2, daysInMonth2, firstDayOffset2)}
              </div>
            </div>
          </div>

          {startDate && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {startDate && endDate
                  ? `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`
                  : "Выберите дату выезда"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  onRangeChange?.(null, null);
                }}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Сбросить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
