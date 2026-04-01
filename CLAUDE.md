# CLAUDE.md — инструкции для Claude Code

## Проект

OnlyGlamps — каталог глэмпингов, гостевых домов и бань для аренды посуточно.
Целевая аудитория: РФ.

## Стек

- Backend: ASP.NET Core 8 (C#), PostgreSQL, EF Core
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Infrastructure: Docker Compose, Nginx, MinIO

## Команды запуска

```bash
# Поднять всё
docker compose up --build

# Только backend для разработки
cd src/backend && dotnet run --project OnlyGlamps.Api

# Только frontend для разработки
cd src/frontend && npm run dev

# Миграции
cd src/backend && dotnet ef migrations add <Name> --project OnlyGlamps.Api
cd src/backend && dotnet ef database update --project OnlyGlamps.Api
```

## Структура

```
src/backend/OnlyGlamps.Api/     — C# API
src/frontend/                    — Next.js frontend
nginx/                           — Reverse proxy config
docker-compose.yml               — Docker конфигурация
```

## Правила

1. **Не меняй без задачи:** docker-compose, nginx.conf, маршруты, slug, canonical, robots, sitemap.
2. **SEO:** фильтры через GET = noindex. Чистые URL = index. Title ≠ H1.
3. **Auth:** только Telegram. Никаких SMS, email, подтверждения телефона.
4. **Один объект = один URL.** Никаких дублей карточек.
5. **Кнопка «Посмотреть»:** target="_blank" rel="noopener noreferrer". Не показывать без source_url.
6. **Mobile first.**
7. **Работай маленькими шагами.** Одна задача = один результат.

## Именование

- API endpoints: kebab-case
- JSON: camelCase
- C# properties: PascalCase
- URLs: lowercase, дефис, латиница
- Slugs: a-z, 0-9, дефис

## Проверки после изменений

- [ ] `docker compose up --build` работает
- [ ] Миграции не сломаны
- [ ] API возвращает данные
- [ ] Фронтенд рендерится
- [ ] Индексируемые страницы приходят HTML с сервера
- [ ] GET-фильтры получают noindex
