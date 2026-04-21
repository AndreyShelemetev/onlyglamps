"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  ownerGetObject, ownerUpdateObject, ownerSaveTariffs, ownerSavePhotos,
  ownerSaveCalendar, ownerSubmitObject,
  fetchCatalogAmenities, fetchCatalogRegions, fetchCatalogCities,
  fetchCatalogTypes, fetchCatalogTags,
} from "@/lib/dashboard-api";
import {
  BlockBasicInfo, BlockParams, BlockPhotos, BlockAmenities, BlockTags,
  BlockTariffs, BlockCalendar, BlockSource, BlockSeo, BlockCustomFields,
  ObjectFormData, TariffItem, PhotoItem, CalendarItem,
  CatalogOption, RegionOption, INITIAL_FORM_DATA,
  CustomFieldsMap, TypeFieldSchema,
} from "@/components/editor";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  OnModeration: { label: "На модерации", color: "bg-yellow-100 text-yellow-800" },
  Published: { label: "Опубликован", color: "bg-green-100 text-green-800" },
  Rejected: { label: "Отклонён", color: "bg-red-100 text-red-700" },
  Archived: { label: "В архиве", color: "bg-gray-200 text-gray-500" },
};

export default function EditObjectPage() {
  const params = useParams();
  const objectId = Number(params.id);
  const { user, token, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState<ObjectFormData>(INITIAL_FORM_DATA);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [status, setStatus] = useState("Draft");
  const [moderationComment, setModerationComment] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldsMap>({});
  const [fieldSchema, setFieldSchema] = useState<TypeFieldSchema[] | null>(null);
  const [initialTypeId, setInitialTypeId] = useState<number>(0);

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string; slug: string; regionId: number }[]>([]);
  const [types, setTypes] = useState<CatalogOption[]>([]);
  const [amenities, setAmenities] = useState<CatalogOption[]>([]);
  const [tags, setTags] = useState<CatalogOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const formRef = useRef(formData);
  formRef.current = formData;

  // Load catalogs + object data
  useEffect(() => {
    if (authLoading || !token) return;
    if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
      window.location.href = "/";
      return;
    }

    const safe = (p: Promise<any>) => p.catch(() => null);
    Promise.all([
      safe(fetchCatalogRegions()),
      safe(fetchCatalogCities()),
      safe(fetchCatalogTypes()),
      safe(fetchCatalogAmenities()),
      safe(fetchCatalogTags()),
      ownerGetObject(token, objectId),
    ]).then(([regs, cits, typs, amns, tgs, obj]) => {
      if (regs) setRegions(regs);
      if (cits) setCities(cits);
      if (typs) setTypes(typs);
      if (amns) setAmenities(amns);
      if (tgs) setTags(tgs);

      if (obj.error) {
        setError(obj.error);
        setLoading(false);
        return;
      }

      // Populate form
      setFormData({
        name: obj.name || "",
        objectTypeId: obj.objectTypeId || 0,
        regionId: obj.regionId || 0,
        cityOrDistrictId: obj.cityOrDistrictId || 0,
        shortDescription: obj.shortDescription || "",
        fullDescription: obj.fullDescription || "",
        settlement: obj.settlement || "",
        address: obj.address || "",
        latitude: obj.latitude,
        longitude: obj.longitude,
        capacity: obj.capacity || 1,
        beds: obj.beds,
        rooms: obj.rooms,
        area: obj.area,
        isWhole: obj.isWhole ?? true,
        minRentalDays: obj.minRentalDays,
        maxRentalDays: obj.maxRentalDays,
        checkInTime: obj.checkInTime || "14:00",
        checkOutTime: obj.checkOutTime || "12:00",
        childrenAllowed: obj.childrenAllowed ?? true,
        petsAllowed: obj.petsAllowed ?? false,
        smokingAllowed: obj.smokingAllowed ?? false,
        eventsAllowed: obj.eventsAllowed ?? false,
        deposit: obj.deposit || "",
        rules: obj.rules || "",
        amenityIds: (obj.amenities || []).map((a: any) => a.id),
        tagIds: (obj.tags || []).map((t: any) => t.id),
        sourceName: obj.source?.sourceName || "",
        sourceUrl: obj.source?.sourceUrl || "",
        sourceType: obj.source?.sourceType || "",
        seoTitle: obj.seoTitle || "",
        seoDescription: obj.seoDescription || "",
      });
      setTariffs((obj.tariffs || []).map((t: any) => ({
        id: t.id, name: t.name, price: t.price, description: t.description || "", isActive: t.isActive,
      })));
      setPhotos((obj.photos || []).map((p: any) => ({
        id: p.id, url: p.url, alt: p.alt || "", sortOrder: p.sortOrder,
      })));
      setCalendar((obj.availability || []).map((a: any) => ({
        date: a.date, status: a.status,
      })));
      setStatus(obj.status || "Draft");
      setModerationComment(obj.moderationComment || null);
      setCustomFields(obj.customFields || {});
      setFieldSchema(Array.isArray(obj.fieldSchema) ? obj.fieldSchema : null);
      setInitialTypeId(obj.objectTypeId || 0);
      setLoading(false);
    }).catch(() => {
      setError("Ошибка загрузки данных");
      setLoading(false);
    });
  }, [authLoading, token, user, objectId]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const updateForm = useCallback((patch: Partial<ObjectFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  async function handleSave() {
    if (!token) return;
    setError(""); setSuccess(""); setSubmitErrors([]);
    setSaving(true);

    try {
      const res = await ownerUpdateObject(token, objectId, { ...formRef.current, customFields });
      if (res.error) { setError(res.error); setSaving(false); return; }

      await Promise.all([
        ownerSaveTariffs(token, objectId, tariffs),
        ownerSavePhotos(token, objectId, photos),
        ownerSaveCalendar(token, objectId, calendar),
      ]);

      setDirty(false);
      setStatus("Draft"); // editing moves it back to draft
      setSuccess("Сохранено");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!token) return;
    if (!confirm("Отправить на модерацию?")) return;

    // Save first
    await handleSave();

    const res = await ownerSubmitObject(token, objectId);
    if (res.errors) {
      setSubmitErrors(res.errors);
      return;
    }
    setStatus("OnModeration");
    setSuccess("Отправлено на модерацию!");
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  const st = STATUS_MAP[status] || STATUS_MAP.Draft;
  const canEdit = status === "Draft" || status === "Rejected";

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {formData.name || "Без названия"}
            </h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">ID: {objectId}</p>
        </div>
        <a href="/dashboard/objects/" className="text-sm text-gray-500 hover:text-gray-700">
          ← К списку
        </a>
      </div>

      {moderationComment && status === "Rejected" && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <strong>Причина отклонения:</strong> {moderationComment}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}
      {submitErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          <strong>Для отправки на модерацию необходимо:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {submitErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          Объект на модерации или опубликован. Редактирование переведёт его обратно в черновик.
        </div>
      )}

      <BlockBasicInfo data={formData} onChange={updateForm} regions={regions} types={types} cities={cities} />
      <BlockParams
        data={formData}
        onChange={updateForm}
        disabledKeys={(types.find((t) => t.id === formData.objectTypeId)?.disabledBuiltinFields || "").split(",").map((s) => s.trim()).filter(Boolean)}
      />
      <BlockCustomFields
        objectTypeId={formData.objectTypeId}
        values={customFields}
        onChange={(v) => { setCustomFields(v); setDirty(true); }}
        schema={formData.objectTypeId === initialTypeId ? fieldSchema : null}
      />
      <BlockPhotos photos={photos} onChange={(p) => { setPhotos(p); setDirty(true); }} />
      <BlockAmenities selectedIds={formData.amenityIds} onChange={(ids) => updateForm({ amenityIds: ids })} amenities={amenities} />
      <BlockTags selectedIds={formData.tagIds} onChange={(ids) => updateForm({ tagIds: ids })} tags={tags} />
      <BlockTariffs tariffs={tariffs} onChange={(t) => { setTariffs(t); setDirty(true); }} />
      <BlockCalendar calendar={calendar} onChange={(c) => { setCalendar(c); setDirty(true); }} />
      <BlockSource data={formData} onChange={updateForm} />
      <BlockSeo data={formData} onChange={updateForm} isAdmin={user?.role === "Admin"} />

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}
          </div>
          <div className="flex gap-3">
            <a href="/dashboard/objects/" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">
              К списку
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50 disabled:opacity-50 transition"
            >
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
            {(status === "Draft" || status === "Rejected") && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
              >
                На модерацию
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
