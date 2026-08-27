import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О сервисе",
  description:
    "OnlyGlamps — каталог глэмпингов, гостевых домов и бань для аренды посуточно. О нас, наша миссия и команда.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">О сервисе OnlyGlamps</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <p>
          <strong>OnlyGlamps</strong> — это каталог глэмпингов, гостевых домов и бань для 
          аренды посуточно. Мы собрали лучшие варианты размещения на природе, чтобы вы 
          могли легко найти и забронировать идеальное место для отдыха.
        </p>

        <h2 className="text-xl font-semibold text-navy-800 mt-8">Наша миссия</h2>
        <p>
          Мы верим, что отдых на природе должен быть комфортным и доступным. Поэтому 
          мы создали платформу, которая объединяет владельцев уникальных объектов 
          размещения и путешественников, ищущих незабываемые впечатления.
        </p>

        <h2 className="text-xl font-semibold text-navy-800 mt-8">Что мы предлагаем</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Актуальный каталог глэмпингов, гостевых домов, бань и коттеджей</li>
          <li>Подробные описания с фото, ценами и отзывами</li>
          <li>Удобный поиск по регионам и типам размещения</li>
          <li>Календарь доступности объектов</li>
          <li>Возможность связаться с владельцем напрямую</li>
        </ul>

        <h2 className="text-xl font-semibold text-navy-800 mt-8">Для владельцев</h2>
        <p>
          Если вы владелец глэмпинга, гостевого дома или бани — разместите свой объект 
          на OnlyGlamps бесплатно. Мы поможем вам привлечь новых гостей и увеличить 
          загрузку вашего объекта.
        </p>

        <div className="mt-8 p-6 bg-gray-50 rounded-xl">
          <h3 className="text-lg font-semibold text-navy-800 mb-2">Контакты</h3>
          <p className="text-sm text-gray-600">
            Email: <a href="mailto:info@onlyglamps.ru" className="text-primary-600 hover:underline">info@onlyglamps.ru</a><br />
            Адрес: г. Йошкар-Ола, Прибрежный проезд, 14
          </p>
        </div>
      </div>
    </div>
  );
}
