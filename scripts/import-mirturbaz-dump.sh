#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/mirturbaz-draft-import.sql" >&2
  exit 2
fi

DUMP_FILE="$1"
DB_SERVICE="${DB_SERVICE:-db}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
REMOTE_BACKUP="/tmp/onlyglamps-before-mirturbaz-${STAMP}.dump"
LOCAL_BACKUP="${BACKUP_DIR}/onlyglamps-before-mirturbaz-${STAMP}.dump"

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 2
fi

mkdir -p "$BACKUP_DIR"

echo "Creating server database backup: $LOCAL_BACKUP"
docker compose exec -T "$DB_SERVICE" sh -c \
  "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --format=custom --file='$REMOTE_BACKUP'"
docker compose cp "${DB_SERVICE}:${REMOTE_BACKUP}" "$LOCAL_BACKUP"
docker compose exec -T "$DB_SERVICE" rm -f "$REMOTE_BACKUP"

echo "Applying dump: $DUMP_FILE"
docker compose exec -T "$DB_SERVICE" sh -c \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$DUMP_FILE"

echo "Import finished. Backup saved at: $LOCAL_BACKUP"
