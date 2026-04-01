# OnlyGlamps

Каталог и площадка объявлений по аренде глэмпингов, гостевых домов и бань посуточно.

## Стек

- **Backend:** ASP.NET Core 8 Web API (C#)
- **Frontend:** Next.js 14 + React + Tailwind CSS
- **Database:** PostgreSQL 16
- **Storage:** MinIO (S3-совместимое)
- **Reverse Proxy:** Nginx
- **Maps:** Yandex Maps API
- **Auth:** Telegram Login

## Быстрый старт

### 1. Клонировать и настроить окружение

```bash
git clone <repo-url> onlyglamps
cd onlyglamps
cp .env.example .env
# Отредактировать .env при необходимости
```

### 2. Запустить проект

```bash
docker compose up --build
```

### 3. Адреса сервисов

| Сервис         | URL                        |
|----------------|----------------------------|
| Сайт           | http://localhost            |
| API            | http://localhost/api/       |
| Swagger        | http://localhost/swagger    |
| API напрямую   | http://localhost:5001       |
| pgAdmin        | http://localhost:5050       |
| MinIO Console  | http://localhost:9001       |

### 4. Остановить проект

```bash
docker compose down
```

### 5. Остановить и удалить данные

```bash
docker compose down -v
```

## Миграции

Миграции применяются автоматически при запуске backend в Development-окружении.

Для ручного управления:

```bash
cd src/backend
dotnet ef migrations add <Name> --project OnlyGlamps.Api
dotnet ef database update --project OnlyGlamps.Api
```

Требуется глобальный инструмент:
```bash
dotnet tool install --global dotnet-ef
```

## Переменные окружения

См. `.env.example` для полного списка. Основные:

| Переменная          | Описание                    |
|---------------------|-----------------------------|
| POSTGRES_DB         | Имя базы данных             |
| POSTGRES_USER       | Пользователь БД             |
| POSTGRES_PASSWORD   | Пароль БД                   |
| MINIO_ROOT_USER     | Логин MinIO                 |
| MINIO_ROOT_PASSWORD | Пароль MinIO                |
| TELEGRAM_BOT_TOKEN  | Токен Telegram-бота         |

## Структура проекта

```
onlyglamps/
├── docker-compose.yml          # Основная конфигурация Docker
├── docker-compose.override.yml # Dev-контейнеры (pgAdmin, порты)
├── .env.example                # Шаблон переменных окружения
├── nginx/nginx.conf            # Конфигурация reverse proxy
├── popular.txt                 # Популярные запросы
├── src/
│   ├── backend/
│   │   ├── OnlyGlamps.sln
│   │   └── OnlyGlamps.Api/
│   │       ├── Controllers/    # API-контроллеры
│   │       ├── Data/           # DbContext, сидер
│   │       ├── Models/
│   │       │   ├── Entities/   # Модели БД
│   │       │   └── Dto/        # DTO для API
│   │       ├── Services/       # Бизнес-логика
│   │       └── Middleware/     # Middleware
│   └── frontend/
│       ├── app/                # Next.js App Router
│       └── components/         # React-компоненты
├── ARCHITECTURE.md
├── CONVENTIONS.md
├── TASKS.md
├── AGENTS.md
└── CLAUDE.md
```

## Тестовые данные

При первом запуске автоматически создаются:
- 3 региона (Марий Эл, Татарстан, Нижегородская область)
- 3 города/района
- 3 типа объектов (глэмпинг, гостевой дом, баня)
- 12 удобств
- 3 тестовых объекта с тарифами, фото и отзывами
- 15 популярных запросов
- Календарь доступности на 30 дней
- Тестовые пользователи (админ, владелец, гость)
