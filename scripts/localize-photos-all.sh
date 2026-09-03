#!/usr/bin/env bash
set -uo pipefail

# Прогоняет localize-first-object-photos.sh пачками, пока внешние ссылки
# на первые фото не закончатся.
#
#   scripts/localize-photos-all.sh
#   BATCH=200 SOURCE_NAME='Натуралист' scripts/localize-photos-all.sh
#
# Исходный скрипт идемпотентен: он выбирает только те записи, где Url ещё
# внешний. Поэтому прогон можно оборвать в любой момент и запустить заново —
# он продолжит с места остановки, ничего не переделывая.
#
# Переменные пробрасываются в localize-first-object-photos.sh как есть,
# см. его --help. Здесь добавляется только BATCH — размер одной пачки.

cd "$(dirname "$0")/.." || exit 1

BATCH="${BATCH:-500}"
export STATUS="${STATUS:-all}"
export PROCESSOR="${PROCESSOR:-imagemagick}"
export MAGICK_BIN="${MAGICK_BIN:-magick}"
export PATH="/opt/homebrew/bin:$PATH"

remaining() {
  docker compose exec -T "${DB_SERVICE:-db}" sh -c \
    'psql -X -t -A -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL' </dev/null | tr -d '[:space:]'
SELECT count(*) FROM (
  SELECT DISTINCT ON ("ObjectId") "Url"
  FROM "ObjectPhotos" ORDER BY "ObjectId", "SortOrder", "Id"
) t WHERE "Url" ~* '^https?://';
SQL
}

echo "Старт. Первых фото с внешними ссылками: $(remaining)"

round=0
while :; do
  round=$((round + 1))
  out="$(LIMIT="$BATCH" bash scripts/localize-first-object-photos.sh 2>&1)"

  echo "$out" | grep -E 'Обработано|No external first photos'

  if echo "$out" | grep -q 'No external first photos'; then
    echo "Готово: внешних ссылок на первые фото не осталось."
    break
  fi

  left="$(remaining)"
  echo "пачка $round готова, осталось первых фото: $left"

  if [[ "$left" == "0" ]]; then
    echo "Готово: все первые фото локализованы."
    break
  fi
done
