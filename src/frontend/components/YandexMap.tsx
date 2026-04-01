"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    ymaps?: any;
  }
}

interface YandexMapProps {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  zoom?: number;
  className?: string;
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

export function YandexMap({ latitude, longitude, name, address, zoom = 14, className }: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    loadYmaps(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new window.ymaps.Map(containerRef.current, {
        center: [latitude, longitude],
        zoom,
        controls: ["zoomControl"],
      });

      const placemark = new window.ymaps.Placemark(
        [latitude, longitude],
        {
          balloonContentHeader: name || "",
          balloonContentBody: address || "",
        },
        {
          preset: "islands#redDotIcon",
        }
      );

      map.geoObjects.add(placemark);
      map.behaviors.disable("scrollZoom");
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, name, address, zoom]);

  return <div ref={containerRef} className={className || "w-full h-48 rounded-lg overflow-hidden"} />;
}
