#!/usr/bin/env bash
set -euo pipefail

LIMIT="${LIMIT:-10}"
STATUS="${STATUS:-Published}"
SOURCE_NAME="${SOURCE_NAME:-}"
OBJECT_ID="${OBJECT_ID:-}"
DB_SERVICE="${DB_SERVICE:-db}"
STORAGE_SERVICE="${STORAGE_SERVICE:-storage}"
BUCKET="${BUCKET:-onlyglamps}"
WORK_DIR="${WORK_DIR:-.tmp/first-object-photos}"
MAIN_WIDTH="${MAIN_WIDTH:-960}"
FULL_WIDTH="${FULL_WIDTH:-1600}"
THUMB_WIDTH="${THUMB_WIDTH:-480}"
WEBP_QUALITY="${WEBP_QUALITY:-78}"
MAGICK_BIN="${MAGICK_BIN:-}"
PROCESSOR="${PROCESSOR:-realesrgan}"
REALESRGAN_BIN="${REALESRGAN_BIN:-realesrgan-ncnn-vulkan}"
REALESRGAN_MODEL="${REALESRGAN_MODEL:-realesrgan-x4plus}"
REALESRGAN_SCALE="${REALESRGAN_SCALE:-2}"
REALESRGAN_TILE_SIZE="${REALESRGAN_TILE_SIZE:-0}"
ON_DOWNLOAD_ERROR="${ON_DOWNLOAD_ERROR:-skip}"
DRY_RUN="${DRY_RUN:-0}"

usage() {
  cat <<'EOF'
Usage:
  LIMIT=20 REALESRGAN_BIN=/path/to/realesrgan-ncnn-vulkan scripts/localize-first-object-photos.sh

Environment:
  LIMIT             Number of object first photos to process. Default: 10.
  STATUS            Object status filter: Published, Draft, Archived, or all. Default: Published.
  SOURCE_NAME       Optional SourceLinks.SourceName filter, for example "Мир Турбаз".
  OBJECT_ID         Optional exact GlampingObjects.Id filter for a single object.
  DRY_RUN           1 prints selected photos without downloading or updating.
  PROCESSOR         realesrgan or imagemagick. Default: realesrgan.
  ON_DOWNLOAD_ERROR fail or skip. skip deletes the broken first photo record
                    so the next photo becomes the main one. Default: skip.
  REALESRGAN_BIN    Real-ESRGAN executable. Default: realesrgan-ncnn-vulkan.
  REALESRGAN_MODEL  Real-ESRGAN model name. Default: realesrgan-x4plus.
  REALESRGAN_SCALE  Real-ESRGAN scale. Default: 2.
  REALESRGAN_TILE_SIZE
                    Real-ESRGAN tile size. 0 means auto. Default: 0.
  MAIN_WIDTH        WebP width saved back into ObjectPhotos.Url. Default: 960.
  FULL_WIDTH        Larger archived WebP width. Default: 1600.
  THUMB_WIDTH       Small archived WebP width. Default: 480.
  WEBP_QUALITY      WebP quality. Default: 78.
  MAGICK_BIN        ImageMagick command. Auto-detects magick or convert.

Notes:
  Process only photos that are allowed to be stored and reused by OnlyGlamps.
  The script keeps the DB schema unchanged and updates only the first ObjectPhotos.Url.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

case "$STATUS" in
  Published|Draft|Archived|all) ;;
  *)
    echo "Unsupported STATUS=$STATUS. Use Published, Draft, Archived, or all." >&2
    exit 2
    ;;
esac

case "$PROCESSOR" in
  realesrgan|imagemagick) ;;
  *)
    echo "Unsupported PROCESSOR=$PROCESSOR. Use realesrgan or imagemagick." >&2
    exit 2
    ;;
esac

case "$ON_DOWNLOAD_ERROR" in
  fail|skip) ;;
  *)
    echo "Unsupported ON_DOWNLOAD_ERROR=$ON_DOWNLOAD_ERROR. Use fail or skip." >&2
    exit 2
    ;;
esac

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    exit 2
  fi
}

require_cmd docker
require_cmd curl

detect_magick_bin() {
  if [[ -n "$MAGICK_BIN" ]]; then
    return
  fi
  if command -v magick >/dev/null 2>&1; then
    MAGICK_BIN="magick"
    return
  fi
  if command -v convert >/dev/null 2>&1; then
    MAGICK_BIN="convert"
    return
  fi
}

if [[ "$DRY_RUN" != "1" ]]; then
  detect_magick_bin
  if [[ -z "$MAGICK_BIN" ]] || ! command -v "$MAGICK_BIN" >/dev/null 2>&1; then
    echo "Missing ImageMagick command. Install ImageMagick or set MAGICK_BIN." >&2
    exit 2
  fi
  if [[ "$PROCESSOR" == "realesrgan" ]] && ! command -v "$REALESRGAN_BIN" >/dev/null 2>&1 && [[ ! -x "$REALESRGAN_BIN" ]]; then
    echo "Missing Real-ESRGAN executable: $REALESRGAN_BIN" >&2
    echo "Set REALESRGAN_BIN to the realesrgan-ncnn-vulkan binary." >&2
    exit 2
  fi
fi

mkdir -p "$WORK_DIR"
MANIFEST="$WORK_DIR/manifest-$(date +%Y%m%d-%H%M%S).tsv"

psql_query() {
  docker compose exec -T "$DB_SERVICE" sh -c \
    'psql -X -v ON_ERROR_STOP=1 -A -t -F $'"'"'\t'"'"' -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    <<< "$1"
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

STATUS_SQL="TRUE"
if [[ "$STATUS" != "all" ]]; then
  STATUS_SQL="o.\"Status\" = '$(sql_escape "$STATUS")'"
fi

SOURCE_SQL="TRUE"
if [[ -n "$SOURCE_NAME" ]]; then
  SOURCE_SQL="sl.\"SourceName\" = '$(sql_escape "$SOURCE_NAME")'"
fi

OBJECT_SQL="TRUE"
if [[ -n "$OBJECT_ID" ]]; then
  if [[ ! "$OBJECT_ID" =~ ^[0-9]+$ ]]; then
    echo "OBJECT_ID must be a positive integer." >&2
    exit 2
  fi
  OBJECT_SQL="o.\"Id\" = $OBJECT_ID"
fi

read -r -d '' SELECT_SQL <<SQL || true
WITH ordered_photos AS (
  SELECT
    o."Id" AS object_id,
    p."Id" AS photo_id,
    COALESCE(NULLIF(replace(replace(o."Name", E'\t', ' '), E'\n', ' '), ''), '-') AS object_name,
    COALESCE(NULLIF(replace(replace(COALESCE(p."Alt", ''), E'\t', ' '), E'\n', ' '), ''), '-') AS alt,
    p."Url" AS photo_url,
    COALESCE(NULLIF(replace(replace(COALESCE(sl."SourceName", ''), E'\t', ' '), E'\n', ' '), ''), '-') AS source_name,
    COALESCE(NULLIF(replace(replace(COALESCE(sl."SourceUrl", ''), E'\t', ' '), E'\n', ' '), ''), '-') AS source_url,
    row_number() OVER (PARTITION BY p."ObjectId" ORDER BY p."SortOrder", p."Id") AS photo_rank
  FROM "ObjectPhotos" p
  JOIN "GlampingObjects" o ON o."Id" = p."ObjectId"
  LEFT JOIN "SourceLinks" sl ON sl."ObjectId" = o."Id"
  WHERE $STATUS_SQL
    AND $SOURCE_SQL
    AND $OBJECT_SQL
)
SELECT object_id, photo_id, object_name, alt, photo_url, source_name, source_url
FROM ordered_photos
WHERE photo_rank = 1
  AND photo_url ~* '^https?://'
  AND photo_url NOT LIKE '/storage/%'
ORDER BY object_id
LIMIT $LIMIT;
SQL

rows="$(psql_query "$SELECT_SQL")"

if [[ -z "$rows" ]]; then
  echo "No external first photos found for STATUS=$STATUS SOURCE_NAME=${SOURCE_NAME:-any}."
  exit 0
fi

printf "object_id\tphoto_id\tobject_name\talt\told_url\tsource_name\tsource_url\tnew_url\n" > "$MANIFEST"

if [[ "$DRY_RUN" == "1" ]]; then
  printf "%s\n" "$rows" | while IFS=$'\t' read -r object_id photo_id object_name alt old_url source_name source_url; do
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t\n" \
      "$object_id" "$photo_id" "$object_name" "$alt" "$old_url" "$source_name" "$source_url" | tee -a "$MANIFEST"
  done
  echo "Dry run manifest: $MANIFEST"
  exit 0
fi

docker compose exec -T "$STORAGE_SERVICE" sh -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null &&
   mc mb -p "local/'"$BUCKET"'" >/dev/null 2>&1 || true'
docker compose exec -T "$STORAGE_SERVICE" sh -c \
  'mc anonymous set download "local/'"$BUCKET"'" >/dev/null 2>&1 || true'

upload_webp() {
  local local_file="$1"
  local object_key="$2"
  local tmp_name="onlyglamps-upload-$(basename "$local_file")"

  # </dev/null обязателен: без него `docker compose exec -T` читает stdin
  # вызывающего цикла и съедает оставшиеся строки выборки — скрипт
  # обрабатывал ровно одну фотографию за запуск при любом LIMIT.
  docker compose cp "$local_file" "$STORAGE_SERVICE:/tmp/$tmp_name" >/dev/null </dev/null
  docker compose exec -T "$STORAGE_SERVICE" sh -c \
    'mc cp --attr "Content-Type=image/webp;Cache-Control=public,max-age=31536000,immutable" "/tmp/'"$tmp_name"'" "local/'"$BUCKET"'/'"$object_key"'" >/dev/null &&
     rm -f "/tmp/'"$tmp_name"'"' </dev/null
}

update_photo_url() {
  local photo_id="$1"
  local new_url="$2"
  local escaped_url
  escaped_url="$(sql_escape "$new_url")"

  psql_query "UPDATE \"ObjectPhotos\" SET \"Url\" = '$escaped_url' WHERE \"Id\" = $photo_id;" >/dev/null
}

drop_photo() {
  local photo_id="$1"
  # Раньше URL обнулялся, а запись оставалась. Публичный API берёт главное
  # фото как Photos.OrderBy(SortOrder).First().Url — и объект показывал
  # заглушку даже с двумя десятками живых фотографий, потому что первой
  # по сортировке оставалась пустая строка. Удаляем запись: следующее
  # фото становится первым.
  psql_query "DELETE FROM \"ObjectPhotos\" WHERE \"Id\" = $photo_id;" >/dev/null
}

total_rows="$(printf "%s\n" "$rows" | grep -c .)"
done_count=0
failed_count=0

# Читаем через дескриптор 3, а не через stdin: любая команда в теле цикла,
# которая захочет прочитать stdin, иначе проглотит остаток выборки.
# Заодно цикл выполняется в текущей оболочке, и счётчики переживают итерации.
while IFS=$'\t' read -r object_id photo_id object_name alt old_url source_name source_url <&3; do
  object_dir="$WORK_DIR/object-$object_id-photo-$photo_id"
  mkdir -p "$object_dir"

  raw_file="$object_dir/source"
  normalized_file="$object_dir/input.png"
  enhanced_file="$object_dir/enhanced.png"
  main_file="$object_dir/main-${MAIN_WIDTH}.webp"
  full_file="$object_dir/full-${FULL_WIDTH}.webp"
  thumb_file="$object_dir/thumb-${THUMB_WIDTH}.webp"

  done_count=$((done_count + 1))
  echo "[$done_count/$total_rows] object #$object_id photo #$photo_id"
  if ! curl --fail --location --silent --show-error --max-time 45 --retry 2 "$old_url" --output "$raw_file" </dev/null; then
    if [[ "$ON_DOWNLOAD_ERROR" == "skip" ]]; then
      echo "  пропуск: скачать не удалось"
      failed_count=$((failed_count + 1))
      drop_photo "$photo_id"
      printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
        "$object_id" "$photo_id" "$object_name" "$alt" "$old_url" "$source_name" "$source_url" "DOWNLOAD_FAILED" >> "$MANIFEST"
      continue
    fi
    exit 1
  fi

  "$MAGICK_BIN" "$raw_file" -auto-orient -strip "$normalized_file"
  if [[ "$PROCESSOR" == "realesrgan" ]]; then
    "$REALESRGAN_BIN" \
      -i "$normalized_file" \
      -o "$enhanced_file" \
      -n "$REALESRGAN_MODEL" \
      -s "$REALESRGAN_SCALE" \
      -t "$REALESRGAN_TILE_SIZE" >/dev/null
  else
    enhanced_file="$normalized_file"
  fi

  "$MAGICK_BIN" "$enhanced_file" -auto-orient -strip -resize "${MAIN_WIDTH}x${MAIN_WIDTH}>" \
    -quality "$WEBP_QUALITY" -define webp:method=6 "$main_file"
  "$MAGICK_BIN" "$enhanced_file" -auto-orient -strip -resize "${FULL_WIDTH}x${FULL_WIDTH}>" \
    -quality "$WEBP_QUALITY" -define webp:method=6 "$full_file"
  "$MAGICK_BIN" "$enhanced_file" -auto-orient -strip -resize "${THUMB_WIDTH}x${THUMB_WIDTH}>" \
    -quality "$WEBP_QUALITY" -define webp:method=6 "$thumb_file"

  stamp="$(date +%Y%m%d%H%M%S)"
  base_key="objects/$object_id/photos/$photo_id/$stamp"
  main_key="$base_key/main-${MAIN_WIDTH}.webp"
  full_key="$base_key/full-${FULL_WIDTH}.webp"
  thumb_key="$base_key/thumb-${THUMB_WIDTH}.webp"

  upload_webp "$main_file" "$main_key"
  upload_webp "$full_file" "$full_key"
  upload_webp "$thumb_file" "$thumb_key"

  new_url="/storage/$BUCKET/$main_key"
  update_photo_url "$photo_id" "$new_url"

  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
    "$object_id" "$photo_id" "$object_name" "$alt" "$old_url" "$source_name" "$source_url" "$new_url" >> "$MANIFEST"

  # Промежуточные файлы удаляем сразу: на полном прогоне это десятки гигабайт.
  rm -rf "$object_dir"
done 3< <(printf "%s\n" "$rows")

echo "Обработано: $((done_count - failed_count)) из $total_rows, не скачалось: $failed_count"

echo "Finished. Manifest: $MANIFEST"
