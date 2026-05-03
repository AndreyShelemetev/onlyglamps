"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ownerGetObjects, ownerArchiveObject, ownerSubmitObject } from "@/lib/dashboard-api";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  OnModeration: { label: "На модерации", color: "bg-yellow-100 text-yellow-800" },
  Published: { label: "Опубликован", color: "bg-green-100 text-green-800" },
  Rejected: { label: "Отклонён", color: "bg-red-100 text-red-700" },
  Archived: { label: "В архиве", color: "bg-gray-200 text-gray-500" },
};

export default function OwnerObjectsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Owner" && user?.role !== "Admin" && user?.role !== "Editor")) {
      window.location.href = "/";
      return;
    }
    loadObjects();
  }, [authLoading, token, user]);

  async function loadObjects() {
    try {
      setLoading(true);
      const data = await ownerGetObjects(token!);
      setObjects(Array.isArray(data) ? data : []);
      if (data?.error) setError(data.error);
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  async function handleSubmit(id: number) {
    if (!confirm("Отправить на модерацию?")) return;
    const res = await ownerSubmitObject(token!, id);
    if (res.errors) { alert(res.errors.join("\n")); return; }
    loadObjects();
  }

  async function handleArchive(id: number) {
    if (!confirm("Архивировать объект?")) return;
    await ownerArchiveObject(token!, id);
    loadObjects();
  }

  if (authLoading || loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-20 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    </div>
  );

  if (error) return <div className="max-w-5xl mx-auto px-4 py-10 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои объекты</h1>
        <a href="/dashboard/objects/new/" className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          + Создать объект
        </a>
      </div>

      {objects.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-3">🏡</div>
          <p className="text-gray-600 mb-4">У вас пока нет объектов</p>
          <a href="/dashboard/objects/new/" className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            Создать первый объект
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {objects.map((obj: any) => {
            const s = STATUS_MAP[obj.status] || STATUS_MAP.Draft;
            return (
              <div key={obj.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-full sm:w-20 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                    {obj.mainPhotoUrl ? <img src={obj.mainPhotoUrl} alt="" className="w-full h-full object-cover" /> : "Нет фото"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{obj.name || "Без названия"}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{obj.objectType}</span>
                      <span>{obj.region}, {obj.cityOrDistrict}</span>
                      <span>Фото: {obj.photoCount}</span>
                      <span>Тарифы: {obj.tariffCount}</span>
                      <span>Удобства: {obj.amenityCount}</span>
                      <span>{obj.hasCalendar ? "✓ Календарь" : "✗ Нет календаря"}</span>
                    </div>
                    {obj.moderationComment && obj.status === "Rejected" && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
                        Причина отклонения: {obj.moderationComment}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`/dashboard/objects/${obj.id}/`} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                      Редактировать
                    </a>
                    {(obj.status === "Draft" || obj.status === "Rejected") && (
                      <button onClick={() => handleSubmit(obj.id)} className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                        На модерацию
                      </button>
                    )}
                    {obj.status !== "Archived" && (
                      <button onClick={() => handleArchive(obj.id)} className="text-sm px-3 py-1.5 text-gray-500 hover:text-red-600 transition" title="Архивировать">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
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
