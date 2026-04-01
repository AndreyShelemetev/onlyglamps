"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  adminGetTags, adminCreateTag, adminUpdateTag, adminDeleteTag,
  adminGetAmenities, adminCreateAmenity, adminUpdateAmenity, adminDeleteAmenity,
} from "@/lib/dashboard-api";

export default function AdminCatalogPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [tags, setTags] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tag form
  const [tagName, setTagName] = useState("");
  const [editingTag, setEditingTag] = useState<any>(null);

  // Amenity form
  const [amenityName, setAmenityName] = useState("");
  const [amenityIcon, setAmenityIcon] = useState("");
  const [editingAmenity, setEditingAmenity] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "Admin") { window.location.href = "/"; return; }
    loadData();
  }, [authLoading, token, user]);

  async function loadData() {
    try {
      setLoading(true);
      const [t, a] = await Promise.all([adminGetTags(token!), adminGetAmenities(token!)]);
      setTags(t);
      setAmenities(a);
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  // Tags CRUD
  async function handleSaveTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagName.trim()) return;
    if (editingTag) {
      await adminUpdateTag(token!, editingTag.id, { name: tagName });
    } else {
      await adminCreateTag(token!, { name: tagName });
    }
    setTagName(""); setEditingTag(null);
    loadData();
  }

  async function handleDeleteTag(id: number) {
    if (!confirm("Удалить тег?")) return;
    const res = await adminDeleteTag(token!, id);
    if (res.error) { alert(res.error); return; }
    loadData();
  }

  // Amenities CRUD
  async function handleSaveAmenity(e: React.FormEvent) {
    e.preventDefault();
    if (!amenityName.trim()) return;
    if (editingAmenity) {
      await adminUpdateAmenity(token!, editingAmenity.id, { name: amenityName, icon: amenityIcon });
    } else {
      await adminCreateAmenity(token!, { name: amenityName, icon: amenityIcon });
    }
    setAmenityName(""); setAmenityIcon(""); setEditingAmenity(null);
    loadData();
  }

  async function handleDeleteAmenity(id: number) {
    if (!confirm("Удалить удобство?")) return;
    const res = await adminDeleteAmenity(token!, id);
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
      <h1 className="text-2xl font-bold text-gray-900">Теги и удобства</h1>
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Tags */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Теги ({tags.length})</h2>

        <form onSubmit={handleSaveTag} className="flex gap-2 mb-4">
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Название тега"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            {editingTag ? "Обновить" : "Добавить"}
          </button>
          {editingTag && (
            <button type="button" onClick={() => { setEditingTag(null); setTagName(""); }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Отмена
            </button>
          )}
        </form>

        {tags.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Нет тегов</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => (
              <div key={t.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-sm group">
                <span className="font-medium text-gray-700">{t.name}</span>
                <span className="text-xs text-gray-400">({t.objectCount || 0})</span>
                <button
                  onClick={() => { setEditingTag(t); setTagName(t.name); }}
                  className="text-xs text-primary-600 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition ml-1"
                >✎</button>
                <button
                  onClick={() => handleDeleteTag(t.id)}
                  className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amenities */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Удобства ({amenities.length})</h2>

        <form onSubmit={handleSaveAmenity} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={amenityName}
            onChange={(e) => setAmenityName(e.target.value)}
            placeholder="Название удобства"
            className="flex-1 min-w-[150px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <input
            type="text"
            value={amenityIcon}
            onChange={(e) => setAmenityIcon(e.target.value)}
            placeholder="Иконка (slug)"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            {editingAmenity ? "Обновить" : "Добавить"}
          </button>
          {editingAmenity && (
            <button type="button" onClick={() => { setEditingAmenity(null); setAmenityName(""); setAmenityIcon(""); }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Отмена
            </button>
          )}
        </form>

        {amenities.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Нет удобств</p>
        ) : (
          <div className="space-y-2">
            {amenities.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between border-b border-gray-100 pb-2 group">
                <div className="text-sm">
                  <span className="font-medium">{a.name}</span>
                  {a.icon && <span className="text-gray-400 ml-2">({a.icon})</span>}
                  <span className="text-gray-400 ml-2">/{a.slug}/</span>
                  <span className="text-xs text-gray-400 ml-2">{a.objectCount || 0} объектов</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => { setEditingAmenity(a); setAmenityName(a.name); setAmenityIcon(a.icon || ""); }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >Изменить</button>
                  <button
                    onClick={() => handleDeleteAmenity(a.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
