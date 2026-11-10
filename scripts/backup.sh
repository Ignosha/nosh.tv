#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?Set source database URI in the environment}"
: "${BACKUP_AGE_RECIPIENT:?Set an age public encryption recipient}"
: "${BACKUP_OUTPUT:?Set the encrypted backup destination path}"
command -v pg_dump >/dev/null
command -v age >/dev/null
if [[ -e "$BACKUP_OUTPUT" ]]; then echo 'Refusing to overwrite an existing backup' >&2; exit 1; fi
PGDATABASE="$DATABASE_URL" pg_dump --format=custom --no-owner --no-acl | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$BACKUP_OUTPUT"
chmod 600 "$BACKUP_OUTPUT"
echo 'Encrypted backup created. Copy to approved off-site storage and verify recovery in an isolated database.'
