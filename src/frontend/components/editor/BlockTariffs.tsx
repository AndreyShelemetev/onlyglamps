"use client";

import { TariffItem } from "./types";

interface Props {
  tariffs: TariffItem[];
  onChange: (tariffs: TariffItem[]) => void;
}

export function BlockTariffs({ tariffs, onChange }: Props) {
  function addTariff() {
    onChange([...tariffs, { name: "", price: 0, description: "", isActive: true }]);
  }

  function updateTariff(idx: number, patch: Partial<TariffItem>) {
    const next = tariffs.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    onChange(next);
  }

  function removeTariff(idx: number) {
    onChange(tariffs.filter((_, i) => i !== idx));
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Тарифы и цены</h2>
          <p className="text-xs text-gray-500">Минимум 1 активный тариф для модерации</p>
        </div>
        <button
          type="button"
          onClick={addTariff}
          className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          + Добавить тариф
        </button>
      </div>

      {tariffs.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Нет тарифов. Добавьте первый тариф.
        </div>
      ) : (
        <div className="space-y-3">
          {tariffs.map((t, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Название тарифа <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => updateTariff(idx, { name: e.target.value })}
                    placeholder="Дом целиком"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Цена за сутки, ₽ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={t.price || ""}
                    onChange={(e) => updateTariff(idx, { price: Number(e.target.value) || 0 })}
                    placeholder="5000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) => updateTariff(idx, { description: e.target.value })}
                    placeholder="До 6 гостей, баня включена"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={t.isActive}
                    onChange={(e) => updateTariff(idx, { isActive: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Активен
                </label>
                <button
                  type="button"
                  onClick={() => removeTariff(idx)}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  Удалить тариф
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
