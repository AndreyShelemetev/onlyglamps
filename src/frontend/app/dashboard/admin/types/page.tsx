"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { adminGetTypes, adminCreateType, adminUpdateType } from "@/lib/dashboard-api";

export default function AdminTypesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [colorFrom, setColorFrom] = useState("#10b981");
  const [colorTo, setColorTo] = useState("#047857");
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Admin" && user?.role !== "Editor")) { window.location.href = "/"; return; }
    loadData();
  }, [authLoading, token, user]);

  async function loadData() {
    try {
      setLoading(true);
      setTypes(await adminGetTypes(token!));
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) {
      await adminUpdateType(token!, editing.id, { name, icon, colorFrom, colorTo });
    } else {
      await adminCreateType(token!, { name, icon, colorFrom, colorTo });
    }
    setName(""); setIcon(""); setColorFrom("#10b981"); setColorTo("#047857");
    setEditing(null);
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Типы объектов</h1>
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-3 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название типа"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Иконка (emoji)"
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Градиент от:</label>
            <input type="color" value={colorFrom} onChange={(e) => setColorFrom(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-0" />
            <input type="text" value={colorFrom} onChange={(e) => setColorFrom(e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
            <label className="text-xs text-gray-500">до:</label>
            <input type="color" value={colorTo} onChange={(e) => setColorTo(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-0" />
            <input type="text" value={colorTo} onChange={(e) => setColorTo(e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
            <div className="w-16 h-8 rounded-md" style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
              {editing ? "Обновить" : "Добавить"}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setName(""); setIcon(""); setColorFrom("#10b981"); setColorTo("#047857"); }} className="px-3 py-2 text-sm text-gray-500">
                Отмена
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {types.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-md flex-shrink-0" style={{ background: t.colorFrom && t.colorTo ? `linear-gradient(135deg, ${t.colorFrom}, ${t.colorTo})` : '#94a3b8' }} />
                {t.icon && <span className="text-lg">{t.icon}</span>}
                <span className="font-medium">{t.name}</span>
                <span className="text-gray-400">/{t.slug}/</span>
                <span className="text-gray-400">{t.objectCount} объектов</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/dashboard/admin/types/${t.id}/fields/`}
                  className="text-xs text-gray-500 hover:text-primary-600"
                >Поля</a>
                <button
                  onClick={() => { setEditing(t); setName(t.name); setIcon(t.icon || ""); setColorFrom(t.colorFrom || "#10b981"); setColorTo(t.colorTo || "#047857"); }}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >Изменить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
