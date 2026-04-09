"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  getAuthorProfile,
  updateAuthorProfile,
  uploadAuthorAvatar,
} from "@/lib/dashboard-api";

export default function AuthorProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [vkUrl, setVkUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Author" && user?.role !== "Admin")) {
      window.location.href = "/";
      return;
    }
    getAuthorProfile(token)
      .then((p) => {
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setBio(p.bio || "");
        setVkUrl(p.vkUrl || "");
        setTelegramUrl(p.telegramUrl || "");
        setAvatarUrl(p.avatarUrl || null);
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки профиля");
        setLoading(false);
      });
  }, [authLoading, token, user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await updateAuthorProfile(token, {
        firstName,
        lastName: lastName || null,
        bio: bio || null,
        vkUrl: vkUrl || null,
        telegramUrl: telegramUrl || null,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Профиль сохранён");
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError("");

    try {
      const res = await uploadAuthorAvatar(token, file);
      if (res.error) {
        setError(res.error);
      } else {
        setAvatarUrl(res.url);
      }
    } catch {
      setError("Ошибка загрузки фото");
    } finally {
      setUploading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Профиль автора</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-lg">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Аватар"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-gray-400">👤</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              {uploading ? "Загрузка..." : "Загрузить фото"}
            </button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG или WebP, до 5 МБ</p>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Имя"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фамилия
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              О себе
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Расскажите о себе: чем занимаетесь, о чём пишете..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VK
            </label>
            <input
              type="url"
              value={vkUrl}
              onChange={(e) => setVkUrl(e.target.value)}
              placeholder="https://vk.com/username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram
            </label>
            <input
              type="url"
              value={telegramUrl}
              onChange={(e) => setTelegramUrl(e.target.value)}
              placeholder="https://t.me/username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !firstName.trim()}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saving ? "Сохраняю..." : "Сохранить профиль"}
          </button>
        </form>
      </div>
    </div>
  );
}
