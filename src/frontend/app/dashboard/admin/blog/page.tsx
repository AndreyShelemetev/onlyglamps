"use client";

import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { blogAdminList, blogAdminDelete } from "@/lib/dashboard-api";
import Link from "next/link";

interface Article {
  id: number;
  title: string;
  slug: string;
  status: string;
  views: number;
  readTimeMinutes: number;
  createdAt: string;
}

export default function AdminBlogPage() {
  const { user, token } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    blogAdminList(token).then((data) => {
      if (Array.isArray(data)) setArticles(data);
      setLoading(false);
    });
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить статью?")) return;
    if (!token) return;
    const res = await blogAdminDelete(token, id);
    if (res.success) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  const isAdmin = user?.role === "Admin";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Путеводитель</h1>
        <Link
          href="/dashboard/admin/blog/new/"
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition"
        >
          + Новая статья
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Статей пока нет</p>
          <Link href="/dashboard/admin/blog/new/" className="text-primary-600 hover:underline">
            Создать первую статью
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Заголовок</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Slug</th>
                <th className="text-center px-4 py-3">Статус</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">Просмотры</th>
                <th className="text-right px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy-900">{a.title}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{a.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === "Published"
                          ? "bg-green-100 text-green-700"
                          : a.status === "Draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {a.status === "Published" ? "Опубликовано" : a.status === "Draft" ? "Черновик" : "В архиве"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">{a.views}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      href={`/dashboard/admin/blog/${a.id}/edit/`}
                      className="text-primary-600 hover:underline"
                    >
                      Ред.
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-red-500 hover:underline"
                      >
                        Удал.
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
