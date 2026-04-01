"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  adminGetRegions, adminCreateRegion, adminUpdateRegion, adminDeleteRegion,
  adminGetCities, adminCreateCity, adminUpdateCity, adminDeleteCity,
} from "@/lib/dashboard-api";

export default function AdminRegionsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [regions, setRegions] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Region form
  const [regionName, setRegionName] = useState("");
  const [editingRegion, setEditingRegion] = useState<any>(null);

  // City form
  const [cityName, setCityName] = useState("");
  const [cityRegionId, setCityRegionId] = useState(0);
  const [cityIsCity, setCityIsCity] = useState(true);
  const [editingCity, setEditingCity] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "Admin") { window.location.href = "/"; return; }
    loadData();
  }, [authLoading, token, user]);

  async function loadData() {
    try {
      setLoading(true);
      const [regs, cits] = await Promise.all([adminGetRegions(token!), adminGetCities(token!)]);
      setRegions(regs);
      setCities(cits);
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  // Region CRUD
  async function handleSaveRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!regionName.trim()) return;
    if (editingRegion) {
      await adminUpdateRegion(token!, editingRegion.id, { name: regionName });
    } else {
      await adminCreateRegion(token!, { name: regionName });
    }
    setRegionName("");
    setEditingRegion(null);
    loadData();
  }

  async function handleDeleteRegion(id: number) {
    if (!confirm("Удалить регион?")) return;
    const res = await adminDeleteRegion(token!, id);
    if (res.error) { alert(res.error); return; }
    loadData();
  }

  // City CRUD
  async function handleSaveCity(e: React.FormEvent) {
    e.preventDefault();
    if (!cityName.trim() || !cityRegionId) return;
    if (editingCity) {
      await adminUpdateCity(token!, editingCity.id, { name: cityName, regionId: cityRegionId, isCity: cityIsCity });
    } else {
      await adminCreateCity(token!, { name: cityName, regionId: cityRegionId, isCity: cityIsCity });
    }
    setCityName("");
    setCityRegionId(0);
    setCityIsCity(true);
    setEditingCity(null);
    loadData();
  }

  async function handleDeleteCity(id: number) {
    if (!confirm("Удалить город/район?")) return;
    const res = await adminDeleteCity(token!, id);
    if (res.error) { alert(res.error); return; }
    loadData();
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Регионы и города</h1>
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Regions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Регионы</h2>

        <form onSubmit={handleSaveRegion} className="flex gap-2 mb-4">
          <input
            type="text"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            placeholder="Название региона"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            {editingRegion ? "Обновить" : "Добавить"}
          </button>
          {editingRegion && (
            <button type="button" onClick={() => { setEditingRegion(null); setRegionName(""); }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Отмена
            </button>
          )}
        </form>

        <div className="space-y-2">
          {regions.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-gray-400 ml-2">/{r.slug}/</span>
                <span className="text-gray-400 ml-2">{r.cityCount} городов</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingRegion(r); setRegionName(r.name); }}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >Изменить</button>
                <button
                  onClick={() => handleDeleteRegion(r.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cities */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Города и районы</h2>

        <form onSubmit={handleSaveCity} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="Название"
            className="flex-1 min-w-[150px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <select
            value={cityRegionId}
            onChange={(e) => setCityRegionId(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={0}>— Регион —</option>
            {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={cityIsCity}
              onChange={(e) => setCityIsCity(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            Город
          </label>
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            {editingCity ? "Обновить" : "Добавить"}
          </button>
          {editingCity && (
            <button type="button" onClick={() => { setEditingCity(null); setCityName(""); setCityRegionId(0); }} className="px-3 py-2 text-sm text-gray-500">
              Отмена
            </button>
          )}
        </form>

        <div className="space-y-2">
          {cities.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-400 ml-2">/{c.slug}/</span>
                <span className="text-gray-400 ml-2">({c.regionName})</span>
                <span className="text-xs text-gray-400 ml-2">{c.isCity ? "город" : "район"}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingCity(c); setCityName(c.name); setCityRegionId(c.regionId); setCityIsCity(c.isCity); }}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >Изменить</button>
                <button
                  onClick={() => handleDeleteCity(c.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
