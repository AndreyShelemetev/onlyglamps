"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  adminGetObjects,
  adminApproveObject,
  adminRejectObject,
  adminArchiveObject,
  adminGetRegions,
  adminGetTypes,
  adminBulkUpdateObjectStatus,
} from "@/lib/dashboard-api";

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
  const [regions, setRegions] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "", region: "" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Admin" && user?.role !== "Editor")) { window.location.href = "/"; return; }
    loadObjects();
  }, [authLoading, token, user, filters, page, pageSize]);

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Admin" && user?.role !== "Editor")) return;
    loadReferenceData();
  }, [authLoading, token, user]);

  async function loadObjects(overrideFilters?: Record<string, string>) {
    try {
      setLoading(true);
      const baseParams = overrideFilters || Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
      const params = {
        ...baseParams,
        page: String(page),
        pageSize: String(pageSize),
      };
      const data = await adminGetObjects(token!, params);
      setObjects(data.data || []);
      setTotal(data.total || 0);
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  async function loadReferenceData() {
    try {
      const [regionsData, typesData] = await Promise.all([
        adminGetRegions(token!),
        adminGetTypes(token!),
      ]);
      setRegions(Array.isArray(regionsData) ? regionsData : []);
      setTypes(Array.isArray(typesData) ? typesData : []);
    } catch {
      // Keep list usable even when dictionary endpoints fail.
    }
  }

  function applyFilter(key: string, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const allVisibleSelected = objects.length > 0 && objects.every((obj: any) => selectedIds.has(obj.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        objects.forEach((obj: any) => next.delete(obj.id));
      } else {
        objects.forEach((obj: any) => next.add(obj.id));
      }
      return next;
    });
  }

  async function handleBulkStatus(status: "Draft" | "Published" | "Archived", title: string) {
    if (selectedIds.size === 0) return;
    if (!confirm(`${title} выбранные объекты (${selectedIds.size})?`)) return;

    try {
      setBulkLoading(true);
      const res = await adminBulkUpdateObjectStatus(token!, Array.from(selectedIds), status);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSelectedIds(new Set());
      await loadObjects();
    } catch {
      setError("Ошибка массового обновления");
    } finally {
      setBulkLoading(false);
    }
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);
  const pageWindowStart = Math.max(1, page - 2);
  const pageWindowEnd = Math.min(totalPages, page + 2);
  const allVisibleSelected = objects.length > 0 && objects.every((obj: any) => selectedIds.has(obj.id));

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

        <select
          value={filters.region}
          onChange={(e) => applyFilter("region", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Все регионы</option>
          {regions.map((r: any) => (
            <option key={r.id} value={r.slug}>{r.name}</option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) => applyFilter("type", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Все типы</option>
          {types.map((t: any) => (
            <option key={t.id} value={t.slug}>{t.name}</option>
          ))}
        </select>

        <select
          value={String(pageSize)}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
            setSelectedIds(new Set());
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="10">10 на странице</option>
          <option value="20">20 на странице</option>
          <option value="50">50 на странице</option>
          <option value="100">100 на странице</option>
        </select>
      </div>

      {/* Table */}
      {objects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет объектов</div>
      ) : (
        <>
          <div className="mb-4 border border-gray-200 rounded-xl p-3 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Выбрать все на странице
              </label>
              <span className="text-sm text-gray-500">Выбрано: {selectedIds.size}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedIds.size === 0 || bulkLoading}
                onClick={() => handleBulkStatus("Published", "Опубликовать")}
                className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Опубликовать
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || bulkLoading}
                onClick={() => handleBulkStatus("Draft", "Перевести в черновики")}
                className="text-sm px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                В черновики
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || bulkLoading}
                onClick={() => handleBulkStatus("Archived", "Архивировать")}
                className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                В архив
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {objects.map((obj: any) => {
              const s = STATUS_MAP[obj.status] || STATUS_MAP.Draft;
              return (
                <div key={obj.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="inline-flex items-center self-start sm:self-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(obj.id)}
                        onChange={() => toggleSelect(obj.id)}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label={`Выбрать ${obj.name || "объект"}`}
                      />
                    </label>

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

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-500">
              Показаны {startItem}-{endItem} из {total}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Назад
              </button>

              {Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, i) => pageWindowStart + i).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={
                    "px-3 py-1.5 text-sm border rounded-lg " +
                    (p === page
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-gray-300 hover:bg-gray-50")
                  }
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
