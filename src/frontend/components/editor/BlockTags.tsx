"use client";

import { CatalogOption } from "./types";

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  tags: CatalogOption[];
}

export function BlockTags({ selectedIds, onChange, tags }: Props) {
  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Теги</h2>
      <p className="text-xs text-gray-500 mb-4">Быстрые характеристики для навигации и фильтров</p>

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => {
          const active = selectedIds.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      {tags.length === 0 && (
        <p className="text-sm text-gray-400">Теги загружаются...</p>
      )}
    </section>
  );
}
