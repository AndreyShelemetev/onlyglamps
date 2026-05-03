"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminResetUserPassword,
  adminDeleteUser,
} from "@/lib/dashboard-api";

interface AdminUser {
  id: number;
  email: string | null;
  username: string | null;
  firstName: string;
  lastName: string | null;
  role: string;
  hasPassword: boolean;
  hasTelegram: boolean;
  objectCount: number;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  Owner: "Арендодатель",
  Editor: "Редактор",
  Author: "Автор блога",
  User: "Пользователь",
  Admin: "Администратор",
};

const ASSIGNABLE_ROLES = ["Owner", "Editor", "Author"] as const;

export default function AdminUsersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [search, setSearch] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "Owner",
  });
  const [submitting, setSubmitting] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", role: "Owner" });

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "Admin") {
      window.location.href = "/";
      return;
    }
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, token, user]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const params: Record<string, string> = {};
      if (filterRole) params.role = filterRole;
      if (search.trim()) params.search = search.trim();
      const res = await adminGetUsers(token!, params);
      if (Array.isArray(res)) setUsers(res);
      else setError(res?.error || "Ошибка загрузки");
    } catch {
      setError("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.firstName) return;
    setSubmitting(true);
    const res = await adminCreateUser(token!, {
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      role: form.role,
    });
    setSubmitting(false);
    if (res?.error) {
      alert(res.error);
      return;
    }
    setForm({ email: "", password: "", firstName: "", lastName: "", role: "Owner" });
    setShowCreate(false);
    await loadUsers();
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditForm({ firstName: u.firstName, lastName: u.lastName ?? "", role: u.role });
  }

  async function handleUpdate(id: number) {
    const res = await adminUpdateUser(token!, id, {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      role: editForm.role,
    });
    if (res?.error) {
      alert(res.error);
      return;
    }
    setEditingId(null);
    await loadUsers();
  }

  async function handleResetPassword(id: number) {
    const password = prompt("Новый пароль (минимум 6 символов):");
    if (!password) return;
    const res = await adminResetUserPassword(token!, id, password);
    if (res?.error) {
      alert(res.error);
      return;
    }
    alert("Пароль обновлён");
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить пользователя? Это действие нельзя отменить.")) return;
    const res = await adminDeleteUser(token!, id);
    if (res?.error) {
      alert(res.error);
      return;
    }
    await loadUsers();
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
        >
          {showCreate ? "Отмена" : "+ Создать аккаунт"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-3"
        >
          <h2 className="text-lg font-semibold text-gray-900">Новый аккаунт</h2>
          <p className="text-sm text-gray-500">
            Выберите роль: <b>Редактор</b> — для сотрудников, добавляющих объекты.
            <b> Арендодатель</b> — для владельцев объектов. <b>Автор</b> — для авторов блога.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">Email *</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Пароль *</span>
              <input
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Имя *</span>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Фамилия</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm text-gray-700">Роль *</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]} ({r})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {submitting ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Все роли</option>
          <option value="Owner">Арендодатели</option>
          <option value="Editor">Редакторы</option>
          <option value="Author">Авторы</option>
          <option value="Admin">Администраторы</option>
          <option value="User">Пользователи</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по email/имени"
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <button
          onClick={() => loadUsers()}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          Обновить
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Имя</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Роль</th>
                <th className="text-left px-4 py-3">Объектов</th>
                <th className="text-left px-4 py-3">Вход</th>
                <th className="text-right px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center px-4 py-8 text-gray-400">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500">{u.id}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Имя"
                          />
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Фамилия"
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {u.firstName} {u.lastName ?? ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isEditing && u.role !== "Admin" ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            u.role === "Admin"
                              ? "bg-red-50 text-red-700"
                              : u.role === "Editor"
                              ? "bg-blue-50 text-blue-700"
                              : u.role === "Owner"
                              ? "bg-green-50 text-green-700"
                              : u.role === "Author"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.objectCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.hasPassword && <span className="mr-2">пароль</span>}
                      {u.hasTelegram && <span>Telegram</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdate(u.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 mr-2"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          {u.role !== "Admin" && (
                            <>
                              <button
                                onClick={() => startEdit(u)}
                                className="text-xs text-primary-600 hover:text-primary-700 mr-3"
                              >
                                Изменить
                              </button>
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                className="text-xs text-gray-600 hover:text-gray-800 mr-3"
                              >
                                Пароль
                              </button>
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Удалить
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
