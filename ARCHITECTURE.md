# Архитектура OnlyGlamps

## Общая схема

```
[Nginx :80] → [Next.js :3000] (SSR frontend)
           → [ASP.NET Core :5000] (API)
                  ↓
             [PostgreSQL :5432]
             [MinIO :9000] (S3 storage)
```

## Backend (ASP.NET Core 8)

Отвечает за всю бизнес-логику, авторизацию, работу с БД, модерацию, API.

### Модули

| Модуль       | Назначение                                    |
|--------------|-----------------------------------------------|
| Controllers  | REST API эндпоинты                            |
| Data         | DbContext, миграции, сидер                     |
| Models       | Entities (модели БД) и Dto (модели API)       |
| Services     | Бизнес-логика                                 |
| Middleware   | Обработка ошибок, логирование                 |

### Основные сущности

- **User** — пользователь (Telegram auth)
- **OwnerProfile** — профиль владельца
- **GlampingObject** — карточка объекта (глэмпинг/дом/баня)
- **ObjectType** — тип объекта
- **Region** — регион
- **CityOrDistrict** — город или район
- **Amenity** — удобство
- **ObjectAmenity** — связь объект-удобство (M2M)
- **Tariff** — тариф объекта
- **AvailabilityCalendar** — доступность по датам
- **Review** — отзыв
- **ObjectPhoto** — фото с alt
- **SeoMeta** — SEO-данные страниц
- **PopularQuery** — популярный запрос
- **SourceLink** — внешний источник объекта
- **Inquiry** — заявка от пользователя

### Статусы объекта

`Draft` → `OnModeration` → `Published` / `Rejected` → `Archived`

## Frontend (Next.js 14 + React)

SEO-фронтенд с серверным рендерингом для индексируемых страниц.

### Принципы

- App Router
- SSR для индексируемых страниц (листинги, карточки, регионы)
- Client-side фильтрация и интерактивность
- Mobile first (Tailwind CSS)
- GET-параметры для фильтров (синхронизация с URL)

### Маршруты

| Путь                                          | Тип       |
|-----------------------------------------------|-----------|
| `/`                                           | index     |
| `/{region}/`                                  | index     |
| `/{region}/{city}/`                           | index     |
| `/{region}/{type}/`                           | index     |
| `/{region}/{city}/{type}/`                    | index     |
| `/{region}/{city}/{slug}-{id}/`               | index     |
| `/{path}/?filters=...`                        | noindex   |
| `/{path}/page/{n}/`                           | noindex   |
| `/search/`                                    | noindex   |

## Docker

### Контейнеры

| Контейнер  | Образ               | Порт  |
|------------|---------------------|-------|
| nginx      | nginx:alpine        | 80    |
| frontend   | custom (Node 20)    | 3000  |
| backend    | custom (.NET 8)     | 5000  |
| db         | postgres:16-alpine  | 5432  |
| storage    | minio/minio         | 9000  |
| pgadmin    | dpage/pgadmin4      | 5050  |

### Volumes

- `postgres-data` — данные PostgreSQL
- `minio-data` — файлы MinIO

## Роутинг

Nginx как reverse proxy:
- `/api/*` → backend
- `/swagger*` → backend
- `/*` → frontend

## Авторизация

Telegram Login Widget → backend проверяет подпись → JWT/cookie → роли (User, Owner, Admin).
