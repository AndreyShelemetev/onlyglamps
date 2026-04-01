"use client";

import { ObjectFormData } from "./types";

interface Props {
  data: ObjectFormData;
  onChange: (patch: Partial<ObjectFormData>) => void;
  isAdmin?: boolean;
}

export function BlockSeo({ data, onChange, isAdmin }: Props) {
  // Auto-generate suggestions
  const autoTitle = data.name ? `${data.name} — аренда посуточно | OnlyGlamps` : "";
  const autoDesc = data.shortDescription || "";

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">SEO</h2>
      <p className="text-xs text-gray-500 mb-4">
        {isAdmin
          ? "Редактирование SEO-полей. Оставьте пустыми для автогенерации."
          : "Автоматически сгенерированные SEO-поля. Полное редактирование доступно администратору."}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          {isAdmin ? (
            <input
              type="text"
              value={data.seoTitle}
              onChange={(e) => onChange({ seoTitle: e.target.value })}
              placeholder={autoTitle || "Будет сгенерирован автоматически"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          ) : (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
              {data.seoTitle || autoTitle || "Будет сгенерирован после заполнения названия"}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          {isAdmin ? (
            <textarea
              value={data.seoDescription}
              onChange={(e) => onChange({ seoDescription: e.target.value })}
              placeholder={autoDesc || "Будет сгенерировано автоматически"}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          ) : (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
              {data.seoDescription || autoDesc || "Будет сгенерировано после заполнения описания"}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
