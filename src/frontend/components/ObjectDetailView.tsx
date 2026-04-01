import { ObjectDetail } from "@/lib/api";
import { YandexMap } from "./YandexMap";
import { SafeImage } from "./SafeImage";

export function ObjectDetailView({ obj }: { obj: ObjectDetail }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: obj.name,
    description: obj.shortDescription,
    address: obj.address,
    ...(obj.latitude && obj.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: obj.latitude,
            longitude: obj.longitude,
          },
        }
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{obj.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
            <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
              {obj.objectType?.name}
            </span>
            <span>{obj.cityOrDistrict?.name}, {obj.region?.name}</span>
            {obj.rating && (
              <span className="font-medium">★ {obj.rating} ({obj.reviewCount} отзывов)</span>
            )}
          </div>

          {/* Photo gallery */}
          {obj.photos && obj.photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              {obj.photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className={`overflow-hidden rounded-lg ${i === 0 ? "col-span-2 md:col-span-2 row-span-2" : ""}`}
                >
                  <SafeImage
                    src={photo.url}
                    alt={photo.alt || obj.name}
                    className={`w-full object-cover ${i === 0 ? "h-64 md:h-80" : "h-36 md:h-48"}`}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-72 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 mb-6 border border-gray-200">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Z" />
              </svg>
              <span className="text-sm text-gray-400">Фотографии скоро появятся</span>
            </div>
          )}

          {/* Description */}
          {obj.fullDescription && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Описание</h2>
              <p className="text-gray-700 whitespace-pre-line">{obj.fullDescription}</p>
            </div>
          )}

          {/* Parameters */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Характеристики</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Вместимость</div>
                <div className="font-medium">до {obj.capacity} гостей</div>
              </div>
              {obj.beds != null && obj.beds > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Спальные места</div>
                  <div className="font-medium">{obj.beds}</div>
                </div>
              )}
              {obj.area && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Площадь</div>
                  <div className="font-medium">{obj.area} м²</div>
                </div>
              )}
              {obj.checkInTime && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Заезд</div>
                  <div className="font-medium">с {obj.checkInTime}</div>
                </div>
              )}
              {obj.checkOutTime && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Выезд</div>
                  <div className="font-medium">до {obj.checkOutTime}</div>
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          {obj.amenities && obj.amenities.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Удобства</h2>
              <div className="flex flex-wrap gap-2">
                {obj.amenities.map((a) => (
                  <span key={a.slug} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {(obj.rules || obj.childrenAllowed !== undefined) && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Правила проживания</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>{obj.childrenAllowed ? "✅" : "❌"}</span>
                  <span>С детьми</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{obj.petsAllowed ? "✅" : "❌"}</span>
                  <span>С питомцами</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{obj.smokingAllowed ? "✅" : "❌"}</span>
                  <span>Курение</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{obj.eventsAllowed ? "✅" : "❌"}</span>
                  <span>Мероприятия</span>
                </div>
              </div>
              {obj.deposit && (
                <p className="mt-2 text-sm text-gray-600">Депозит: {obj.deposit}</p>
              )}
              {obj.rules && (
                <p className="mt-2 text-sm text-gray-600">{obj.rules}</p>
              )}
            </div>
          )}

          {/* Availability calendar */}
          {obj.availability && obj.availability.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Доступность</h2>
              <div className="flex flex-wrap gap-1">
                {obj.availability.slice(0, 30).map((day) => (
                  <div
                    key={day.date}
                    className={`w-9 h-9 rounded text-xs flex items-center justify-center ${
                      day.status === "Available"
                        ? "bg-green-100 text-green-800"
                        : day.status === "Booked"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                    title={`${day.date}: ${day.status === "Available" ? "Свободно" : day.status === "Booked" ? "Занято" : "По запросу"}`}
                  >
                    {new Date(day.date).getDate()}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span> Свободно</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> Занято</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span> По запросу</span>
              </div>
            </div>
          )}

          {/* Reviews */}
          {obj.reviews && obj.reviews.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">
                Отзывы ({obj.reviewCount})
              </h2>
              <div className="space-y-4">
                {obj.reviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{review.user.firstName}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">{"★".repeat(review.rating)}</span>
                        <span className="text-gray-300">{"★".repeat(5 - review.rating)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{review.text}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            {/* Tariffs */}
            {obj.tariffs && obj.tariffs.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Цены</h3>
                <div className="space-y-3">
                  {obj.tariffs.map((tariff) => (
                    <div key={tariff.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-sm">{tariff.name}</span>
                        <span className="font-bold text-lg whitespace-nowrap">
                          {tariff.price.toLocaleString("ru-RU")} <span className="text-sm font-normal text-gray-500">₽</span>
                        </span>
                      </div>
                      {tariff.description && (
                        <p className="text-xs text-gray-500 mt-1">{tariff.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source link */}
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

            {/* Address */}
            {obj.address && (
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-2">Адрес</h3>
                <p className="text-sm text-gray-700">{obj.address}</p>
                {/* Yandex Map */}
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
        </div>
      </div>
    </>
  );
}
