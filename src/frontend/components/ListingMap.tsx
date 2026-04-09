"use client";

import { useEffect, useRef, useCallback } from "react";
import type { MapPoint } from "@/lib/api";

declare global {
  interface Window {
    ymaps?: any;
  }
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

    const clusterer = new window.ymaps.Clusterer({
      preset: "islands#invertedDarkGreenClusterIcons",
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
    });

    const placemarks = points.map((point) => {
      const priceText = point.minPrice
        ? `${Math.round(point.minPrice).toLocaleString("ru-RU")} ₽`
        : "";

      const balloonContent = `
        <div style="min-width:200px;max-width:260px;">
          ${point.mainPhotoUrl ? `<img src="${point.mainPhotoUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" alt="${point.name}" />` : ""}
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${point.name}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;">${point.objectType.name} · ${point.cityOrDistrict.name}</div>
          ${priceText ? `<div style="font-weight:700;font-size:14px;color:#2a4600;">от ${priceText}</div>` : ""}
        </div>
      `;

      return new window.ymaps.Placemark(
        [point.latitude, point.longitude],
        {
          balloonContentBody: balloonContent,
          hintContent: priceText ? `${point.name} — от ${priceText}` : point.name,
          iconContent: priceText || "",
        },
        {
          preset: priceText
            ? "islands#darkGreenStretchyIcon"
            : "islands#darkGreenDotIcon",
        }
      );
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);

    if (points.length > 0) {
      map.setBounds(clusterer.getBounds(), {
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
