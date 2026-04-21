"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  ownerCreateObject, ownerUpdateObject, ownerSaveTariffs, ownerSavePhotos,
  ownerSaveCalendar, fetchCatalogAmenities, fetchCatalogRegions, fetchCatalogCities,
  fetchCatalogTypes, fetchCatalogTags,
} from "@/lib/dashboard-api";
import {
  BlockBasicInfo, BlockParams, BlockPhotos, BlockAmenities, BlockTags,
  BlockTariffs, BlockCalendar, BlockSource, BlockSeo, BlockCustomFields,
  ObjectFormData, TariffItem, PhotoItem, CalendarItem,
  CatalogOption, RegionOption, INITIAL_FORM_DATA,
  CustomFieldsMap,
} from "@/components/editor";

export default function NewObjectPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<ObjectFormData>(INITIAL_FORM_DATA);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldsMap>({});

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string; slug: string; regionId: number }[]>([]);
  const [types, setTypes] = useState<CatalogOption[]>([]);
  const [amenities, setAmenities] = useState<CatalogOption[]>([]);
  const [tags, setTags] = useState<CatalogOption[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);

  const formRef = useRef(formData);
  formRef.current = formData;

  // Load catalogs
  useEffect(() => {
    const safe = (p: Promise<any>) => p.catch(() => null);
    Promise.all([
      safe(fetchCatalogRegions()),
      safe(fetchCatalogCities()),
      safe(fetchCatalogTypes()),
      safe(fetchCatalogAmenities()),
      safe(fetchCatalogTags()),
    ]).then(([regs, cits, typs, amns, tgs]) => {
      if (regs) setRegions(regs);
      if (cits) setCities(cits);
      if (typs) setTypes(typs);
      if (amns) setAmenities(amns);
      if (tgs) setTags(tgs);
    });
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "Owner" && user.role !== "Admin"))) {
      window.location.href = "/";
    }
  }, [authLoading, user]);

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
    setError(""); setSuccess("");
    setSaving(true);

    try {
      let objId = savedId;

      if (!objId) {
        // Create
        const res = await ownerCreateObject(token, { ...formRef.current, customFields });
        if (res.error) { setError(res.error); setSaving(false); return; }
        objId = res.id;
        setSavedId(objId);
      } else {
        // Update
        const res = await ownerUpdateObject(token, objId, { ...formRef.current, customFields });
        if (res.error) { setError(res.error); setSaving(false); return; }
      }

      // Save tariffs, photos, calendar in parallel
      await Promise.all([
        tariffs.length > 0 ? ownerSaveTariffs(token, objId!, tariffs) : Promise.resolve(),
        photos.length > 0 ? ownerSavePhotos(token, objId!, photos) : Promise.resolve(),
        calendar.length > 0 ? ownerSaveCalendar(token, objId!, calendar) : Promise.resolve(),
      ]);

      setDirty(false);
      setSuccess("Черновик сохранён");
      setTimeout(() => setSuccess(""), 3000);

      // Redirect to edit page if newly created
      if (!savedId && objId) {
        window.location.href = `/dashboard/objects/${objId}/`;
      }
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Новый объект</h1>
          <p className="text-sm text-gray-500 mt-1">Заполните информацию и сохраните как черновик</p>
        </div>
        <a href="/dashboard/objects/" className="text-sm text-gray-500 hover:text-gray-700">
          ← К списку
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
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
            {dirty ? "Есть несохранённые изменения" : savedId ? "Сохранено" : ""}
          </div>
          <div className="flex gap-3">
            <a href="/dashboard/objects/" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">
              Отмена
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {saving ? "Сохраняю..." : savedId ? "Сохранить" : "Создать черновик"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
