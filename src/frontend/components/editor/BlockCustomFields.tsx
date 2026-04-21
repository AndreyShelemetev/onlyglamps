"use client";

import { useEffect, useState } from "react";
import { fetchTypeFields } from "@/lib/dashboard-api";

export interface TypeFieldSchema {
  id: number;
  key: string;
  label: string;
  fieldType: string;
  unit?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
  options?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  isRequired?: boolean;
  sortOrder?: number;
}

export type CustomFieldsMap = Record<string, string | number | boolean | null>;

interface Props {
  objectTypeId: number;
  values: CustomFieldsMap;
  onChange: (values: CustomFieldsMap) => void;
  // Optional pre-fetched schema (e.g. from object payload); if omitted we fetch it.
  schema?: TypeFieldSchema[] | null;
}

function parseOptions(raw?: string | null): { value: string; label: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((o) => o && typeof o === "object")
        .map((o: any) => ({ value: String(o.value ?? ""), label: String(o.label ?? o.value ?? "") }));
    }
  } catch {
    // fall through
  }
  return [];
}

export function BlockCustomFields({ objectTypeId, values, onChange, schema }: Props) {
  // Use passed-in schema only when it matches the current objectTypeId (parent is responsible).
  // Otherwise fetch fresh schema on objectTypeId change.
  const [fields, setFields] = useState<TypeFieldSchema[]>(schema || []);
  const [loading, setLoading] = useState(!schema);

  useEffect(() => {
    if (!objectTypeId) { setFields([]); setLoading(false); return; }
    if (schema) {
      setFields(schema);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchTypeFields(objectTypeId).then((list) => {
      if (cancelled) return;
      setFields(Array.isArray(list) ? list : []);
    }).catch(() => {
      if (!cancelled) setFields([]);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [objectTypeId, schema]);

  function update(key: string, val: string | number | boolean | null) {
    onChange({ ...values, [key]: val });
  }

  if (!objectTypeId) return null;
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="text-sm text-gray-500">Загрузка дополнительных параметров...</div>
      </div>
    );
  }
  if (fields.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Параметры для этого типа</h2>
        <span className="text-xs text-gray-400">{fields.length} {fields.length === 1 ? "поле" : "полей"}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => {
          const raw = values[f.key];
          const required = !!f.isRequired;
          const labelEl = (
            <label className="text-xs text-gray-500 block mb-1">
              {f.label}{required && <span className="text-red-500 ml-0.5">*</span>}
              {f.unit && <span className="text-gray-400 ml-1">({f.unit})</span>}
            </label>
          );

          if (f.fieldType === "boolean") {
            const checked = raw === true || raw === "true";
            return (
              <div key={f.key} className="flex items-center gap-2 md:col-span-2">
                <input
                  id={`cf_${f.key}`}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => update(f.key, e.target.checked)}
                  className="w-4 h-4 accent-primary-600"
                />
                <label htmlFor={`cf_${f.key}`} className="text-sm text-gray-700 cursor-pointer">
                  {f.label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.helpText && <span className="text-xs text-gray-400 ml-2">{f.helpText}</span>}
              </div>
            );
          }

          if (f.fieldType === "select") {
            const opts = parseOptions(f.options);
            return (
              <div key={f.key}>
                {labelEl}
                <select
                  value={raw == null ? "" : String(raw)}
                  onChange={(e) => update(f.key, e.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">— не выбрано —</option>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {f.helpText && <div className="text-xs text-gray-400 mt-1">{f.helpText}</div>}
              </div>
            );
          }

          if (f.fieldType === "textarea") {
            return (
              <div key={f.key} className="md:col-span-2">
                {labelEl}
                <textarea
                  value={raw == null ? "" : String(raw)}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder || ""}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
                {f.helpText && <div className="text-xs text-gray-400 mt-1">{f.helpText}</div>}
              </div>
            );
          }

          if (f.fieldType === "number") {
            return (
              <div key={f.key}>
                {labelEl}
                <input
                  type="number"
                  value={raw == null || raw === "" ? "" : String(raw)}
                  min={f.minValue ?? undefined}
                  max={f.maxValue ?? undefined}
                  step="any"
                  onChange={(e) => update(f.key, e.target.value === "" ? null : Number(e.target.value))}
                  placeholder={f.placeholder || ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
                {f.helpText && <div className="text-xs text-gray-400 mt-1">{f.helpText}</div>}
              </div>
            );
          }

          // text (default)
          return (
            <div key={f.key}>
              {labelEl}
              <input
                type="text"
                value={raw == null ? "" : String(raw)}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder || ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              {f.helpText && <div className="text-xs text-gray-400 mt-1">{f.helpText}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
