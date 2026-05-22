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

export function MapPanel({ points, regionName }: { points: MapPoint[]; regionName?: string }) {
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
      zoom: 7,
      controls: ["zoomControl", "geolocationControl"],
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
          clusterHideIconOnBalloonOpen: false,
          geoObjectHideIconOnBalloonOpen: false,
        });
        clusterers.set(typeSlug, clusterer);
        map.geoObjects.add(clusterer);
      }
      return clusterer;
    };

    points.forEach((point) => {
      const balloonContent = `
        <div style=\"min-width:180px;max-width:240px;\">
          <div style=\"font-weight:700;font-size:14px;margin-bottom:4px;\">${point.name}</div>
          <div style=\"font-size:12px;color:#64748b;\">${point.objectType.name} · ${point.cityOrDistrict.name}</div>
        </div>
      `;
      const placemark = new window.ymaps.Placemark(
        [point.latitude, point.longitude],
        {
          balloonContentBody: balloonContent,
          hintContent: point.name,
        },
        {
          preset: getMarkerPreset(point.objectType.slug),
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
      map.setBounds(getPointsBounds(points), { checkZoomRange: true, zoomMargin: 40 });
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

  return (
    <div className="w-full h-80 md:h-[420px] rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 sticky top-6">
      <div ref={containerRef} className="w-full h-full" />
      {regionName && (
        <div className="absolute left-0 top-0 px-4 py-2 text-base font-bold text-navy-900 bg-white/80 rounded-br-2xl">
          {regionName}
        </div>
      )}
    </div>
  );
}
