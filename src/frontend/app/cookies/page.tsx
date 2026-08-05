import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика использования cookies",
  description: "Информация об использовании файлов cookie на сервисе OnlyGlamps.",
  alternates: { canonical: "/cookies/" },
};

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Политика использования cookies</h1>
      <p className="text-sm text-gray-500 mb-8">Дата последнего обновления: 1 января 2026 г.</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed text-sm">
        <h2 className="text-lg font-semibold text-navy-800">1. Что такое cookies</h2>
        <p>
          Cookies (куки) — это небольшие текстовые файлы, которые сохраняются на вашем устройстве 
          при посещении веб-сайтов. Они помогают сайту запоминать информацию о вашем визите, 
          что делает следующее посещение удобнее.
        </p>

        <h2 className="text-lg font-semibold text-navy-800">2. Какие cookies мы используем</h2>
        
        <h3 className="text-base font-semibold text-navy-700">Необходимые cookies</h3>
        <p>
          Обеспечивают работу основных функций Сервиса (авторизация, безопасность). 
          Без этих cookies Сервис не может функционировать корректно.
        </p>

        <h3 className="text-base font-semibold text-navy-700">Функциональные cookies</h3>
        <p>
          Запоминают ваши предпочтения (язык, регион) для улучшения пользовательского опыта.
        </p>

        <h3 className="text-base font-semibold text-navy-700">Аналитические cookies</h3>
        <p>
          Помогают нам понять, как пользователи взаимодействуют с Сервисом, собирают 
          анонимную статистику посещений.
        </p>

        <h2 className="text-lg font-semibold text-navy-800">3. Управление cookies</h2>
        <p>
          Вы можете контролировать и удалять cookies через настройки вашего браузера. 
          Обратите внимание, что отключение cookies может повлиять на функциональность Сервиса.
        </p>
        <p>Инструкции по управлению cookies для популярных браузеров:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Google Chrome: Настройки → Конфиденциальность и безопасность → Файлы cookie</li>
          <li>Mozilla Firefox: Настройки → Приватность и защита → Куки</li>
          <li>Safari: Настройки → Конфиденциальность → Управление данными</li>
          <li>Microsoft Edge: Настройки → Конфиденциальность → Файлы cookie</li>
        </ul>

        <h2 className="text-lg font-semibold text-navy-800">4. Согласие</h2>
        <p>
          Продолжая использовать Сервис, вы соглашаетесь с использованием cookies 
          в соответствии с настоящей Политикой. Более подробная информация об обработке 
          данных доступна в нашей{" "}
          <a href="/privacy/" className="text-primary-600 hover:underline">Политике конфиденциальности</a>.
        </p>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
          Контакты: ИП Шелеметьев А.О. · 
          <a href="mailto:info@onlyglamps.ru" className="text-primary-600"> info@onlyglamps.ru</a> · 
          <a href="tel:+79933880764" className="text-primary-600"> 8 (993) 388-07-64</a>
        </div>
      </div>
    </div>
  );
}
