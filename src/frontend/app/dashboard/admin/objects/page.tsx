"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { adminGetObjects, adminApproveObject, adminRejectObject, adminArchiveObject } from "@/lib/dashboard-api";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  OnModeration: { label: "На модерации", color: "bg-yellow-100 text-yellow-800" },
  Published: { label: "Опубликован", color: "bg-green-100 text-green-800" },
  Rejected: { label: "Отклонён", color: "bg-red-100 text-red-700" },
  Archived: { label: "В архиве", color: "bg-gray-200 text-gray-500" },
};

export default function AdminObjectsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [objects, setObjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "", region: "", page: "1" });

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "Admin") { window.location.href = "/"; return; }
    loadObjects();
  }, [authLoading, token, user]);

  async function loadObjects(overrideFilters?: Record<string, string>) {
    try {
      setLoading(true);
      const params = overrideFilters || Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
      const data = await adminGetObjects(token!, params);
      setObjects(data.data || []);
      setTotal(data.total || 0);
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  function applyFilter(key: string, value: string) {
    const next = { ...filters, [key]: value, page: "1" };
    setFilters(next);
    const params = Object.fromEntries(Object.entries(next).filter(([_, v]) => v));
    loadObjects(params);
  }

  async function handleApprove(id: number) {
    if (!confirm("Одобрить и опубликовать?")) return;
    await adminApproveObject(token!, id);
    loadObjects();
  }

  async function handleReject(id: number) {
    const comment = prompt("Причина отклонения:");
    if (comment === null) return;
    await adminRejectObject(token!, id, comment);
    loadObjects();
  }

  async function handleArchive(id: number) {
    if (!confirm("Архивировать объект?")) return;
    await adminArchiveObject(token!, id);
    loadObjects();
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Все объекты</h1>
          <span className="text-sm text-gray-500">Всего: {total}</span>
        </div>
        <a
          href="/dashboard/admin/objects/new/"
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
        >
          + Создать объект
        </a>
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filters.status}
          onChange={(e) => applyFilter("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {objects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет объектов</div>
      ) : (
        <div className="space-y-3">
          {objects.map((obj: any) => {
            const s = STATUS_MAP[obj.status] || STATUS_MAP.Draft;
            return (
              <div key={obj.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{obj.name || "Без названия"}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{obj.objectType}</span>
                      <span>{obj.region}, {obj.cityOrDistrict}</span>
                      <span>Владелец: {obj.owner?.firstName} {obj.owner?.lastName}</span>
                      <span>Фото: {obj.photoCount}</span>
                      <span>Обновлён: {new Date(obj.updatedAt).toLocaleDateString("ru")}</span>
                    </div>
                    {obj.moderationComment && (
                      <div className="mt-1 text-xs text-red-600">Комментарий: {obj.moderationComment}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/dashboard/admin/objects/${obj.id}/`}
                      className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Открыть
                    </a>
                    <a
                      href={`/dashboard/admin/objects/${obj.id}/edit/`}
                      className="text-sm px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                    >
                      Редактировать
                    </a>
                    {obj.status === "OnModeration" && (
                      <>
                        <button onClick={() => handleApprove(obj.id)} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                          Принять
                        </button>
                        <button onClick={() => handleReject(obj.id)} className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                          Отклонить
                        </button>
                      </>
                    )}
                    {obj.status !== "Archived" && (
                      <button onClick={() => handleArchive(obj.id)} className="text-sm px-3 py-1.5 text-gray-500 hover:text-red-600 transition" title="Архивировать">
                        🗄️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
