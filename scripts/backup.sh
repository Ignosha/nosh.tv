#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${PGSERVICEFILE:?Set a private libpq service FILE path}"
: "${BACKUP_PG_SERVICE:?Set the source service alias from PGSERVICEFILE}"
: "${BACKUP_AGE_RECIPIENT:?Set an age public encryption recipient}"
: "${BACKUP_OUTPUT:?Set the encrypted backup destination path}"
command -v pg_dump >/dev/null
command -v age >/dev/null
if [[ ! "$BACKUP_PG_SERVICE" =~ ^[A-Za-z0-9_-]+$ ]]; then echo 'Invalid source service alias' >&2; exit 1; fi
if [[ -e "$BACKUP_OUTPUT" ]]; then echo 'Refusing to overwrite an existing backup' >&2; exit 1; fi
backup_temp_dir=$(mktemp -d "${BACKUP_OUTPUT}.partial.XXXXXX")
cleanup_backup() { rm -f -- "$backup_temp_dir/backup.age" "$backup_temp_dir/errors"; rmdir -- "$backup_temp_dir"; }
trap cleanup_backup EXIT
# ACLs include security-critical REVOKE/GRANT statements for definer functions.
# Keep them: stripping ACLs can restore PUBLIC execution on privileged RPCs.
if ! pg_dump --dbname="service=$BACKUP_PG_SERVICE" --format=custom --no-owner 2>"$backup_temp_dir/errors" | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$backup_temp_dir/backup.age" 2>>"$backup_temp_dir/errors"; then
  echo 'Backup failed; no completed archive was published. Diagnostic contents were kept out of logs.' >&2
  exit 1
fi
chmod 600 "$backup_temp_dir/backup.age"
# Same-directory hard link publishes only a complete archive, without replacement.
ln -- "$backup_temp_dir/backup.age" "$BACKUP_OUTPUT"
echo 'Encrypted backup created. Copy to approved off-site storage and verify recovery in an isolated database.'
