"use client";

import { useEffect, useRef, useCallback } from "react";
import type { MapPoint } from "@/lib/api";
import { getMarkerPreset, makeTypeClusterer } from "@/lib/map-style";

declare global {
  interface Window {
    ymaps?: any;
  }
}

let scriptLoading = false;
let scriptLoaded = false;
const callbacks: (() => void)[] = [];

function getPointsBounds(points: MapPoint[]) {
  if (points.length === 0) return null;
  const lats = points.map((point) => point.latitude);
  const lons = points.map((point) => point.longitude);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}

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

export function ListingMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const center =
      points.length > 0
        ? [
            points.reduce((s, p) => s + p.latitude, 0) / points.length,
            points.reduce((s, p) => s + p.longitude, 0) / points.length,
          ]
        : [56.63, 47.89];

    const map = new window.ymaps.Map(containerRef.current, {
      center,
      zoom: 8,
      controls: ["zoomControl"],
    });

    map.behaviors.enable("scrollZoom");

    const clusterers = new Map<string, any>();
    const placemarksByType = new Map<string, any[]>();

    const getClusterer = (typeSlug: string) => {
      let clusterer = clusterers.get(typeSlug);
      if (!clusterer) {
        clusterer = makeTypeClusterer(window.ymaps, typeSlug, {
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
        });
        clusterers.set(typeSlug, clusterer);
        map.geoObjects.add(clusterer);
      }
      return clusterer;
    };

    points.forEach((point) => {
      const priceText = point.minPrice
        ? `${Math.round(point.minPrice).toLocaleString("ru-RU")} ₽`
        : "";

      const url = `/${point.region.slug}/${point.cityOrDistrict.slug}/${point.slug}-${point.id}/`;

      const photoHtml = point.mainPhotoUrl
        ? `<img src="${point.mainPhotoUrl}" alt="${point.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
        : "";

      const priceHtml = point.minPrice
        ? `<div style="font-weight:600;color:#5a9600;margin-top:4px;">от ${priceText}</div>`
        : "";

      const balloonContent = `
        <div style="min-width:200px;max-width:260px;">
          ${photoHtml}
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">
            <a href="${url}" style="color:#1e293b;text-decoration:none;">${point.name}</a>
          </div>
          <div style="font-size:12px;color:#64748b;">${point.objectType.name} · ${point.cityOrDistrict.name}</div>
          ${priceHtml}
          <a href="${url}" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#5a9600;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">Подробнее</a>
        </div>
      `;

      const placemark = new window.ymaps.Placemark(
        [point.latitude, point.longitude],
        {
          balloonContentBody: balloonContent,
          hintContent: priceText ? `${point.name} — от ${priceText}` : point.name,
          iconContent: priceText || "",
        },
        {
          preset: getMarkerPreset(point.objectType.slug, Boolean(priceText)),
        }
      );
      (placemark as any).__typeSlug = point.objectType.slug;
      if (!placemarksByType.has(point.objectType.slug)) {
        placemarksByType.set(point.objectType.slug, []);
      }
      placemarksByType.get(point.objectType.slug)!.push(placemark);
    });

    placemarksByType.forEach((placemarks, typeSlug) => {
      getClusterer(typeSlug).add(placemarks);
    });

    if (points.length > 0) {
      map.setBounds(getPointsBounds(points), {
        checkZoomRange: true,
        zoomMargin: 40,
      });
    }

    mapRef.current = map;
  }, [points]);

  useEffect(() => {
    loadYmaps(initMap);
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  if (points.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
        Нет объектов на карте
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
