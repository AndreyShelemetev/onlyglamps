"use client";

import { useState } from "react";
import { PhotoItem } from "./types";

interface Props {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
}

export function BlockPhotos({ photos, onChange }: Props) {
  const [newUrl, setNewUrl] = useState("");

  function addPhoto() {
    const url = newUrl.trim();
    if (!url) return;
    const next: PhotoItem[] = [...photos, { url, alt: "", sortOrder: photos.length + 1 }];
    onChange(next);
    setNewUrl("");
  }

  function removePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sortOrder: i + 1 }));
    onChange(next);
  }

  function updateAlt(idx: number, alt: string) {
    const next = photos.map((p, i) => (i === idx ? { ...p, alt } : p));
    onChange(next);
  }

  function movePhoto(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((p, i) => ({ ...p, sortOrder: i + 1 })));
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Фото</h2>
      <p className="text-xs text-gray-500 mb-4">Минимум 3 фото для модерации. Первое фото — главное.</p>

      {/* Photo list */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <div className="aspect-[4/3] relative">
                <img
                  src={photo.url}
                  alt={photo.alt || ""}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='75' fill='%23ddd'%3E%3Crect width='100' height='75'/%3E%3Ctext x='50' y='40' text-anchor='middle' fill='%23999' font-size='12'%3EОшибка%3C/text%3E%3C/svg%3E";
                  }}
                />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    Главное
                  </span>
                )}
              </div>

              {/* Controls overlay */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => movePhoto(idx, -1)}
                    className="bg-white/90 rounded p-1 text-xs hover:bg-white shadow"
                    title="Переместить влево"
                  >←</button>
                )}
                {idx < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => movePhoto(idx, 1)}
                    className="bg-white/90 rounded p-1 text-xs hover:bg-white shadow"
                    title="Переместить вправо"
                  >→</button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="bg-red-500/90 text-white rounded p-1 text-xs hover:bg-red-600 shadow"
                  title="Удалить"
                >✕</button>
              </div>

              {/* Alt input */}
              <div className="p-1.5">
                <input
                  type="text"
                  value={photo.alt}
                  onChange={(e) => updateAlt(idx, e.target.value)}
                  placeholder="Alt-текст"
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add photo by URL */}
      <div className="flex gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhoto())}
          placeholder="URL фото (https://...)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <button
          type="button"
          onClick={addPhoto}
          disabled={!newUrl.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Добавить
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Вставьте ссылку на изображение. Загрузка файлов будет доступна позже.</p>

      {photos.length > 0 && photos.length < 3 && (
        <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          Добавлено {photos.length} из 3 минимальных фото
        </div>
      )}
    </section>
  );
}
