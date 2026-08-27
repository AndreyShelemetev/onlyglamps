import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сдать объект",
  description:
    "Разместите свой глэмпинг, гостевой дом или баню на OnlyGlamps. Бесплатное размещение, привлечение гостей.",
  alternates: { canonical: "/owners/" },
};

export default function OwnersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">
        Разместите свой объект на OnlyGlamps
      </h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          Вы владелец глэмпинга, гостевого дома, бани или коттеджа? Разместите
          свой объект на OnlyGlamps и получайте новых гостей.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 bg-primary-50 rounded-xl text-center">
            <div className="text-3xl mb-2">🏕️</div>
            <div className="font-semibold text-navy-800 text-sm">Бесплатное размещение</div>
            <p className="text-xs text-gray-500 mt-1">Без комиссий и скрытых платежей</p>
          </div>
          <div className="p-5 bg-primary-50 rounded-xl text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold text-navy-800 text-sm">Новые гости</div>
            <p className="text-xs text-gray-500 mt-1">Увеличьте загрузку вашего объекта</p>
          </div>
          <div className="p-5 bg-primary-50 rounded-xl text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold text-navy-800 text-sm">Личный кабинет</div>
            <p className="text-xs text-gray-500 mt-1">Управляйте объектами и бронями</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-navy-800 mt-8">Как это работает</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Войдите через Telegram</li>
          <li>Заполните информацию о вашем объекте</li>
          <li>Добавьте фотографии и цены</li>
          <li>Опубликуйте — и начните получать гостей</li>
        </ol>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Для размещения объекта необходимо авторизоваться через Telegram
          </p>
          <a
            href="/dashboard/objects/new/"
            className="inline-flex bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition shadow-sm"
          >
            Разместить объект
          </a>
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-xl text-sm text-gray-600">
          <strong>Нужна помощь?</strong> Свяжитесь с нами:<br />
          Email: <a href="mailto:info@onlyglamps.ru" className="text-primary-600 hover:underline">info@onlyglamps.ru</a>
        </div>
      </div>
    </div>
  );
}
