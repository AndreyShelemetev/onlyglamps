import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Правила размещения объектов",
  description: "Правила размещения объектов на платформе OnlyGlamps.",
  alternates: { canonical: "/rules/" },
};

export default function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Правила размещения объектов</h1>
      <p className="text-sm text-gray-500 mb-8">Дата последнего обновления: 1 января 2026 г.</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed text-sm">
        <h2 className="text-lg font-semibold text-navy-800">1. Общие требования</h2>
        <p>
          Размещение объектов на платформе OnlyGlamps доступно зарегистрированным пользователям, 
          являющимся собственниками или законными представителями объектов размещения.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Один объект — одна карточка. Дублирование запрещено</li>
          <li>Информация об объекте должна быть актуальной и достоверной</li>
          <li>Фотографии должны соответствовать реальному состоянию объекта</li>
          <li>Цены должны быть указаны в рублях и соответствовать действительности</li>
        </ul>

        <h2 className="text-lg font-semibold text-navy-800">2. Требования к контенту</h2>
        <p>Запрещается размещать:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Ложную или вводящую в заблуждение информацию</li>
          <li>Контент, нарушающий законодательство Российской Федерации</li>
          <li>Материалы, нарушающие авторские права третьих лиц</li>
          <li>Контент рекламного характера, не связанный с объектом</li>
          <li>Нецензурную лексику и оскорбительные материалы</li>
        </ul>

        <h2 className="text-lg font-semibold text-navy-800">3. Требования к фотографиям</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Минимум 3 фотографии объекта</li>
          <li>Фотографии должны быть хорошего качества</li>
          <li>Запрещены фотографии с водяными знаками сторонних сервисов</li>
          <li>Каждая фотография должна иметь описание (атрибут alt)</li>
        </ul>

        <h2 className="text-lg font-semibold text-navy-800">4. Модерация</h2>
        <p>
          Все размещённые объекты проходят модерацию Администрации. Администрация вправе:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Отклонить или приостановить публикацию объекта</li>
          <li>Запросить дополнительную информацию или подтверждающие документы</li>
          <li>Удалить объект при нарушении Правил</li>
          <li>Заблокировать аккаунт при систематических нарушениях</li>
        </ul>

        <h2 className="text-lg font-semibold text-navy-800">5. Ответственность владельца</h2>
        <p>Владелец объекта несёт ответственность за:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Достоверность размещённой информации</li>
          <li>Актуальность цен и календаря доступности</li>
          <li>Соответствие объекта заявленным характеристикам</li>
          <li>Соблюдение законодательства РФ в сфере оказания услуг размещения</li>
        </ul>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
          По вопросам размещения: 
          <a href="mailto:info@onlyglamps.ru" className="text-primary-600"> info@onlyglamps.ru</a> · 
          <a href="tel:+79933880764" className="text-primary-600"> 8 (993) 388-07-64</a>
        </div>
      </div>
    </div>
  );
}
