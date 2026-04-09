"use client";

import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { blogAdminGet, blogAdminUpdate } from "@/lib/dashboard-api";
import ArticleEditor from "@/components/editor/ArticleEditor";

export default function EditArticlePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    if (!token || !id) return;
    blogAdminGet(token, id).then((data) => {
      if (data && !data.error) {
        setArticle(data);
      }
      setLoading(false);
    });
  }, [token, id]);

  const handleSave = async (data: any) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await blogAdminUpdate(token, id, data);
      if (res.id) {
        router.push("/dashboard/admin/blog/");
      } else {
        alert(res.error || "Ошибка при сохранении");
      }
    } finally {
      setSaving(false);
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

  if (!article) {
    return <p className="text-gray-500">Статья не найдена</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Редактирование статьи</h1>
      <ArticleEditor
        initialData={{
          title: article.title,
          h1: article.h1,
          description: article.description,
          slug: article.slug,
          coverImageUrl: article.coverImageUrl || "",
          content: article.content,
          views: article.views,
          readTimeMinutes: article.readTimeMinutes,
          status: article.status,
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
