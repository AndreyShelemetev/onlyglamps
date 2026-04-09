"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { blogUploadImage } from "@/lib/dashboard-api";

interface ArticleEditorProps {
  initialData?: {
    title: string;
    h1: string;
    description: string;
    slug: string;
    coverImageUrl: string;
    content: string;
    views: number;
    readTimeMinutes: number;
    status: string;
  };
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

function generateSlug(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

export default function ArticleEditor({ initialData, onSave, saving }: ArticleEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [h1, setH1] = useState(initialData?.h1 || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [views, setViews] = useState(initialData?.views ?? Math.floor(Math.random() * 200) + 100);
  const [readTime, setReadTime] = useState(initialData?.readTimeMinutes ?? Math.floor(Math.random() * 10) + 3);
  const [status, setStatus] = useState(initialData?.status || "Draft");
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialData) {
      setSlug(generateSlug(val));
    }
  };

  const execCommand = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  const insertH2 = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    execCommand("formatBlock", "h2");
  };

  const insertImage = () => {
    const url = prompt("URL изображения:");
    if (url) {
      execCommand("insertImage", url);
    }
  };

  const insertLink = () => {
    const url = prompt("URL ссылки:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const syncContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    syncContent();
    const html = editorRef.current?.innerHTML || content;
    await onSave({
      title,
      h1: h1 || title,
      description,
      slug,
      coverImageUrl: coverImageUrl || null,
      content: html || "",
      views,
      readTimeMinutes: readTime,
      status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title (SEO)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Заголовок для поисковиков"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none"
        />
      </div>

      {/* H1 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">H1 (заголовок на странице)</label>
        <input
          type="text"
          value={h1}
          onChange={(e) => setH1(e.target.value)}
          placeholder="Заголовок на странице"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (SEO)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Мета-описание"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none resize-y"
        />
      </div>

      {/* Slug + Cover */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none font-mono"
          />
        </div>
      </div>

      {/* Cover image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Обложка статьи</label>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !token) return;
            setUploading(true);
            try {
              const res = await blogUploadImage(token, file);
              if (res.url) {
                setCoverImageUrl(res.url);
              } else {
                alert(res.error || "Ошибка загрузки");
              }
            } finally {
              setUploading(false);
              if (coverInputRef.current) coverInputRef.current.value = "";
            }
          }}
        />
        <div className="flex items-start gap-4">
          {coverImageUrl ? (
            <div className="relative w-48 aspect-[16/9] rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
              <img src={coverImageUrl} alt="Обложка" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setCoverImageUrl("")}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-48 aspect-[16/9] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
              Нет обложки
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploading}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              {uploading ? "Загрузка..." : "Загрузить изображение"}
            </button>
            <input
              type="text"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="или вставьте URL"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Views, Read time, Status */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Просмотры</label>
          <input
            type="number"
            value={views}
            onChange={(e) => setViews(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Время чтения (мин)</label>
          <input
            type="number"
            value={readTime}
            onChange={(e) => setReadTime(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none"
          >
            <option value="Draft">Черновик</option>
            <option value="Published">Опубликовано</option>
            <option value="Archived">В архиве</option>
          </select>
        </div>
      </div>

      {/* Rich text editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Содержание статьи</label>
          <button
            type="button"
            onClick={() => {
              syncContent();
              setShowPreview(!showPreview);
            }}
            className="text-xs text-primary-600 hover:underline"
          >
            {showPreview ? "Редактор" : "Предпросмотр"}
          </button>
        </div>

        {showPreview ? (
          <div
            className="border border-gray-300 rounded-lg p-4 min-h-[400px] prose prose-sm max-w-none bg-white"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 border border-gray-300 border-b-0 rounded-t-lg p-2 bg-gray-50">
              <button type="button" onClick={() => execCommand("bold")} className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded" title="Жирный">B</button>
              <button type="button" onClick={() => execCommand("italic")} className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded" title="Курсив">I</button>
              <button type="button" onClick={() => execCommand("underline")} className="px-2 py-1 text-sm underline hover:bg-gray-200 rounded" title="Подчёркнутый">U</button>
              <span className="w-px bg-gray-300 mx-1" />
              <button type="button" onClick={insertH2} className="px-2 py-1 text-xs font-bold hover:bg-gray-200 rounded" title="Заголовок H2">H2</button>
              <button type="button" onClick={() => execCommand("formatBlock", "p")} className="px-2 py-1 text-xs hover:bg-gray-200 rounded" title="Параграф">¶</button>
              <span className="w-px bg-gray-300 mx-1" />
              <button type="button" onClick={() => execCommand("insertUnorderedList")} className="px-2 py-1 text-sm hover:bg-gray-200 rounded" title="Список">•</button>
              <button type="button" onClick={() => execCommand("insertOrderedList")} className="px-2 py-1 text-sm hover:bg-gray-200 rounded" title="Нум. список">1.</button>
              <span className="w-px bg-gray-300 mx-1" />
              <button type="button" onClick={insertLink} className="px-2 py-1 text-sm hover:bg-gray-200 rounded" title="Ссылка">🔗</button>
              <button type="button" onClick={insertImage} className="px-2 py-1 text-sm hover:bg-gray-200 rounded" title="Изображение">🖼</button>
              <span className="w-px bg-gray-300 mx-1" />
              <button type="button" onClick={() => execCommand("removeFormat")} className="px-2 py-1 text-xs hover:bg-gray-200 rounded text-red-500" title="Очистить форматирование">✕</button>
            </div>

            {/* Content editable area */}
            <div
              ref={editorRef}
              contentEditable
              onBlur={syncContent}
              dangerouslySetInnerHTML={{ __html: content }}
              className="border border-gray-300 rounded-b-lg p-4 min-h-[400px] focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none prose prose-sm max-w-none bg-white"
            />
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title || !slug}
          className="bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        <a href="/dashboard/admin/blog/" className="text-gray-500 hover:text-gray-700 text-sm">
          Отмена
        </a>
      </div>
    </div>
  );
}
