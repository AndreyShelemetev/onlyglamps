#!/usr/bin/env bash
set -euo pipefail

# Публикует черновики одного источника.
#
#   scripts/publish-source-drafts.sh                      # сухой прогон «Мир Турбаз»
#   scripts/publish-source-drafts.sh --apply              # публикует
#   SOURCE='глэмпинги.рф' scripts/publish-source-drafts.sh --apply
#
# По умолчанию НИЧЕГО не меняет: показывает, сколько и чего опубликуется,
# и разбор по качеству карточек. Публикация делает страницы индексируемыми,
# откатывается только из бэкапа, поэтому нужен явный --apply.
#
# Переменные:
#   SOURCE        — имя источника (SourceLinks.SourceName), по умолчанию «Мир Турбаз»
#   MIN_PHOTOS    — не публиковать карточки, у которых фото меньше этого числа (по умолчанию 1)
#   REQUIRE_GEO   — 1 (по умолчанию): не публиковать без координат; 0 — публиковать все
#   DB_SERVICE    — имя сервиса БД в compose, по умолчанию db
#   BACKUP_DIR    — куда класть бэкап, по умолчанию backups

SOURCE="${SOURCE:-Мир Турбаз}"
MIN_PHOTOS="${MIN_PHOTOS:-1}"
REQUIRE_GEO="${REQUIRE_GEO:-1}"
DB_SERVICE="${DB_SERVICE:-db}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
APPLY=0

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    -h|--help) sed -n '3,25p' "$0"; exit 0 ;;
    *) echo "Неизвестный аргумент: $arg" >&2; exit 2 ;;
  esac
done

psql_run() {
  docker compose exec -T "$DB_SERVICE" sh -c \
    'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

# Условие пригодности к публикации. Держим в одном месте, чтобы отчёт
# и сама публикация не могли разойтись.
GEO_COND=""
[ "$REQUIRE_GEO" = "1" ] && GEO_COND='AND o."Latitude" IS NOT NULL AND o."Longitude" IS NOT NULL'

ELIGIBLE_COND="o.\"Status\" = 'Draft'
  AND sl.\"SourceName\" = \$src\$${SOURCE}\$src\$
  ${GEO_COND}
  AND (SELECT count(*) FROM \"ObjectPhotos\" p WHERE p.\"ObjectId\" = o.\"Id\") >= ${MIN_PHOTOS}"

echo "Источник      : ${SOURCE}"
echo "Порог фото    : ${MIN_PHOTOS}"
echo "Нужны коорд.  : $([ "$REQUIRE_GEO" = "1" ] && echo да || echo нет)"
echo "Режим         : $([ "$APPLY" = "1" ] && echo 'ПУБЛИКАЦИЯ' || echo 'сухой прогон')"
echo

echo "=== Черновики источника: почему публикуются или нет ==="
psql_run <<SQL
SELECT
  count(*) AS vsego_chernovikov,
  count(*) FILTER (WHERE (SELECT count(*) FROM "ObjectPhotos" p WHERE p."ObjectId" = o."Id") < ${MIN_PHOTOS}) AS bez_foto,
  count(*) FILTER (WHERE o."Latitude" IS NULL OR o."Longitude" IS NULL) AS bez_koordinat,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Tariffs" t WHERE t."ObjectId" = o."Id" AND t."IsActive")) AS bez_ceny,
  count(*) FILTER (WHERE o."ShortDescription" IS NULL OR o."ShortDescription" = '') AS bez_opisaniya
FROM "GlampingObjects" o
JOIN "SourceLinks" sl ON sl."ObjectId" = o."Id"
WHERE o."Status" = 'Draft' AND sl."SourceName" = \$src\$${SOURCE}\$src\$;
SQL

echo "=== Будет опубликовано ==="
psql_run <<SQL
SELECT count(*) AS k_publikacii
FROM "GlampingObjects" o
JOIN "SourceLinks" sl ON sl."ObjectId" = o."Id"
WHERE ${ELIGIBLE_COND};
SQL

echo "=== Распределение по регионам (топ-10) ==="
psql_run <<SQL
SELECT r."Name" AS region, count(*) AS k_publikacii
FROM "GlampingObjects" o
JOIN "SourceLinks" sl ON sl."ObjectId" = o."Id"
JOIN "Regions" r ON r."Id" = o."RegionId"
WHERE ${ELIGIBLE_COND}
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
SQL

if [ "$APPLY" != "1" ]; then
  echo
  echo "Сухой прогон, база не менялась. Для публикации добавьте --apply."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
REMOTE_BACKUP="/tmp/onlyglamps-before-publish-${STAMP}.dump"
LOCAL_BACKUP="${BACKUP_DIR}/onlyglamps-before-publish-${STAMP}.dump"
mkdir -p "$BACKUP_DIR"

echo
echo "Бэкап базы: $LOCAL_BACKUP"
docker compose exec -T "$DB_SERVICE" sh -c \
  "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --format=custom --file='$REMOTE_BACKUP'"
docker compose cp "${DB_SERVICE}:${REMOTE_BACKUP}" "$LOCAL_BACKUP"
docker compose exec -T "$DB_SERVICE" rm -f "$REMOTE_BACKUP"

echo "Публикация..."
psql_run <<SQL
BEGIN;

CREATE TEMP TABLE og_publish AS
SELECT o."Id"
FROM "GlampingObjects" o
JOIN "SourceLinks" sl ON sl."ObjectId" = o."Id"
WHERE ${ELIGIBLE_COND};

-- UpdatedAt двигаем сознательно: появление страницы в индексе — это
-- изменение, и sitemap должен отдать по ней честный lastmod.
-- Поля модерации НЕ трогаем: человек эти карточки не смотрел,
-- проставлять ModeratedAt значило бы соврать в аудите.
UPDATE "GlampingObjects" o
SET "Status" = 'Published', "UpdatedAt" = now()
FROM og_publish p
WHERE o."Id" = p."Id";

SELECT count(*) AS opublikovano FROM og_publish;

COMMIT;
SQL

echo
echo "=== Итог по источнику ==="
psql_run <<SQL
SELECT o."Status", count(*)
FROM "GlampingObjects" o
JOIN "SourceLinks" sl ON sl."ObjectId" = o."Id"
WHERE sl."SourceName" = \$src\$${SOURCE}\$src\$
GROUP BY 1 ORDER BY 2 DESC;
SQL

echo
echo "Готово. Бэкап: $LOCAL_BACKUP"
echo "Откат при необходимости:"
echo "  docker compose cp $LOCAL_BACKUP ${DB_SERVICE}:/tmp/restore.dump"
echo "  docker compose exec -T $DB_SERVICE sh -c 'pg_restore -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --clean --if-exists /tmp/restore.dump'"
