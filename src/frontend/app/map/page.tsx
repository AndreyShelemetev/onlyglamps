import type { Metadata } from "next";
import { fetchMapPoints, fetchObjectTypes } from "@/lib/api";
import { FullscreenMap } from "@/components/FullscreenMap";

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const hasQuery = Object.keys(searchParams).length > 0;

  return {
    title: "Карта объектов",
    description:
      "Все глэмпинги, гостевые дома и бани на карте. Выбирайте место для отдыха по расположению.",
    alternates: { canonical: "/map/" },
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function MapPage({ searchParams }: Props) {
  const [points, types] = await Promise.all([
    fetchMapPoints(),
    fetchObjectTypes(),
  ]);
  const requestedType = typeof searchParams.type === "string" ? searchParams.type : null;
  const initialTypeSlug = requestedType && types.some((type) => type.slug === requestedType)
    ? requestedType
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <FullscreenMap points={points} types={types} initialTypeSlug={initialTypeSlug} />
    </div>
  );
}
