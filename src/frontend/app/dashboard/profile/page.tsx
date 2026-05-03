"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ownerGetProfile, ownerSaveProfile } from "@/lib/dashboard-api";

export default function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "Owner" && user?.role !== "Admin" && user?.role !== "Editor")) {
      window.location.href = "/";
      return;
    }
    ownerGetProfile(token).then((p) => {
      setContactName(p.contactName || "");
      setContactPhone(p.contactPhone || "");
      setContactTelegram(p.contactTelegram || "");
      setLoading(false);
    }).catch(() => {
      setError("Ошибка загрузки профиля");
      setLoading(false);
    });
  }, [authLoading, token, user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(""); setSuccess("");
    setSaving(true);

    try {
      const res = await ownerSaveProfile(token, { contactName, contactPhone, contactTelegram });
      if (res.error) { setError(res.error); } else { setSuccess("Профиль сохранён"); }
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Ошибка сохранения");
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Профиль владельца</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-lg">
        <p className="text-sm text-gray-500 mb-4">
          Контактные данные отображаются при публикации объекта. Минимум один контакт обязателен.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя контактного лица <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ваше имя"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+7 (900) 000-00-00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contactTelegram}
              onChange={(e) => setContactTelegram(e.target.value)}
              placeholder="@username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saving ? "Сохраняю..." : "Сохранить профиль"}
          </button>
        </form>
      </div>
    </div>
  );
}
