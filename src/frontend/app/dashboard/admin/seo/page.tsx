"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { adminGetSeo, adminCreateSeo, adminUpdateSeoMeta, adminGetRegions, adminGetCities, adminGetTypes } from "@/lib/dashboard-api";

const PAGE_TYPES = [
  { value: "region", label: "Страница региона" },
  { value: "city", label: "Страница города" },
  { value: "type_in_region", label: "Тип в регионе" },
  { value: "type_in_city", label: "Тип в городе" },
  { value: "home", label: "Главная" },
];

export default function AdminSeoPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [seoList, setSeoList] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    pageType: "", regionId: 0, cityOrDistrictId: 0, objectTypeId: 0,
    title: "", description: "", h1: "", text: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Admin" && user?.role !== "Editor")) { window.location.href = "/"; return; }
    loadData();
  }, [authLoading, token, user]);

  async function loadData() {
    try {
      setLoading(true);
      const [seo, regs, cits, typs] = await Promise.all([
        adminGetSeo(token!), adminGetRegions(token!), adminGetCities(token!), adminGetTypes(token!),
      ]);
      setSeoList(seo);
      setRegions(regs);
      setCities(cits);
      setTypes(typs);
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  function resetForm() {
    setEditing(null);
    setForm({ pageType: "", regionId: 0, cityOrDistrictId: 0, objectTypeId: 0, title: "", description: "", h1: "", text: "" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const data = {
      pageType: form.pageType,
      regionId: form.regionId || null,
      cityOrDistrictId: form.cityOrDistrictId || null,
      objectTypeId: form.objectTypeId || null,
      title: form.title,
      description: form.description,
      h1: form.h1,
      text: form.text,
    };
    if (editing) {
      await adminUpdateSeoMeta(token!, editing.id, data);
    } else {
      await adminCreateSeo(token!, data);
    }
    resetForm();
    setSuccess("Сохранено");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-60 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">SEO-управление</h1>
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editing ? "Редактирование" : "Новая SEO-запись"}
        </h2>

        <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип страницы</label>
              <select
                value={form.pageType}
                onChange={(e) => setForm({ ...form, pageType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">— Выберите —</option>
                {PAGE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Регион</label>
              <select
                value={form.regionId}
                onChange={(e) => setForm({ ...form, regionId: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>— Все —</option>
                {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Город/район</label>
              <select
                value={form.cityOrDistrictId}
                onChange={(e) => setForm({ ...form, cityOrDistrictId: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>— Все —</option>
                {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.regionName})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип объекта</label>
              <select
                value={form.objectTypeId}
                onChange={(e) => setForm({ ...form, objectTypeId: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>— Все —</option>
                {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">H1</label>
            <input
              type="text" value={form.h1} onChange={(e) => setForm({ ...form, h1: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текст на странице</label>
            <textarea
              value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
              {editing ? "Обновить" : "Создать"}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing list */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Существующие записи ({seoList.length})</h2>

        {seoList.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">Нет SEO-записей</div>
        ) : (
          <div className="space-y-2">
            {seoList.map((s: any) => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-2 gap-2">
                <div className="text-sm">
                  <span className="font-medium">{s.pageType}</span>
                  {s.regionName && <span className="text-gray-500 ml-2">{s.regionName}</span>}
                  {s.cityName && <span className="text-gray-500 ml-1">→ {s.cityName}</span>}
                  {s.typeName && <span className="text-gray-500 ml-1">({s.typeName})</span>}
                  {s.title && <div className="text-xs text-gray-400 truncate max-w-md">Title: {s.title}</div>}
                </div>
                <button
                  onClick={() => {
                    setEditing(s);
                    setForm({
                      pageType: s.pageType, regionId: s.regionId || 0, cityOrDistrictId: s.cityOrDistrictId || 0,
                      objectTypeId: s.objectTypeId || 0, title: s.title || "", description: s.description || "",
                      h1: s.h1 || "", text: "",
                    });
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 flex-shrink-0"
                >Изменить</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
