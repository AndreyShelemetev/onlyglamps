"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  adminGetObject, adminApproveObject, adminRejectObject, adminArchiveObject, adminUpdateSeo,
} from "@/lib/dashboard-api";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  OnModeration: { label: "На модерации", color: "bg-yellow-100 text-yellow-800" },
  Published: { label: "Опубликован", color: "bg-green-100 text-green-800" },
  Rejected: { label: "Отклонён", color: "bg-red-100 text-red-700" },
  Archived: { label: "В архиве", color: "bg-gray-200 text-gray-500" },
};

const CHECK_LABELS: Record<string, string> = {
  name: "Название",
  shortDescription: "Краткое описание",
  fullDescription: "Полное описание",
  address: "Адрес",
  coordinates: "Координаты",
  photos3: "Минимум 3 фото",
  capacity: "Вместимость",
  beds: "Спальные места",
  tariff: "Активный тариф",
  calendar: "Календарь",
  amenities3: "Минимум 3 удобства",
  contact: "Контакт владельца",
};

export default function AdminObjectDetailPage() {
  const params = useParams();
  const objectId = Number(params.id);
  const { user, token, loading: authLoading } = useAuth();
  const [obj, setObj] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoSuccess, setSeoSuccess] = useState("");

  useEffect(() => {
    if (authLoading || !token) return;
    if (user?.role !== "Admin") { window.location.href = "/"; return; }
    loadObject();
  }, [authLoading, token, user, objectId]);

  async function loadObject() {
    try {
      setLoading(true);
      const data = await adminGetObject(token!, objectId);
      setObj(data);
      setSeoTitle(data.seoTitle || "");
      setSeoDesc(data.seoDescription || "");
    } catch { setError("Ошибка загрузки"); } finally { setLoading(false); }
  }

  async function handleApprove() {
    if (!confirm("Одобрить и опубликовать?")) return;
    await adminApproveObject(token!, objectId);
    loadObject();
  }

  async function handleReject() {
    const comment = prompt("Причина отклонения:");
    if (comment === null) return;
    await adminRejectObject(token!, objectId, comment);
    loadObject();
  }

  async function handleArchive() {
    if (!confirm("Архивировать?")) return;
    await adminArchiveObject(token!, objectId);
    loadObject();
  }

  async function handleSeoSave() {
    setSeoSaving(true);
    await adminUpdateSeo(token!, objectId, { title: seoTitle, description: seoDesc });
    setSeoSaving(false);
    setSeoSuccess("SEO сохранено");
    setTimeout(() => setSeoSuccess(""), 3000);
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-60 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error || !obj) {
    return <div className="text-red-600">{error || "Объект не найден"}</div>;
  }

  const st = STATUS_MAP[obj.status] || STATUS_MAP.Draft;
  const checks: Record<string, boolean> = obj.checks || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{obj.name || "Без названия"}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            ID: {obj.id} · {obj.objectType?.name} · {obj.region?.name}, {obj.cityOrDistrict?.name}
          </p>
        </div>
        <a href="/dashboard/admin/objects/" className="text-sm text-gray-500 hover:text-gray-700">← К списку</a>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {obj.status === "OnModeration" && (
          <>
            <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
              Принять и опубликовать
            </button>
            <button onClick={handleReject} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">
              Отклонить
            </button>
          </>
        )}
        {obj.status !== "Archived" && (
          <button onClick={handleArchive} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">
            Архивировать
          </button>
        )}
        <a href={`/dashboard/admin/objects/${obj.id}/edit/`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Редактировать
        </a>
      </div>

      {obj.moderationComment && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <strong>Комментарий модератора:</strong> {obj.moderationComment}
        </div>
      )}

      {/* Validation checklist */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Чек-лист готовности</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(CHECK_LABELS).map(([key, label]) => (
            <div key={key} className={`flex items-center gap-2 text-sm ${checks[key] ? "text-green-700" : "text-red-600"}`}>
              <span>{checks[key] ? "✓" : "✗"}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Owner info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Владелец</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <div>{obj.owner?.firstName} {obj.owner?.lastName}</div>
          {obj.owner?.email && <div>Email: {obj.owner.email}</div>}
          {obj.owner?.profile?.contactPhone && <div>Тел: {obj.owner.profile.contactPhone}</div>}
          {obj.owner?.profile?.contactTelegram && <div>TG: {obj.owner.profile.contactTelegram}</div>}
        </div>
      </div>

      {/* Object details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Основная информация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Краткое описание:</span> <div className="mt-1">{obj.shortDescription || "—"}</div></div>
          <div><span className="text-gray-500">Адрес:</span> <div className="mt-1">{obj.address || "—"}</div></div>
          <div><span className="text-gray-500">Координаты:</span> <div className="mt-1">{obj.latitude}, {obj.longitude}</div></div>
          <div><span className="text-gray-500">Вместимость:</span> {obj.capacity} гостей, {obj.beds} мест</div>
          <div><span className="text-gray-500">Площадь:</span> {obj.area ? `${obj.area} м²` : "—"}</div>
          <div><span className="text-gray-500">Комнат:</span> {obj.rooms || "—"}</div>
        </div>
        {obj.fullDescription && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Полное описание:</span>
            <div className="mt-1 whitespace-pre-wrap text-gray-700">{obj.fullDescription}</div>
          </div>
        )}
      </div>

      {/* Photos */}
      {obj.photos?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Фото ({obj.photos.length})</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {obj.photos.map((p: any, i: number) => (
              <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                <img src={p.url} alt={p.alt || ""} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tariffs */}
      {obj.tariffs?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Тарифы</h2>
          <div className="space-y-2">
            {obj.tariffs.map((t: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <div>
                  <span className="font-medium">{t.name}</span>
                  {t.description && <span className="text-gray-500 ml-2">— {t.description}</span>}
                  {!t.isActive && <span className="text-xs text-red-500 ml-2">(неактивен)</span>}
                </div>
                <span className="font-semibold">{t.price.toLocaleString("ru")} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO edit */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">SEO</h2>
        <div className="space-y-3 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeoSave}
              disabled={seoSaving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {seoSaving ? "Сохраняю..." : "Сохранить SEO"}
            </button>
            {seoSuccess && <span className="text-sm text-green-600">{seoSuccess}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
