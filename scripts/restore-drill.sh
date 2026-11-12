#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${BACKUP_PG_SERVICE:?Set the source service alias for the identity safety check}"
: "${RESTORE_PG_SERVICE:?Set an isolated restore service alias from PGSERVICEFILE}"
: "${PGSERVICEFILE:?Set a private libpq service FILE path for target credentials}"
: "${BACKUP_INPUT:?Set encrypted backup path}"
: "${BACKUP_AGE_IDENTITY_FILE:?Set private age identity FILE path, never its contents}"
if [[ "${RESTORE_CONFIRMATION:-}" != 'ISOLATED_DISPOSABLE_DATABASE' || ! "$RESTORE_PG_SERVICE" =~ ^[A-Za-z0-9_-]+$ || ! "$BACKUP_PG_SERVICE" =~ ^[A-Za-z0-9_-]+$ ]]; then echo 'Restore requires explicit isolated-target confirmation and valid service aliases' >&2; exit 1; fi
command -v pg_restore >/dev/null
command -v psql >/dev/null
command -v age >/dev/null
restore_temp_dir=$(mktemp -d)
cleanup_restore() { rm -f -- "$restore_temp_dir/errors" "$restore_temp_dir/restore.dump"; rmdir -- "$restore_temp_dir"; }
trap cleanup_restore EXIT
if ! source_identity=$(psql --dbname="service=$BACKUP_PG_SERVICE" -Atq -v ON_ERROR_STOP=1 -c "select current_database()||':'||coalesce(inet_server_addr()::text,'local')||':'||coalesce(inet_server_port()::text,'local')" 2>"$restore_temp_dir/errors"); then echo 'Source identity check failed' >&2; exit 1; fi
if ! target_identity=$(psql --dbname="service=$RESTORE_PG_SERVICE" -Atq -v ON_ERROR_STOP=1 -c "select current_database()||':'||coalesce(inet_server_addr()::text,'local')||':'||coalesce(inet_server_port()::text,'local')" 2>"$restore_temp_dir/errors"); then echo 'Target identity check failed' >&2; exit 1; fi
if [[ "$source_identity" == "$target_identity" ]]; then echo 'Refusing to restore into the source database' >&2; exit 1; fi
# Authenticate the ENTIRE archive before a database transaction can commit.
# Use a trusted ephemeral runner: this private temporary file contains plaintext.
if ! age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" --output "$restore_temp_dir/restore.dump" "$BACKUP_INPUT" 2>"$restore_temp_dir/errors"; then
  echo 'Archive authentication failed; target was not modified.' >&2
  exit 1
fi
# No credential appears in process arguments. No --clean: a populated target fails and rolls back.
if ! pg_restore --dbname="service=$RESTORE_PG_SERVICE" --exit-on-error --single-transaction --no-owner "$restore_temp_dir/restore.dump" 2>"$restore_temp_dir/errors"; then
  echo 'Restore failed; transaction was not committed. Diagnostic contents were kept out of logs.' >&2
  exit 1
fi
if ! psql --dbname="service=$RESTORE_PG_SERVICE" -v ON_ERROR_STOP=1 -c 'select count(*) as organizations from public.kl_organizations; select count(*) as programs from public.kl_assurance_programs; select count(*) as audit_snapshots from public.kl_assurance_history;' 2>"$restore_temp_dir/errors"; then echo 'Restored database verification failed' >&2; exit 1; fi
echo 'Restore command completed. Compare checksums/counts, verify roles/RLS and run cross-tenant acceptance before recording a successful drill.'
