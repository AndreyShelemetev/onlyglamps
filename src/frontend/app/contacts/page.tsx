import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Контактная информация сервиса OnlyGlamps. Телефон, email, адрес офиса в Йошкар-Оле.",
  alternates: { canonical: "/contacts/" },
};

export default function ContactsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-8">Контакты</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact info */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-navy-800 mb-2">
              Свяжитесь с нами
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Мы всегда рады помочь с вопросами по бронированию, размещению
              объектов и сотрудничеству.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-navy-800">Email</div>
                <a
                  href="mailto:info@onlyglamps.ru"
                  className="text-primary-600 hover:text-primary-700 font-semibold transition"
                >
                  info@onlyglamps.ru
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-navy-800">Время работы</div>
                <p className="text-gray-700">Пн–Пт: 9:00–18:00</p>
                <p className="text-gray-500 text-sm">Сб–Вс: выходной</p>
              </div>
            </div>
          </div>
        </div>

        {/* Yandex Map */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm h-[400px]">
          <iframe
            src="https://yandex.ru/map-widget/v1/?um=constructor%3A0&amp;source=constructorLink&amp;ll=47.896519%2C56.631247&amp;z=16&amp;pt=47.896519%2C56.631247%2Cpm2rdm"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            title="Офис OnlyGlamps на карте"
          />
        </div>
      </div>

      {/* E-E-A-T Block */}
      <div className="mt-12 p-6 bg-gray-50 rounded-xl">
        <h2 className="text-lg font-semibold text-navy-800 mb-3">О компании</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          OnlyGlamps — сервис поиска и бронирования глэмпингов, гостевых домов и бань
          для аренды посуточно. Мы помогаем путешественникам находить уникальные места
          для отдыха на природе, а владельцам — привлекать гостей. По всем вопросам
          вы можете связаться с нами по email info@onlyglamps.ru.
        </p>
      </div>
    </div>
  );
}
