"use client";

import { useState, ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export function Tabs({ tabs, initial }: { tabs: TabItem[]; initial?: string }) {
  const visible = tabs.filter((t) => t.content);
  const [active, setActive] = useState<string>(initial && visible.find((t) => t.id === initial) ? initial : visible[0]?.id);
  if (visible.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4 -mx-1 px-1 no-scrollbar">
        {visible.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={
                "shrink-0 px-4 py-2.5 text-sm font-medium transition relative whitespace-nowrap " +
                (isActive
                  ? "text-primary-700"
                  : "text-gray-500 hover:text-gray-800")
              }
            >
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">{t.count}</span>
              )}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div>{visible.find((t) => t.id === active)?.content}</div>
    </div>
  );
}

export function Accordion({
  items,
  defaultOpenId,
}: {
  items: { id: string | number; question: string; answer: ReactNode }[];
  defaultOpenId?: string | number | null;
}) {
  const [openId, setOpenId] = useState<string | number | null>(
    defaultOpenId === undefined ? items[0]?.id ?? null : defaultOpenId,
  );
  if (items.length === 0) return null;
  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
      {items.map((it) => {
        const isOpen = openId === it.id;
        return (
          <div key={it.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : it.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
            >
              <span>{it.question}</span>
              <svg
                className={
                  "h-4 w-4 flex-shrink-0 text-gray-400 transition-transform " +
                  (isOpen ? "rotate-180" : "")
                }
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-0 text-sm leading-relaxed text-gray-700">
                {it.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
