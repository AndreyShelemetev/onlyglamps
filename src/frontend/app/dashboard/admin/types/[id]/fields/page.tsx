"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  adminGetTypes,
  adminGetTypeFields,
  adminCreateTypeField,
  adminUpdateTypeField,
  adminDeleteTypeField,
  adminUpdateBuiltinFields,
} from "@/lib/dashboard-api";

interface FieldItem {
  id: number;
  key: string;
  label: string;
  fieldType: string;
  unit: string | null;
  placeholder: string | null;
  helpText: string | null;
  options: string | null;
  minValue: number | null;
  maxValue: number | null;
  isRequired: boolean;
  sortOrder: number;
}

const EMPTY: Partial<FieldItem> = {
  key: "",
  label: "",
  fieldType: "number",
  unit: "",
  placeholder: "",
  helpText: "",
  options: "",
  minValue: null,
  maxValue: null,
  isRequired: false,
};

const TYPE_LABELS: Record<string, string> = {
  number: "Число",
  text: "Текст (короткий)",
  textarea: "Текст (длинный)",
  boolean: "Да / Нет",
  select: "Выбор из списка",
};

// Встроенные параметры объекта (их можно отключить для конкретного типа).
// Ключи должны совпадать с AllowedBuiltinKeys на бэкенде и с полями BlockParams.
const BUILTIN_FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: "capacity", label: "Вместимость гостей" },
  { key: "beds", label: "Спальных мест" },
  { key: "rooms", label: "Комнат" },
  { key: "area", label: "Площадь, м²" },
  { key: "minRentalDays", label: "Мин. срок аренды (дней)" },
  { key: "maxRentalDays", label: "Макс. срок аренды (дней)" },
  { key: "checkInTime", label: "Время заезда" },
  { key: "checkOutTime", label: "Время выезда" },
  { key: "isWhole", label: "Можно снять целиком" },
  { key: "childrenAllowed", label: "Можно с детьми" },
  { key: "petsAllowed", label: "Можно с питомцами" },
  { key: "smokingAllowed", label: "Можно курить" },
  { key: "eventsAllowed", label: "Можно мероприятия" },
  { key: "deposit", label: "Залог / депозит" },
  { key: "rules", label: "Правила проживания" },
];

export default function AdminTypeFieldsPage() {
  const params = useParams();
  const typeId = Number(params.id);
  const { user, token, loading: authLoading } = useAuth();

  const [typeName, setTypeName] = useState("");
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [disabledBuiltins, setDisabledBuiltins] = useState<Set<string>>(new Set());
  const [savingBuiltins, setSavingBuiltins] = useState(false);
  const [builtinsSavedAt, setBuiltinsSavedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<FieldItem>>(EMPTY);
  const [editing, setEditing] = useState<FieldItem | null>(null);
  const fieldsListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Admin" && user?.role !== "Editor")) { window.location.href = "/"; return; }
    load();
  }, [authLoading, token, user, typeId]);

  async function load() {
    setLoading(true);
    try {
      const [types, list] = await Promise.all([
        adminGetTypes(token!),
        adminGetTypeFields(token!, typeId),
      ]);
      const found = Array.isArray(types) ? types.find((t: any) => t.id === typeId) : null;
      setTypeName(found?.name || `Тип #${typeId}`);
      const raw = (found?.disabledBuiltinFields || "") as string;
      setDisabledBuiltins(new Set(raw.split(",").map((s: string) => s.trim()).filter(Boolean)));
      setFields(Array.isArray(list) ? list : []);
    } catch {
      setError("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setDraft(EMPTY);
    setEditing(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!draft.label?.trim()) { setError("Укажите название поля"); return; }

    const payload = {
      key: draft.key || "",
      label: draft.label || "",
      fieldType: draft.fieldType || "number",
      unit: draft.unit || null,
      placeholder: draft.placeholder || null,
      helpText: draft.helpText || null,
      options: draft.fieldType === "select" ? (draft.options || null) : null,
      minValue: draft.minValue ?? null,
      maxValue: draft.maxValue ?? null,
      isRequired: !!draft.isRequired,
      sortOrder: editing?.sortOrder,
    };

    const wasEditing = !!editing;
    const res = editing
      ? await adminUpdateTypeField(token!, editing.id, payload)
      : await adminCreateTypeField(token!, typeId, payload);
    if (res?.error) { setError(res.error); return; }
    const savedId = editing?.id ?? res?.id ?? null;
    resetForm();
    await load();
    setSuccessMsg(wasEditing ? "Поле обновлено" : "Поле добавлено");
    setTimeout(() => setSuccessMsg(""), 2500);
    if (savedId) {
      setHighlightId(savedId);
      setTimeout(() => setHighlightId(null), 2000);
      // Scroll the fields list into view so the user sees the new entry.
      setTimeout(() => {
        fieldsListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить поле? Значения у объектов тоже будут удалены.")) return;
    setError("");
    setSuccessMsg("");
    const res = await adminDeleteTypeField(token!, id);
    if (res?.error) { setError(res.error); return; }
    await load();
    setSuccessMsg("Поле удалено");
    setTimeout(() => setSuccessMsg(""), 2500);
  }

  async function toggleBuiltin(key: string, enabled: boolean) {
    setError("");
    const prev = new Set(disabledBuiltins);
    const next = new Set(disabledBuiltins);
    if (enabled) next.delete(key); else next.add(key);
    setDisabledBuiltins(next);
    setSavingBuiltins(true);
    const res = await adminUpdateBuiltinFields(token!, typeId, Array.from(next));
    setSavingBuiltins(false);
    if (res?.error) {
      setError(res.error);
      setDisabledBuiltins(prev);
      return;
    }
    setBuiltinsSavedAt(Date.now());
    setTimeout(() => {
      setBuiltinsSavedAt((t) => (t && Date.now() - t >= 2000 ? null : t));
    }, 2100);
  }

  function startEdit(f: FieldItem) {
    setEditing(f);
    setDraft({
      key: f.key,
      label: f.label,
      fieldType: f.fieldType,
      unit: f.unit || "",
      placeholder: f.placeholder || "",
      helpText: f.helpText || "",
      options: f.options || "",
      minValue: f.minValue,
      maxValue: f.maxValue,
      isRequired: f.isRequired,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  const isNumber = draft.fieldType === "number";
  const isSelect = draft.fieldType === "select";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Параметры типа: {typeName}</h1>
          <p className="text-sm text-gray-500 mt-1">Эти поля будут показаны в редакторе объекта при выборе данного типа.</p>
        </div>
        <a href="/dashboard/admin/types/" className="text-sm text-gray-500 hover:text-gray-700">← К типам</a>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Встроенные параметры</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Снимите галочку, чтобы убрать параметр из формы редактора для этого типа. Изменения сохраняются автоматически.
            </p>
          </div>
          {savingBuiltins ? (
            <span className="text-xs text-gray-400">Сохранение…</span>
          ) : builtinsSavedAt ? (
            <span className="text-xs text-emerald-600 font-medium">Сохранено ✓</span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
          {BUILTIN_FIELDS.map((b) => {
            const enabled = !disabledBuiltins.has(b.key);
            return (
              <label key={b.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggleBuiltin(b.key, e.target.checked)}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className={enabled ? "" : "text-gray-400 line-through"}>{b.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="text-sm font-semibold text-gray-900">
          {editing ? `Редактирование: ${editing.label}` : "Новое поле"}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Название (видит админ/владелец)</label>
            <input
              type="text"
              value={draft.label || ""}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Например: Минимальная аренда, часы"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Ключ (латиницей, без пробелов)</label>
            <input
              type="text"
              value={draft.key || ""}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              placeholder="min_hours"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <div className="text-xs text-gray-400 mt-1">Если пусто — сгенерируется из названия.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Тип данных</label>
            <select
              value={draft.fieldType || "number"}
              onChange={(e) => setDraft({ ...draft, fieldType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Единица (необязательно)</label>
            <input
              type="text"
              value={draft.unit || ""}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              placeholder="ч / м² / шт."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!draft.isRequired}
                onChange={(e) => setDraft({ ...draft, isRequired: e.target.checked })}
                className="w-4 h-4 accent-primary-600"
              />
              Обязательное поле
            </label>
          </div>
        </div>

        {isNumber && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Минимум</label>
              <input
                type="number"
                value={draft.minValue ?? ""}
                onChange={(e) => setDraft({ ...draft, minValue: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Максимум</label>
              <input
                type="number"
                value={draft.maxValue ?? ""}
                onChange={(e) => setDraft({ ...draft, maxValue: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        )}

        {isSelect && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Варианты (JSON массив: [{`{"value":"hot","label":"Горячая"}`}])</label>
            <textarea
              value={draft.options || ""}
              onChange={(e) => setDraft({ ...draft, options: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder='[{"value":"v1","label":"Вариант 1"},{"value":"v2","label":"Вариант 2"}]'
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Placeholder (подсказка в поле)</label>
            <input
              type="text"
              value={draft.placeholder || ""}
              onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Пояснение (под полем)</label>
            <input
              type="text"
              value={draft.helpText || ""}
              onChange={(e) => setDraft({ ...draft, helpText: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            {editing ? "Сохранить изменения" : "Добавить поле"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-3 py-2 text-sm text-gray-500">
              Отмена
            </button>
          )}
        </div>
      </form>

      <div ref={fieldsListRef} className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900">
          Поля ({fields.length})
        </div>
        {fields.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            Пока нет полей. Добавьте первое поле выше.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fields.map((f) => (
              <div
                key={f.id}
                className={`px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                  highlightId === f.id ? "bg-emerald-50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{f.label}</span>
                    {f.isRequired && <span className="text-[10px] uppercase tracking-wide text-red-600 font-semibold">обяз.</span>}
                    <span className="text-xs text-gray-400 font-mono">{f.key}</span>
                    <span className="text-xs text-gray-500">· {TYPE_LABELS[f.fieldType] || f.fieldType}</span>
                    {f.unit && <span className="text-xs text-gray-500">· {f.unit}</span>}
                  </div>
                  {f.helpText && <div className="text-xs text-gray-400 mt-0.5 truncate">{f.helpText}</div>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(f)} className="text-xs text-primary-600 hover:text-primary-700">Изменить</button>
                  <button onClick={() => handleDelete(f.id)} className="text-xs text-red-600 hover:text-red-700">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
