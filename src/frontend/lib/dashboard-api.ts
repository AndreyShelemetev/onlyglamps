// Client-side API helper for authenticated requests
const API_BASE = "/api";

async function authFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("og_token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }
  return res;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) return { error: text.slice(0, 200) };
    return { error: "Невалидный ответ сервера" };
  }
}

// === Owner API ===

export async function ownerGetObjects(token: string) {
  const res = await authFetch("/owner/objects", token);
  return safeJson(res);
}

export async function ownerGetObject(token: string, id: number) {
  const res = await authFetch(`/owner/objects/${id}`, token);
  return safeJson(res);
}

export async function ownerCreateObject(token: string, data: any) {
  const res = await authFetch("/owner/objects", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function ownerUpdateObject(token: string, id: number, data: any) {
  const res = await authFetch(`/owner/objects/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function ownerSaveTariffs(token: string, id: number, tariffs: any[]) {
  const res = await authFetch(`/owner/objects/${id}/tariffs`, token, { method: "PUT", body: JSON.stringify(tariffs) });
  return safeJson(res);
}

export async function ownerSavePhotos(token: string, id: number, photos: any[]) {
  const res = await authFetch(`/owner/objects/${id}/photos`, token, { method: "PUT", body: JSON.stringify(photos) });
  return safeJson(res);
}

export async function ownerSaveCalendar(token: string, id: number, entries: any[]) {
  const res = await authFetch(`/owner/objects/${id}/calendar`, token, { method: "PUT", body: JSON.stringify(entries) });
  return safeJson(res);
}

export async function ownerSubmitObject(token: string, id: number) {
  const res = await authFetch(`/owner/objects/${id}/submit`, token, { method: "POST" });
  return safeJson(res);
}

export async function ownerArchiveObject(token: string, id: number) {
  const res = await authFetch(`/owner/objects/${id}/archive`, token, { method: "POST" });
  return safeJson(res);
}

export async function ownerGetProfile(token: string) {
  const res = await authFetch("/owner/profile", token);
  return safeJson(res);
}

export async function ownerSaveProfile(token: string, data: any) {
  const res = await authFetch("/owner/profile", token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

// === Admin API ===

export async function adminGetObjects(token: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`/admin/objects${qs ? `?${qs}` : ""}`, token);
  return safeJson(res);
}

export async function adminGetObject(token: string, id: number) {
  const res = await authFetch(`/admin/objects/${id}`, token);
  return safeJson(res);
}

export async function adminApproveObject(token: string, id: number) {
  const res = await authFetch(`/admin/objects/${id}/approve`, token, { method: "POST" });
  return safeJson(res);
}

export async function adminRejectObject(token: string, id: number, comment: string) {
  const res = await authFetch(`/admin/objects/${id}/reject`, token, { method: "POST", body: JSON.stringify({ comment }) });
  return safeJson(res);
}

export async function adminArchiveObject(token: string, id: number) {
  const res = await authFetch(`/admin/objects/${id}/archive`, token, { method: "POST" });
  return safeJson(res);
}

export async function adminUpdateSeo(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/objects/${id}/seo`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

// Admin locations
export async function adminGetRegions(token: string) {
  const res = await authFetch("/admin/regions", token);
  return safeJson(res);
}

export async function adminCreateRegion(token: string, data: any) {
  const res = await authFetch("/admin/regions", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateRegion(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/regions/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminDeleteRegion(token: string, id: number) {
  const res = await authFetch(`/admin/regions/${id}`, token, { method: "DELETE" });
  return safeJson(res);
}

export async function adminGetCities(token: string, regionId?: number) {
  const qs = regionId ? `?regionId=${regionId}` : "";
  const res = await authFetch(`/admin/cities${qs}`, token);
  return safeJson(res);
}

export async function adminCreateCity(token: string, data: any) {
  const res = await authFetch("/admin/cities", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateCity(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/cities/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminDeleteCity(token: string, id: number) {
  const res = await authFetch(`/admin/cities/${id}`, token, { method: "DELETE" });
  return safeJson(res);
}

export async function adminGetTypes(token: string) {
  const res = await authFetch("/admin/types", token);
  return safeJson(res);
}

export async function adminCreateType(token: string, data: any) {
  const res = await authFetch("/admin/types", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateType(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/types/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminGetTags(token: string) {
  const res = await authFetch("/admin/tags", token);
  return safeJson(res);
}

export async function adminCreateTag(token: string, data: any) {
  const res = await authFetch("/admin/tags", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateTag(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/tags/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminDeleteTag(token: string, id: number) {
  const res = await authFetch(`/admin/tags/${id}`, token, { method: "DELETE" });
  return safeJson(res);
}

export async function adminGetAmenities(token: string) {
  const res = await authFetch("/admin/amenities", token);
  return safeJson(res);
}

export async function adminCreateAmenity(token: string, data: any) {
  const res = await authFetch("/admin/amenities", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateAmenity(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/amenities/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminDeleteAmenity(token: string, id: number) {
  const res = await authFetch(`/admin/amenities/${id}`, token, { method: "DELETE" });
  return safeJson(res);
}

// Admin object CRUD
export async function adminCreateObject(token: string, data: any) {
  const res = await authFetch("/admin/objects", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminEditObject(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/objects/${id}/edit`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminSaveTariffs(token: string, id: number, tariffs: any[]) {
  const res = await authFetch(`/admin/objects/${id}/tariffs`, token, { method: "PUT", body: JSON.stringify(tariffs) });
  return safeJson(res);
}

export async function adminSavePhotos(token: string, id: number, photos: any[]) {
  const res = await authFetch(`/admin/objects/${id}/photos`, token, { method: "PUT", body: JSON.stringify(photos) });
  return safeJson(res);
}

export async function adminSaveCalendar(token: string, id: number, entries: any[]) {
  const res = await authFetch(`/admin/objects/${id}/calendar`, token, { method: "PUT", body: JSON.stringify(entries) });
  return safeJson(res);
}

export async function adminDirectPublish(token: string, id: number) {
  const res = await authFetch(`/admin/objects/${id}/publish`, token, { method: "POST" });
  return safeJson(res);
}

export async function adminGetSeo(token: string) {
  const res = await authFetch("/admin/seo", token);
  return safeJson(res);
}

export async function adminCreateSeo(token: string, data: any) {
  const res = await authFetch("/admin/seo", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateSeoMeta(token: string, id: number, data: any) {
  const res = await authFetch(`/admin/seo/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

// Admin object-type dynamic fields (parameters)
export async function adminGetTypeFields(token: string, typeId: number) {
  const res = await authFetch(`/admin/types/${typeId}/fields`, token);
  return safeJson(res);
}

export async function adminCreateTypeField(token: string, typeId: number, data: any) {
  const res = await authFetch(`/admin/types/${typeId}/fields`, token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminUpdateTypeField(token: string, fieldId: number, data: any) {
  const res = await authFetch(`/admin/fields/${fieldId}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function adminDeleteTypeField(token: string, fieldId: number) {
  const res = await authFetch(`/admin/fields/${fieldId}`, token, { method: "DELETE" });
  return safeJson(res);
}

// Public: dynamic fields schema for a type (used on object editor)
export async function fetchTypeFields(typeId: number) {
  const res = await fetch(`${API_BASE}/catalog/types/${typeId}/fields`);
  return safeJson(res);
}

// Catalog lookups (public)
export async function fetchCatalogAmenities() {
  const res = await fetch(`${API_BASE}/catalog/amenities`);
  return safeJson(res);
}

export async function fetchCatalogRegions() {
  const res = await fetch(`${API_BASE}/regions`);
  return safeJson(res);
}

export async function fetchCatalogCities() {
  const res = await fetch(`${API_BASE}/regions`);
  const regions = await res.json();
  const cities: { id: number; name: string; slug: string; regionId: number }[] = [];
  for (const r of regions) {
    for (const c of r.cities || []) {
      cities.push({ id: c.id, name: c.name, slug: c.slug, regionId: r.id });
    }
  }
  return cities;
}

export async function fetchCatalogTypes() {
  const res = await fetch(`${API_BASE}/catalog/types`);
  return safeJson(res);
}

export async function fetchCatalogTags() {
  const res = await fetch(`${API_BASE}/catalog/tags`);
  return safeJson(res);
}

// === Blog Admin API ===

export interface BlogArticlePayload {
  title: string;
  h1: string;
  description: string;
  slug: string;
  coverImageUrl: string | null;
  content: string;
  views: number;
  readTimeMinutes: number;
  status: string;
}

export async function blogAdminList(token: string) {
  const res = await authFetch("/blog/admin/list", token);
  return safeJson(res);
}

export async function blogAdminGet(token: string, id: number) {
  const res = await authFetch(`/blog/admin/${id}`, token);
  return safeJson(res);
}

export async function blogAdminCreate(token: string, data: BlogArticlePayload) {
  const res = await authFetch("/blog/admin", token, { method: "POST", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function blogAdminUpdate(token: string, id: number, data: BlogArticlePayload) {
  const res = await authFetch(`/blog/admin/${id}`, token, { method: "PUT", body: JSON.stringify(data) });
  return safeJson(res);
}

export async function blogAdminDelete(token: string, id: number) {
  const res = await authFetch(`/blog/admin/${id}`, token, { method: "DELETE" });
  if (res.ok) return { success: true };
  return safeJson(res);
}

export async function blogUploadImage(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/blog/admin/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 401) {
    localStorage.removeItem("og_token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }
  return safeJson(res);
}

// ── Author profile ──

export async function getAuthorProfile(token: string) {
  const res = await authFetch("/blog/author/profile", token);
  return safeJson(res);
}

export async function updateAuthorProfile(
  token: string,
  data: {
    firstName: string;
    lastName?: string | null;
    bio?: string | null;
    vkUrl?: string | null;
    telegramUrl?: string | null;
  }
) {
  const res = await authFetch("/blog/author/profile", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return safeJson(res);
}

export async function uploadAuthorAvatar(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/blog/author/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 401) {
    localStorage.removeItem("og_token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }
  return safeJson(res);
}
