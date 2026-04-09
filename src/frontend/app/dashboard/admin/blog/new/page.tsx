"use client";

import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { blogAdminCreate } from "@/lib/dashboard-api";
import ArticleEditor from "@/components/editor/ArticleEditor";

export default function NewArticlePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: any) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await blogAdminCreate(token, data);
      if (res.id) {
        router.push("/dashboard/admin/blog/");
      } else {
        alert(res.error || "Ошибка при создании статьи");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Новая статья</h1>
      <ArticleEditor onSave={handleSave} saving={saving} />
    </div>
  );
}
