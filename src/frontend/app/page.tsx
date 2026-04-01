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

  return (
    <div>
      {/* Hero with blurred background */}
      <section className="relative overflow-hidden hero-fallback">
        <div
          className="absolute inset-0 bg-cover bg-center"
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
          <HeroSearch />
        </div>
      </section>

      {/* Object Types */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">Типы размещения</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {types.map((type) => {
            const fallbackIcons: Record<string, string> = {
              'baza-otdykha': '🏕️', 'bani': '🧖', 'glempingi': '⛺',
              'gostevye-doma': '🏡', 'arenda-bessedok': '🌲', 'eko-park': '🌿',
            };
            const fallbackColors: Record<string, [string, string]> = {
              'baza-otdykha': ['#10b981', '#047857'], 'bani': ['#f97316', '#dc2626'],
              'glempingi': ['#38bdf8', '#0e7490'], 'gostevye-doma': ['#fcd34d', '#d97706'],
              'arenda-bessedok': ['#8b5cf6', '#4338ca'], 'eko-park': ['#a3e635', '#15803d'],
            };
            const icon = type.icon || fallbackIcons[type.slug] || '🏠';
            const [cf, ct] = [
              type.colorFrom || fallbackColors[type.slug]?.[0] || '#64748b',
              type.colorTo || fallbackColors[type.slug]?.[1] || '#334155',
            ];
            return (
              <a
                key={type.slug}
                href={`/mari-el/${type.slug}/`}
                className="group relative block rounded-2xl overflow-hidden p-6 h-36 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                style={{ background: `linear-gradient(135deg, ${cf}, ${ct})` }}
              >
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-80 group-hover:opacity-100 transition drop-shadow-lg">{icon}</span>
                <div className="relative z-10 flex flex-col justify-end h-full">
                  <h3 className="text-lg font-bold text-white drop-shadow">{type.name}</h3>
                </div>
              </a>
            );
          })}
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

      {/* Regions */}
      <section className="max-w-7xl mx-auto px-4 py-12">
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
