"use client";

import { ObjectFormData } from "./types";

interface Props {
  data: ObjectFormData;
  onChange: (patch: Partial<ObjectFormData>) => void;
}

export function BlockSource({ data, onChange }: Props) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Внешний источник</h2>
      <p className="text-xs text-gray-500 mb-4">Если объект размещён на другой площадке. Кнопка «Посмотреть» появится на карточке.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название источника</label>
          <input
            type="text"
            value={data.sourceName}
            onChange={(e) => onChange({ sourceName: e.target.value })}
            placeholder="Авито, Суточно и т.д."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL источника</label>
          <input
            type="url"
            value={data.sourceUrl}
            onChange={(e) => onChange({ sourceUrl: e.target.value })}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип источника</label>
          <select
            value={data.sourceType}
            onChange={(e) => onChange({ sourceType: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="">— Не указан —</option>
            <option value="avito">Авито</option>
            <option value="booking">Booking</option>
            <option value="sutochno">Суточно.ру</option>
            <option value="website">Сайт</option>
            <option value="other">Другое</option>
          </select>
        </div>
      </div>
    </section>
  );
}
