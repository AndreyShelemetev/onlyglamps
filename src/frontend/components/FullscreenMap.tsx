"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MapPoint } from "@/lib/api";

declare global {
  interface Window {
    ymaps?: any;
  }
}

interface ObjectType {
  id: number;
  name: string;
  slug: string;
}

interface FullscreenMapProps {
  points: MapPoint[];
  types: ObjectType[];
  initialTypeSlug?: string | null;
  initialPageSize?: number;
  initialPointsFiltered?: boolean;
}

let scriptLoading = false;
let scriptLoaded = false;
const callbacks: (() => void)[] = [];

function loadYmaps(cb: () => void) {
  if (scriptLoaded && window.ymaps) {
    cb();
    return;
  }
  callbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;

  const script = document.createElement("script");
  script.src = "https://api-maps.yandex.ru/2.1/?apikey=&lang=ru_RU";
  script.async = true;
  script.onload = () => {
    window.ymaps.ready(() => {
      scriptLoaded = true;
      callbacks.forEach((fn) => fn());
      callbacks.length = 0;
    });
  };
  document.head.appendChild(script);
}

const typeColors: Record<string, string> = {
  glempingi: "islands#darkGreenDotIcon",
  "gostevye-doma": "islands#blueDotIcon",
  bani: "islands#redDotIcon",
  kottedzhi: "islands#orangeDotIcon",
  "bazy-otdykha": "islands#violetDotIcon",
  "park-oteli": "islands#darkOrangeDotIcon",
};

const typeButtonColors: Record<string, { active: string; inactive: string }> = {
  glempingi: {
    active: "bg-primary-600 text-white ring-2 ring-primary-300",
    inactive: "bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200",
  },
  "gostevye-doma": {
    active: "bg-blue-600 text-white ring-2 ring-blue-300",
    inactive: "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200",
  },
  bani: {
    active: "bg-red-600 text-white ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200",
  },
  kottedzhi: {
    active: "bg-accent-500 text-white ring-2 ring-accent-200",
    inactive: "bg-accent-50 text-accent-800 hover:bg-accent-100 border border-accent-200",
  },
  "bazy-otdykha": {
    active: "bg-violet-600 text-white ring-2 ring-violet-300",
    inactive: "bg-violet-50 text-violet-800 hover:bg-violet-100 border border-violet-200",
  },
  "park-oteli": {
    active: "bg-amber-600 text-white ring-2 ring-amber-300",
    inactive: "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200",
  },
};

function formatPrice(price: number | null): string {
  if (!price) return "";
  return `от ${price.toLocaleString("ru-RU")} ₽`;
}

export function FullscreenMap({
  points,
  types,
  initialTypeSlug = null,
  initialPageSize = 80,
  initialPointsFiltered = false,
}: FullscreenMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(initialTypeSlug);
  const activeFilterRef = useRef<string | null>(initialTypeSlug);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>(points);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);
  const mapPointsRef = useRef<MapPoint[]>(points);
  const clustererRef = useRef<any>(null);
  const allPlacemarksRef = useRef<any[]>([]);
  const placemarkIdsRef = useRef<Set<number>>(new Set());
  const boundsWereFitRef = useRef(false);

  const filteredPoints = activeFilter
    ? mapPoints.filter((p) => p.objectType.slug === activeFilter)
    : mapPoints;

  const createPlacemark = useCallback((point: MapPoint) => {
    const slug = point.objectType.slug;
    const regionSlug = point.region.slug;
    const citySlug = point.cityOrDistrict.slug;
    const url = `/${regionSlug}/${citySlug}/${point.slug}-${point.id}/`;

    const photoHtml = point.mainPhotoUrl
      ? `<img src="${point.mainPhotoUrl}" alt="${point.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
      : "";

    const priceHtml = point.minPrice
      ? `<div style="font-weight:600;color:#2563eb;margin-top:4px;">${formatPrice(point.minPrice)}</div>`
      : "";

    const balloonContent = `
      <div style="min-width:200px;max-width:280px;">
        ${photoHtml}
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;">
          <a href="${url}" style="color:#1e293b;text-decoration:none;">${point.name}</a>
        </div>
        <div style="font-size:12px;color:#64748b;">${point.objectType.name} · ${point.cityOrDistrict.name}</div>
        ${priceHtml}
        <a href="${url}" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#16a34a;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">Подробнее</a>
      </div>
    `;

    const placemark = new window.ymaps.Placemark(
      [point.latitude, point.longitude],
      {
        balloonContentBody: balloonContent,
        hintContent: point.name,
      },
      {
        preset: typeColors[slug] || "islands#blueDotIcon",
      }
    );

    (placemark as any).__typeSlug = slug;
    (placemark as any).__pointId = point.id;

    placemark.events.add("click", () => {
      setSelectedPoint(point);
    });

    return placemark;
  }, []);

  const addPointsToMap = useCallback((nextPoints: MapPoint[]) => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!map || !clusterer || !window.ymaps) return;

    const visibleNewPlacemarks: any[] = [];
    for (const point of nextPoints) {
      if (placemarkIdsRef.current.has(point.id)) continue;
      const placemark = createPlacemark(point);
      placemarkIdsRef.current.add(point.id);
      allPlacemarksRef.current.push(placemark);

      if (!activeFilterRef.current || point.objectType.slug === activeFilterRef.current) {
        visibleNewPlacemarks.push(placemark);
      }
    }

    if (visibleNewPlacemarks.length === 0) return;
    clusterer.add(visibleNewPlacemarks);

    if (!boundsWereFitRef.current) {
      const bounds = clusterer.getBounds();
      if (bounds) {
        map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
        boundsWereFitRef.current = true;
      }
    }
  }, [createPlacemark]);

  const mergePoints = useCallback((nextPoints: MapPoint[]) => {
    if (nextPoints.length === 0) return;
    setMapPoints((current) => {
      const seen = new Set(current.map((point) => point.id));
      const merged = [...current];
      for (const point of nextPoints) {
        if (seen.has(point.id)) continue;
        seen.add(point.id);
        merged.push(point);
      }
      return merged;
    });
  }, []);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const currentPoints = mapPointsRef.current;
    const center =
      currentPoints.length > 0
        ? [
            currentPoints.reduce((s, p) => s + p.latitude, 0) / currentPoints.length,
            currentPoints.reduce((s, p) => s + p.longitude, 0) / currentPoints.length,
          ]
        : [56.63, 47.89];

    const map = new window.ymaps.Map(containerRef.current, {
      center,
      zoom: 7,
      controls: ["zoomControl", "geolocationControl"],
    });

    map.behaviors.enable("scrollZoom");

    const clusterer = new window.ymaps.Clusterer({
      preset: "islands#invertedDarkGreenClusterIcons",
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
    });

    map.geoObjects.add(clusterer);
    mapRef.current = map;
    clustererRef.current = clusterer;
    addPointsToMap(currentPoints);
  }, [addPointsToMap]);

  useEffect(() => {
    loadYmaps(initMap);
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      clustererRef.current = null;
      allPlacemarksRef.current = [];
      placemarkIdsRef.current = new Set();
      boundsWereFitRef.current = false;
    };
  }, [initMap]);

  useEffect(() => {
    mapPointsRef.current = mapPoints;
    addPointsToMap(mapPoints);
  }, [mapPoints, addPointsToMap]);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
    if (!mapRef.current || !clustererRef.current) return;
    const map = mapRef.current;
    const clusterer = clustererRef.current;

    clusterer.removeAll();

    const visiblePlacemarks = activeFilter
      ? allPlacemarksRef.current.filter((pm: any) => pm.__typeSlug === activeFilter)
      : allPlacemarksRef.current;
    clusterer.add(visiblePlacemarks);

    if (visiblePlacemarks.length > 0) {
      map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
    }
  }, [activeFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadMorePoints() {
      setIsLoadingPoints(true);
      let page = initialPointsFiltered || points.length === 0 ? 1 : 2;

      while (!cancelled) {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(initialPageSize),
        });
        const res = await fetch(`/api/objects/map-points?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) break;

        const chunk = await res.json();
        if (!Array.isArray(chunk) || chunk.length === 0) break;

        mergePoints(chunk);
        if (chunk.length < initialPageSize) break;

        page += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }

      if (!cancelled) setIsLoadingPoints(false);
    }

    loadMorePoints().catch(() => {
      if (!cancelled) setIsLoadingPoints(false);
    });

    return () => {
      cancelled = true;
    };
  }, [initialPageSize, initialPointsFiltered, mergePoints, points.length]);

  const setFilter = (typeSlug: string | null) => {
    setActiveFilter(typeSlug);
    setSelectedPoint(null);

    const nextUrl = typeSlug
      ? `/map/?type=${encodeURIComponent(typeSlug)}`
      : "/map/";
    window.history.replaceState(null, "", nextUrl);
  };

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
        <button
          onClick={() => setFilter(null)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition ${
            !activeFilter
              ? "bg-navy-800 text-white ring-2 ring-navy-400"
              : "bg-navy-50 text-navy-700 hover:bg-navy-100 border border-navy-200"
          }`}
        >
          Все ({mapPoints.length})
        </button>
        {types.map((type) => {
          const count = mapPoints.filter(
            (p) => p.objectType.slug === type.slug
          ).length;
          if (count === 0) return null;
          const colors = typeButtonColors[type.slug] || {
            active: "bg-gray-700 text-white ring-2 ring-gray-400",
            inactive: "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200",
          };
          const isActive = activeFilter === type.slug;
          return (
            <button
              key={type.slug}
              onClick={() => setFilter(isActive ? null : type.slug)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              {type.name} ({count})
            </button>
          );
        })}
        {isLoadingPoints && (
          <span className="whitespace-nowrap text-xs text-gray-500 px-2">
            Загружаем точки...
          </span>
        )}
      </div>

      {/* Map */}
      <div ref={containerRef} className="flex-1 w-full" />

      {/* Selected point card (mobile) */}
      {selectedPoint && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10 animate-in slide-in-from-bottom-2">
          <button
            onClick={() => setSelectedPoint(null)}
            className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 shadow"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {selectedPoint.mainPhotoUrl && (
            <img
              src={selectedPoint.mainPhotoUrl}
              alt={selectedPoint.name}
              className="w-full h-36 object-cover"
            />
          )}
          <div className="p-4">
            <div className="text-xs text-gray-500 mb-1">
              {selectedPoint.objectType.name} · {selectedPoint.cityOrDistrict.name}
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{selectedPoint.name}</h3>
            {selectedPoint.minPrice && (
              <div className="text-sm font-semibold text-primary-600 mb-3">
                {formatPrice(selectedPoint.minPrice)}
              </div>
            )}
            <a
              href={`/${selectedPoint.region.slug}/${selectedPoint.cityOrDistrict.slug}/${selectedPoint.slug}-${selectedPoint.id}/`}
              className="block text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2 rounded-lg transition"
            >
              Подробнее
            </a>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredPoints.length === 0 && !isLoadingPoints && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 text-lg">Объекты пока не добавлены</p>
          </div>
        </div>
      )}
    </div>
  );
}
