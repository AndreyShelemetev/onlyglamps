#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/mirturbaz-draft-import.sql[.gz] [ssh-host] [remote-project-dir]" >&2
  exit 2
fi

DUMP_FILE="$1"
SSH_HOST="${2:-hotelin-server}"
REMOTE_PROJECT="${3:-/opt/onlyglamps}"
REMOTE_IMPORTS="${REMOTE_PROJECT}/deploy/imports"
REMOTE_SCRIPTS="${REMOTE_PROJECT}/scripts"

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 2
fi

case "$DUMP_FILE" in
  *.sql|*.sql.gz) ;;
  *)
    echo "Dump file must be .sql or .sql.gz: $DUMP_FILE" >&2
    exit 2
    ;;
esac

remote_dump="${REMOTE_IMPORTS}/$(basename "$DUMP_FILE")"
remote_sql="$remote_dump"
if [[ "$remote_sql" == *.gz ]]; then
  remote_sql="${remote_sql%.gz}"
fi

echo "Preparing remote directories on ${SSH_HOST}:${REMOTE_PROJECT}"
ssh "$SSH_HOST" "mkdir -p '$REMOTE_IMPORTS' '$REMOTE_SCRIPTS'"

echo "Uploading dump: $DUMP_FILE"
scp "$DUMP_FILE" "${SSH_HOST}:${remote_dump}"

echo "Uploading import script"
scp scripts/import-mirturbaz-dump.sh "${SSH_HOST}:${REMOTE_SCRIPTS}/import-mirturbaz-dump.sh"

echo "Applying dump on server"
ssh "$SSH_HOST" "set -euo pipefail
  cd '$REMOTE_PROJECT'
  chmod +x scripts/import-mirturbaz-dump.sh
  if [[ '$remote_dump' == *.gz ]]; then
    gzip -df '$remote_dump'
  fi
  scripts/import-mirturbaz-dump.sh '$remote_sql'
"

echo "Server import finished: $remote_sql"
