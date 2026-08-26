import { ObjectDetail, ObjectListItem, RegionData } from "@/lib/api";
import { YandexMap } from "./YandexMap";
import { ImageSlider } from "./ImageSlider";
import { ObjectCard } from "./ObjectCard";
import { ObjectTabs } from "./ObjectTabs";
import { Accordion } from "./Tabs";
import { AmenityIcon, Icons } from "./AmenityIcon";
import { splitDescriptionByH3 } from "@/lib/desc";
import { ObjectLinkBlock, RegionLinkBlock } from "./InternalLinkBlocks";

export function ObjectDetailView({
  obj,
  nearby = [],
  glampingLinks = [],
  regionLinks = [],
}: {
  obj: ObjectDetail;
  nearby?: ObjectListItem[];
  glampingLinks?: ObjectListItem[];
  regionLinks?: RegionData[];
}) {
  // ── FAQ (drives both Accordion and FAQPage JSON-LD) ──────────────────────
  const faq: { q: string; a: string }[] = [];
  if (obj.checkInTime || obj.checkOutTime) {
    faq.push({
      q: "Когда заезд и выезд?",
      a: `Заезд${obj.checkInTime ? ` с ${obj.checkInTime}` : " по согласованию"}, выезд${obj.checkOutTime ? ` до ${obj.checkOutTime}` : " по согласованию"}.`,
    });
  }
  faq.push({
    q: "Можно ли с детьми?",
    a: obj.childrenAllowed
      ? "Да, объект подходит для отдыха с детьми."
      : "Размещение с детьми не предусмотрено — уточните у владельца.",
  });
  faq.push({
    q: "Можно ли с питомцами?",
    a: obj.petsAllowed
      ? "Да, можно с питомцами. Уточните условия у владельца."
      : "С питомцами нельзя.",
  });
  if (obj.deposit) faq.push({ q: "Нужен ли депозит?", a: `Да, ${obj.deposit}.` });
  faq.push({
    q: "Можно проводить мероприятия?",
    a: obj.eventsAllowed
      ? "Да, мероприятия разрешены — обсудите с владельцем."
      : "Шумные мероприятия не разрешены.",
  });
  if (obj.capacity) {
    faq.push({
      q: "Сколько гостей можно разместить?",
      a: `До ${obj.capacity} гостей${obj.beds ? `, спальных мест: ${obj.beds}` : ""}.`,
    });
  }

  // ── Парсим fullDescription по <h3> на лид + блоки «Как добраться» / «Поблизости»
  const descSections = obj.fullDescription
    ? splitDescriptionByH3(obj.fullDescription)
    : [];
  const lead = descSections.find((s) => !s.title)?.html ?? "";
  const howToHtml = descSections.find((s) => /как добраться/i.test(s.title))?.html ?? "";
  const nearbyHtml = descSections.find((s) => /поблизости/i.test(s.title))?.html ?? "";

  const mapsHref =
    obj.latitude && obj.longitude
      ? `https://yandex.ru/maps/?pt=${obj.longitude},${obj.latitude}&z=15&l=map`
      : obj.address
        ? `https://yandex.ru/maps/?text=${encodeURIComponent(obj.address)}`
        : null;
  const routeHref =
    obj.latitude && obj.longitude
      ? `https://yandex.ru/maps/?rtext=~${obj.latitude},${obj.longitude}&rtt=auto`
      : null;

  // ── JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: obj.name,
    description: obj.shortDescription,
    address: obj.address,
    ...(obj.latitude && obj.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: obj.latitude, longitude: obj.longitude } }
      : {}),
    ...(obj.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: obj.rating,
            reviewCount: obj.reviewCount,
          },
        }
      : {}),
  };
  const faqJsonLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  // ── Какие табы показывать
  const tabsAvailable: Record<string, boolean> = {
    overview: !!(obj.photos?.length || lead),
    amenities: !!(obj.amenities && obj.amenities.length > 0),
    rules: true,
    location: !!(obj.address || (obj.latitude && obj.longitude)),
    tariffs: !!(obj.tariffs && obj.tariffs.length > 0),
    reviews: !!(obj.reviews && obj.reviews.length > 0),
    faq: faq.length > 0,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 min-w-0">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-2">
              {obj.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                {obj.objectType?.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icons.Compass className="w-4 h-4" />
                {obj.cityOrDistrict?.name}, {obj.region?.name}
              </span>
              {obj.rating != null && (
                <span
                  className="inline-flex items-center gap-1 font-medium text-amber-600 tabular-nums"
                  aria-label={`Рейтинг ${obj.rating} из 5, отзывов: ${obj.reviewCount}`}
                >
                  <span aria-hidden>★ {obj.rating}</span>
                  <span className="text-gray-500 font-normal" aria-hidden>
                    ({obj.reviewCount})
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Photos */}
          {obj.photos && obj.photos.length > 0 ? (
            <ImageSlider photos={obj.photos} objectName={obj.name} />
          ) : (
            <div className="h-72 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 mb-6 border border-gray-200">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Z" />
              </svg>
              <span className="text-sm text-gray-400">Фотографии скоро появятся</span>
            </div>
          )}

          {/* Sticky tab nav */}
          <ObjectTabs available={tabsAvailable} />

          {/* ── Overview ─────────────────────────────────────────────── */}
          {tabsAvailable.overview && (
            <section id="overview" className="scroll-mt-32 mb-10">
              {/* Key parameters as icon cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <ParamCard icon={<Icons.Bed />} label="Гостей" value={`до ${obj.capacity}`} />
                {obj.beds != null && obj.beds > 0 && (
                  <ParamCard icon={<Icons.Bed />} label="Спальные места" value={String(obj.beds)} />
                )}
                {obj.area && (
                  <ParamCard icon={<Icons.Ruler />} label="Площадь" value={`${obj.area} м²`} />
                )}
                {obj.checkInTime && (
                  <ParamCard icon={<Icons.Clock />} label="Заезд" value={`с ${obj.checkInTime}`} />
                )}
                {obj.checkOutTime && (
                  <ParamCard icon={<Icons.Clock />} label="Выезд" value={`до ${obj.checkOutTime}`} />
                )}
              </div>

              {lead && (
                <div className="mb-2">
                  <h2 className="text-xl font-semibold mb-3">Описание</h2>
                  {/<\/?(p|ul|ol|li|strong|em|h3|div|br)\b/i.test(lead) ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-gray-900"
                      dangerouslySetInnerHTML={{ __html: lead }}
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-line">{lead}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Amenities ────────────────────────────────────────────── */}
          {tabsAvailable.amenities && (
            <section id="amenities" className="scroll-mt-32 mb-10">
              <h2 className="text-xl font-semibold mb-4">Удобства и услуги</h2>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5">
                {obj.amenities.map((a) => (
                  <li
                    key={a.slug}
                    className="flex items-center gap-2.5 text-sm text-gray-800"
                  >
                    <span className="text-gray-500">
                      <AmenityIcon slug={a.slug} className="w-5 h-5" />
                    </span>
                    <span>{a.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Rules ────────────────────────────────────────────────── */}
          <section id="rules" className="scroll-mt-32 mb-10">
            <h2 className="text-xl font-semibold mb-4">Правила проживания</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <RuleItem allowed={obj.childrenAllowed} icon={<Icons.Children />} label="С детьми" />
              <RuleItem allowed={obj.petsAllowed} icon={<Icons.Pets />} label="С питомцами" />
              <RuleItem allowed={obj.smokingAllowed} icon={<Icons.Smoke />} label="Курение" />
              <RuleItem allowed={obj.eventsAllowed} icon={<Icons.Party />} label="Мероприятия" />
            </div>
            {obj.deposit && (
              <p className="mt-4 text-sm text-gray-600">
                <span className="text-gray-500">Депозит:</span> {obj.deposit}
              </p>
            )}
            {obj.rules && (
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{obj.rules}</p>
            )}
          </section>

          {/* ── Location / How to get there ──────────────────────────── */}
          {tabsAvailable.location && (
            <section id="location" className="scroll-mt-32 mb-10">
              <h2 className="text-xl font-semibold mb-4">Как добраться</h2>
              {obj.address && (
                <p className="text-gray-700 mb-3">
                  <span className="text-gray-500">Адрес:</span> {obj.address}
                </p>
              )}
              {howToHtml ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700 prose-p:my-2 prose-strong:text-gray-900 mb-3"
                  dangerouslySetInnerHTML={{ __html: howToHtml }}
                />
              ) : (
                <p className="text-sm text-gray-600 mb-3">
                  {obj.region?.name}
                  {obj.cityOrDistrict?.name ? `, ${obj.cityOrDistrict.name}` : ""}.
                  Точные координаты и схему проезда уточните у владельца — рекомендуем
                  заранее построить маршрут на автомобиле, особенно если едете в первый
                  раз.
                </p>
              )}
              {nearbyHtml && (
                <div className="mt-4 mb-3">
                  <h3 className="text-base font-semibold mb-2">Поблизости</h3>
                  <div
                    className="prose prose-sm max-w-none text-gray-700 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5"
                    dangerouslySetInnerHTML={{ __html: nearbyHtml }}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                  >
                    <Icons.Compass className="w-4 h-4" />
                    Открыть на Яндекс.Картах
                  </a>
                )}
                {routeHref && (
                  <a
                    href={routeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                  >
                    <Icons.Bus className="w-4 h-4" />
                    Построить маршрут
                  </a>
                )}
              </div>
            </section>
          )}

          {/* ── Tariffs (mobile inline; desktop has sidebar) ─────────── */}
          {tabsAvailable.tariffs && (
            <section id="tariffs" className="scroll-mt-32 mb-10 lg:hidden">
              <h2 className="text-xl font-semibold mb-4">Цены</h2>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {obj.tariffs.map((t) => (
                  <div key={t.id} className="p-4 flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                      )}
                    </div>
                    <div className="font-bold text-lg whitespace-nowrap">
                      {t.price.toLocaleString("ru-RU")}
                      <span className="text-sm font-normal text-gray-500"> ₽</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Reviews ──────────────────────────────────────────────── */}
          {tabsAvailable.reviews && (
            <section id="reviews" className="scroll-mt-32 mb-10">
              <h2 className="text-xl font-semibold mb-4">
                Отзывы{" "}
                <span className="text-gray-400 font-normal text-base">
                  ({obj.reviewCount})
                </span>
              </h2>
              <div className="space-y-4">
                {obj.reviews.map((r) => (
                  <article
                    key={r.id}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{r.user.firstName}</span>
                      <span className="text-amber-500 text-sm" aria-label={`${r.rating} из 5`}>
                        {"★".repeat(r.rating)}
                        <span className="text-gray-200">{"★".repeat(5 - r.rating)}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{r.text}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── FAQ ──────────────────────────────────────────────────── */}
          {tabsAvailable.faq && (
            <section id="faq" className="scroll-mt-32 mb-10">
              <h2 className="text-xl font-semibold mb-4">Частые вопросы</h2>
              <Accordion
                items={faq.map((f, i) => ({
                  id: i,
                  question: f.q,
                  answer: <p>{f.a}</p>,
                }))}
              />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            {obj.tariffs && obj.tariffs.length > 0 && (
              <div className="hidden lg:block border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-3 inline-flex items-center gap-2">
                  Цены
                </h3>
                <div className="space-y-3">
                  {obj.tariffs.map((t) => (
                    <div
                      key={t.id}
                      className="border-b border-gray-100 last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className="font-bold text-lg whitespace-nowrap">
                          {t.price.toLocaleString("ru-RU")}
                          <span className="text-sm font-normal text-gray-500"> ₽</span>
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {obj.source?.sourceUrl && (
              <a
                href={obj.source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-primary-600 text-white rounded-xl px-6 py-3 font-medium hover:bg-primary-700 transition"
              >
                Посмотреть{obj.source.sourceName ? ` на ${obj.source.sourceName}` : ""}
              </a>
            )}

            {obj.address && (
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-2 inline-flex items-center gap-2">
                  <Icons.Compass className="w-4 h-4 text-gray-500" />
                  Адрес
                </h3>
                <p className="text-sm text-gray-700">{obj.address}</p>
                {obj.latitude && obj.longitude && (
                  <div className="mt-3">
                    <YandexMap
                      latitude={obj.latitude}
                      longitude={obj.longitude}
                      name={obj.name}
                      address={obj.address}
                      className="w-full h-52 rounded-lg overflow-hidden"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Nearby */}
      {nearby.length > 0 && (
        <section className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-xl md:text-2xl font-bold text-navy-900 mb-4">
            Похожие объекты рядом
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nearby.map((n) => (
              <ObjectCard key={n.id} obj={n} />
            ))}
          </div>
        </section>
      )}

      <ObjectLinkBlock
        title={`Другие глэмпинги в регионе ${obj.region.name}`}
        objects={glampingLinks}
      />

      <RegionLinkBlock
        regions={regionLinks}
        currentRegionSlug={obj.region.slug}
      />
    </>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function ParamCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
      <span className="text-gray-500">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

function RuleItem({
  allowed,
  icon,
  label,
}: {
  allowed: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={
        "flex items-center gap-2.5 rounded-lg border p-3 text-sm " +
        (allowed
          ? "border-emerald-200 bg-emerald-50/50 text-gray-800"
          : "border-gray-200 bg-gray-50 text-gray-500")
      }
    >
      <span className={allowed ? "text-emerald-600" : "text-gray-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      <span
        className={
          "text-xs font-medium " + (allowed ? "text-emerald-700" : "text-gray-400")
        }
      >
        {allowed ? "Можно" : "Нельзя"}
      </span>
    </div>
  );
}
