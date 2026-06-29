"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}

export function SafeImage({ src, alt, className, loading = "lazy", fetchPriority = "auto" }: Props) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-2 ${className || ""}`}>
        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Z" />
        </svg>
        <span className="text-xs text-gray-400">Фото недоступно</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={loading === "eager" ? "sync" : "async"}
      fetchPriority={fetchPriority}
      onError={() => setError(true)}
    />
  );
}
