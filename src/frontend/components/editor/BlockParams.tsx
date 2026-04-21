"use client";

import { ObjectFormData } from "./types";

interface Props {
  data: ObjectFormData;
  onChange: (patch: Partial<ObjectFormData>) => void;
  disabledKeys?: string[];
}

export function BlockParams({ data, onChange, disabledKeys }: Props) {
  const disabled = new Set(disabledKeys || []);
  const show = (key: string) => !disabled.has(key);
  const anyCheckbox = ["isWhole", "childrenAllowed", "petsAllowed", "smokingAllowed", "eventsAllowed"].some(show);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Параметры объекта</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {show("capacity") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Вместимость гостей <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={data.capacity}
            onChange={(e) => onChange({ capacity: Number(e.target.value) || 1 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("beds") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Спальных мест <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={data.beds ?? ""}
            onChange={(e) => onChange({ beds: e.target.value ? Number(e.target.value) : null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("rooms") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Комнат</label>
          <input
            type="number"
            min={0}
            value={data.rooms ?? ""}
            onChange={(e) => onChange({ rooms: e.target.value ? Number(e.target.value) : null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("area") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Площадь, м²</label>
          <input
            type="number"
            min={0}
            step="any"
            value={data.area ?? ""}
            onChange={(e) => onChange({ area: e.target.value ? Number(e.target.value) : null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("minRentalDays") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Мин. срок аренды (дней)</label>
          <input
            type="number"
            min={1}
            value={data.minRentalDays ?? ""}
            onChange={(e) => onChange({ minRentalDays: e.target.value ? Number(e.target.value) : null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("maxRentalDays") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Макс. срок аренды (дней)</label>
          <input
            type="number"
            min={1}
            value={data.maxRentalDays ?? ""}
            onChange={(e) => onChange({ maxRentalDays: e.target.value ? Number(e.target.value) : null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("checkInTime") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Время заезда</label>
          <input
            type="time"
            value={data.checkInTime}
            onChange={(e) => onChange({ checkInTime: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("checkOutTime") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Время выезда</label>
          <input
            type="time"
            value={data.checkOutTime}
            onChange={(e) => onChange({ checkOutTime: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {/* Checkboxes */}
        {anyCheckbox && (
        <div className="col-span-2 md:col-span-3">
          <div className="flex flex-wrap gap-4 mt-2">
            {show("isWhole") && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.isWhole}
                onChange={(e) => onChange({ isWhole: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Можно снять целиком
            </label>
            )}
            {show("childrenAllowed") && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.childrenAllowed}
                onChange={(e) => onChange({ childrenAllowed: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Можно с детьми
            </label>
            )}
            {show("petsAllowed") && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.petsAllowed}
                onChange={(e) => onChange({ petsAllowed: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Можно с питомцами
            </label>
            )}
            {show("smokingAllowed") && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.smokingAllowed}
                onChange={(e) => onChange({ smokingAllowed: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Можно курить
            </label>
            )}
            {show("eventsAllowed") && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.eventsAllowed}
                onChange={(e) => onChange({ eventsAllowed: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Можно мероприятия
            </label>
            )}
          </div>
        </div>
        )}

        {show("deposit") && (
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Залог / депозит</label>
          <input
            type="text"
            value={data.deposit}
            onChange={(e) => onChange({ deposit: e.target.value })}
            placeholder="Например: 5000 ₽"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        )}

        {show("rules") && (
        <div className="col-span-2 md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Правила проживания</label>
          <textarea
            value={data.rules}
            onChange={(e) => onChange({ rules: e.target.value })}
            placeholder="Особые правила для гостей"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          />
        </div>
        )}
      </div>
    </section>
  );
}
