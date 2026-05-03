"use client";

import { useEffect, useState } from "react";
import { ObjectFormData, RegionOption, CatalogOption } from "./types";

interface Props {
  data: ObjectFormData;
  onChange: (patch: Partial<ObjectFormData>) => void;
  regions: RegionOption[];
  types: CatalogOption[];
  cities: { id: number; name: string; slug: string; regionId: number }[];
}

export function BlockBasicInfo({ data, onChange, regions, types, cities }: Props) {
  const filteredCities = cities.filter((c) => c.regionId === data.regionId);
  const [coordinatesInput, setCoordinatesInput] = useState("");
  const [coordinatesError, setCoordinatesError] = useState("");

  useEffect(() => {
    if (data.latitude == null || data.longitude == null) {
      setCoordinatesInput("");
      return;
    }
    setCoordinatesInput(`${data.latitude}, ${data.longitude}`);
  }, [data.latitude, data.longitude]);

  function applyCoordinates(rawValue: string): boolean {
    const normalized = rawValue.trim().replace(";", ",");
    if (!normalized) {
      onChange({ latitude: null, longitude: null });
      setCoordinatesError("");
      return true;
    }

    const parts = normalized.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 2) {
      setCoordinatesError("Введите координаты в формате: 55.938940, 48.196960");
      return false;
    }

    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
    const valid = Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90
      && longitude >= -180 && longitude <= 180;

    if (!valid) {
      setCoordinatesError("Проверьте диапазон: широта [-90..90], долгота [-180..180]");
      return false;
    }

    onChange({ latitude, longitude });
    setCoordinatesError("");
    return true;
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Название */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название объекта <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Например: Глэмпинг «Лесная поляна»"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            maxLength={200}
          />
        </div>

        {/* Тип объекта */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип объекта <span className="text-red-500">*</span>
          </label>
          <select
            value={data.objectTypeId}
            onChange={(e) => onChange({ objectTypeId: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value={0}>— Выберите —</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Регион */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Регион <span className="text-red-500">*</span>
          </label>
          <select
            value={data.regionId}
            onChange={(e) => {
              const rid = Number(e.target.value);
              onChange({ regionId: rid, cityOrDistrictId: 0 });
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value={0}>— Выберите —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Город / район */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Город / район <span className="text-red-500">*</span>
          </label>
          <select
            value={data.cityOrDistrictId}
            onChange={(e) => onChange({ cityOrDistrictId: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            disabled={!data.regionId}
          >
            <option value={0}>— Выберите —</option>
            {filteredCities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Населённый пункт */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Населённый пункт</label>
          <input
            type="text"
            value={data.settlement}
            onChange={(e) => onChange({ settlement: e.target.value })}
            placeholder="Деревня, село, посёлок"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Адрес */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Точный адрес <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Улица, дом, строение"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Координаты */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Координаты <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={coordinatesInput}
            onChange={(e) => {
              setCoordinatesInput(e.target.value);
              if (coordinatesError) setCoordinatesError("");
            }}
            onBlur={(e) => {
              const ok = applyCoordinates(e.target.value);
              if (ok && (data.latitude != null && data.longitude != null)) {
                setCoordinatesInput(`${data.latitude}, ${data.longitude}`);
              }
            }}
            placeholder="55.938940, 48.196960"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            Вставьте из Яндекс Карты: широта, долгота (например: 55.938940, 48.196960)
          </div>
          {coordinatesError && (
            <div className="text-xs text-red-600 mt-1">{coordinatesError}</div>
          )}
        </div>

        {/* Краткое описание */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Краткое описание <span className="text-red-500">*</span>
          </label>
          <textarea
            value={data.shortDescription}
            onChange={(e) => onChange({ shortDescription: e.target.value })}
            placeholder="Коротко о главном (до 300 символов)"
            rows={2}
            maxLength={300}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          />
          <div className="text-xs text-gray-400 text-right">{data.shortDescription.length}/300</div>
        </div>

        {/* Полное описание */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Полное описание <span className="text-red-500">*</span>
          </label>
          <textarea
            value={data.fullDescription}
            onChange={(e) => onChange({ fullDescription: e.target.value })}
            placeholder="Подробное описание объекта, окрестностей, особенностей"
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          />
        </div>
      </div>
    </section>
  );
}
