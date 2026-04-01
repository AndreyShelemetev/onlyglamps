"use client";

import { CatalogOption } from "./types";

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  amenities: CatalogOption[];
}

export function BlockAmenities({ selectedIds, onChange, amenities }: Props) {
  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Удобства</h2>
      <p className="text-xs text-gray-500 mb-4">Выберите минимум 3 удобства</p>

      <div className="flex flex-wrap gap-2">
        {amenities.map((a) => {
          const active = selectedIds.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {a.icon && <span className="mr-1">{a.icon}</span>}
              {a.name}
            </button>
          );
        })}
      </div>

      {amenities.length === 0 && (
        <p className="text-sm text-gray-400">Удобства загружаются...</p>
      )}

      {selectedIds.length > 0 && selectedIds.length < 3 && (
        <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          Выбрано {selectedIds.length} из 3 минимальных
        </div>
      )}
    </section>
  );
}
