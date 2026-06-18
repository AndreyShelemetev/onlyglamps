const API_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:5000";
const PUBLIC_FETCH_OPTIONS = { next: { revalidate: 300 } };

export interface ObjectListItem {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  capacity: number;
  objectType: { name: string; slug: string };
  region: { name: string; slug: string };
  cityOrDistrict: { name: string; slug: string };
  minPrice: number | null;
  rating: number | null;
  reviewCount: number;
  sourceUrl: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string | null;
  amenities: string[];
  updatedAt: string;
}

export interface ObjectsResponse {
  data: ObjectListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ObjectDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string | null;
  capacity: number;
  beds: number | null;
  area: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  childrenAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  eventsAllowed: boolean;
  deposit: string | null;
  rules: string | null;
  objectType: { name: string; slug: string };
  region: { name: string; slug: string };
  cityOrDistrict: { name: string; slug: string };
  tariffs: { id: number; name: string; price: number; description: string | null }[];
  photos: { id: number; url: string; alt: string | null; sortOrder: number }[];
  amenities: { name: string; slug: string; icon: string | null }[];
  reviews: { id: number; rating: number; text: string; createdAt: string; user: { firstName: string; avatarUrl: string | null } }[];
  rating: number | null;
  reviewCount: number;
  source: { sourceName: string | null; sourceUrl: string | null; sourceType: string | null } | null;
  availability: { date: string; status: string }[];
}

export interface RegionData {
  id: number;
  name: string;
  slug: string;
  objectCount: number;
  typeCounts: TypeCount[];
  cities: {
    id: number;
    name: string;
    slug: string;
    isCity: boolean;
    objectCount: number;
    typeCounts: TypeCount[];
  }[];
}

export interface TypeCount {
  name: string;
  slug: string;
  count: number;
}

export interface PopularQueryItem {
  id: number;
  text: string;
  filterParam: string;
}

export async function fetchObjects(params: Record<string, string> = {}): Promise<ObjectsResponse> {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/objects${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, PUBLIC_FETCH_OPTIONS);
    if (!res.ok) return { data: [], total: 0, page: 1, pageSize: 20 };
    return await res.json();
  } catch {
    return { data: [], total: 0, page: 1, pageSize: 20 };
  }
}

export async function fetchObjectBySlug(slug: string): Promise<ObjectDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/objects/by-slug/${encodeURIComponent(slug)}`, PUBLIC_FETCH_OPTIONS);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchRegions(): Promise<RegionData[]> {
  try {
    const res = await fetch(`${API_URL}/api/regions`, PUBLIC_FETCH_OPTIONS);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchObjectTypes(): Promise<{ id: number; name: string; slug: string; icon?: string; colorFrom?: string; colorTo?: string }[]> {
  try {
    const res = await fetch(`${API_URL}/api/catalog/types`, PUBLIC_FETCH_OPTIONS);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchPopularQueries(): Promise<PopularQueryItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/catalog/popular-queries`, PUBLIC_FETCH_OPTIONS);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface MapPoint {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  objectType: { name: string; slug: string };
  region: { name: string; slug: string };
  cityOrDistrict: { name: string; slug: string };
  minPrice: number | null;
  mainPhotoUrl: string | null;
}

export async function fetchMapPoints(params: Record<string, string> = {}): Promise<MapPoint[]> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API_URL}/api/objects/map-points${qs ? `?${qs}` : ""}`, PUBLIC_FETCH_OPTIONS);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── Blog ──

export interface ArticleListItem {
  id: number;
  title: string;
  h1: string;
  description: string;
  slug: string;
  coverImageUrl: string | null;
  views: number;
  readTimeMinutes: number;
  createdAt: string;
  author: { firstName: string; lastName: string | null };
}

export interface ArticleDetail extends Omit<ArticleListItem, "author"> {
  content: string;
  updatedAt: string;
  author: {
    firstName: string;
    lastName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    vkUrl: string | null;
    telegramUrl: string | null;
  };
}

export interface ArticlesResponse {
  data: ArticleListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchArticles(page = 1, pageSize = 20): Promise<ArticlesResponse> {
  try {
    const res = await fetch(`${API_URL}/api/blog?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
    if (!res.ok) return { data: [], total: 0, page: 1, pageSize: 20 };
    return await res.json();
  } catch {
    return { data: [], total: 0, page: 1, pageSize: 20 };
  }
}

export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/blog/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
