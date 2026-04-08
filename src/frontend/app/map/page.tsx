import type { Metadata } from "next";
import { fetchMapPoints, fetchObjectTypes } from "@/lib/api";
import { FullscreenMap } from "@/components/FullscreenMap";

export const metadata: Metadata = {
  title: "Карта объектов",
  description:
    "Все глэмпинги, гостевые дома и бани на карте. Выбирайте место для отдыха по расположению.",
  alternates: { canonical: "/map/" },
  robots: { index: true, follow: true },
};

export default async function MapPage() {
  const [points, types] = await Promise.all([
    fetchMapPoints(),
    fetchObjectTypes(),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <FullscreenMap points={points} types={types} />
    </div>
  );
}
