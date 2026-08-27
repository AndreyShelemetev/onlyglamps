import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-8xl font-bold text-primary-200 mb-4">404</div>
      <h1 className="text-2xl font-bold text-navy-900 mb-3">
        Страница не найдена
      </h1>
      <p className="text-gray-600 mb-8">
        Возможно, страница была удалена или вы перешли по неверной ссылке.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          На главную
        </Link>
        <Link
          href="/contacts/"
          className="inline-flex items-center justify-center border border-gray-300 hover:border-primary-300 text-navy-700 font-semibold px-6 py-3 rounded-lg transition"
        >
          Связаться с нами
        </Link>
      </div>

      <div className="p-6 bg-gray-50 rounded-xl text-sm text-gray-500">
        <p className="font-medium text-navy-700 mb-2">Нужна помощь?</p>
        <p>
          Email:{" "}
          <a href="mailto:info@onlyglamps.ru" className="text-primary-600 hover:underline">
            info@onlyglamps.ru
          </a>
        </p>
        <p className="mt-1">г. Йошкар-Ола, Прибрежный проезд, 14</p>
      </div>
    </div>
  );
}
