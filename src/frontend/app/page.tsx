import type { Metadata } from "next";
import { fetchObjects, fetchRegions, fetchObjectTypes } from "@/lib/api";
import { ObjectCard } from "@/components/ObjectCard";
import { HeroSearch } from "@/components/HeroSearch";

export const metadata: Metadata = {
  title: "OnlyGlamps — глэмпинги, гостевые дома и бани посуточно",
  description:
    "Найдите идеальный глэмпинг, гостевой дом или баню для отдыха на природе. Фото, цены, карта, свободные даты и отзывы.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [{ data: objects }, regions, types] = await Promise.all([
    fetchObjects(),
    fetchRegions(),
    fetchObjectTypes(),
  ]);

  // Якорный регион для "идей" — Московская область, либо первый из списка.
  const anchorRegion =
    regions.find((r) => r.slug === "moskovskaya-oblast" || /москов/i.test(r.name)) ||
    regions[0] ||
    null;

  const intentIdeas: { label: string; emoji: string; param: string }[] = [
    { label: "С горячим чаном", emoji: "♨️", param: "chan=1" },
    { label: "С баней", emoji: "🧖", param: "sauna=1" },
    { label: "У воды", emoji: "💧", param: "u-vody=1" },
    { label: "В лесу", emoji: "🌲", param: "u-lesa=1" },
    { label: "Можно с питомцами", emoji: "🐾", param: "s-pitomtsami=1" },
    { label: "С мангалом", emoji: "🔥", param: "mangal=1" },
  ];

  return (
    <div>
      {/* Hero with blurred background */}
      <section className="relative hero-fallback z-10">
        <div
          className="absolute inset-0 bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-navy-900/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-36 text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Глэмпинги, гостевые дома и бани
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Найдите идеальное место для отдыха на природе
          </p>
          <HeroSearch regions={regions.map((r) => ({ name: r.name, slug: r.slug }))} />
        </div>
      </section>

      {/* Object Types */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">Типы размещения</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {types.map((type) => (
            <a
              key={type.slug}
              href={`/mari-el/${type.slug}/`}
              className="group relative block rounded-2xl overflow-hidden h-44 md:h-52 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              <img
                src={`/types/${type.slug}.jpg`}
                alt={type.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 flex flex-col justify-end h-full p-5">
                <h3 className="text-lg font-bold text-white drop-shadow-md">{type.name}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="bg-navy-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-navy-900 mb-6">Популярные предложения</h2>
          {objects.length === 0 ? (
            <p className="text-navy-500">
              Объекты загружаются... Проверьте, что backend запущен.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {objects.map((obj) => (
                <ObjectCard key={obj.id} obj={obj} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Idea collections (intent-based, UX-only — links use GET filters → noindex by region page) */}
      {anchorRegion && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-navy-900">Идеи для отдыха</h2>
            <span className="text-sm text-navy-500">
              в регионе {anchorRegion.name} · <a href="#regions" className="underline hover:text-primary-600">сменить регион</a>
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {intentIdeas.map((idea) => (
              <a
                key={idea.param}
                href={`/${anchorRegion.slug}/?${idea.param}`}
                className="group flex flex-col items-center justify-center text-center p-4 bg-white rounded-xl border border-navy-200 hover:shadow-md hover:border-primary-300 transition"
              >
                <span className="text-3xl mb-2" aria-hidden>
                  {idea.emoji}
                </span>
                <span className="text-sm font-medium text-navy-900 group-hover:text-primary-700 transition">
                  {idea.label}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Regions */}
      <section id="regions" className="max-w-7xl mx-auto px-4 py-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">Популярные направления</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {regions.map((r) => (
            <a
              key={r.slug}
              href={`/${r.slug}/`}
              className="group block p-5 bg-white rounded-xl hover:shadow-lg transition border border-navy-200 text-center"
            >
              <span className="font-semibold text-navy-900 group-hover:text-primary-600 transition">{r.name}</span>
              {r.cities.length > 0 && (
                <span className="block text-xs text-navy-500 mt-1">
                  {r.cities.map((c) => c.name).join(", ")}
                </span>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-900 py-14">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Сдаёте объект?</h2>
          <p className="text-navy-300 mb-8">
            Разместите глэмпинг, гостевой дом или баню на OnlyGlamps бесплатно
          </p>
          <a
            href="/owners/"
            className="inline-block bg-accent-500 text-white rounded-lg px-8 py-3.5 font-semibold hover:bg-accent-600 transition shadow-lg"
          >
            Разместить объект
          </a>
        </div>
      </section>
    </div>
  );
}
