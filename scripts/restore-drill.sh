#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?Set the source URI in the environment for the identity safety check}"
: "${RESTORE_PG_SERVICE:?Set an isolated restore service alias from PGSERVICEFILE}"
: "${PGSERVICEFILE:?Set a private libpq service FILE path for target credentials}"
: "${BACKUP_INPUT:?Set encrypted backup path}"
: "${BACKUP_AGE_IDENTITY_FILE:?Set private age identity FILE path, never its contents}"
if [[ "${RESTORE_CONFIRMATION:-}" != 'ISOLATED_DISPOSABLE_DATABASE' || ! "$RESTORE_PG_SERVICE" =~ ^[A-Za-z0-9_-]+$ ]]; then echo 'Restore requires explicit isolated-target confirmation and a valid service alias' >&2; exit 1; fi
command -v pg_restore >/dev/null
command -v psql >/dev/null
command -v age >/dev/null
source_identity=$(PGDATABASE="$DATABASE_URL" psql -Atq -v ON_ERROR_STOP=1 -c "select current_database()||':'||coalesce(inet_server_addr()::text,'local')||':'||coalesce(inet_server_port()::text,'local')")
target_identity=$(psql --dbname="service=$RESTORE_PG_SERVICE" -Atq -v ON_ERROR_STOP=1 -c "select current_database()||':'||coalesce(inet_server_addr()::text,'local')||':'||coalesce(inet_server_port()::text,'local')")
if [[ "$source_identity" == "$target_identity" ]]; then echo 'Refusing to restore into the source database' >&2; exit 1; fi
# No credential appears in process arguments. No --clean: a populated target fails and rolls back.
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$BACKUP_INPUT" | pg_restore --dbname="service=$RESTORE_PG_SERVICE" --exit-on-error --single-transaction --no-owner --no-acl
psql --dbname="service=$RESTORE_PG_SERVICE" -v ON_ERROR_STOP=1 -c 'select count(*) as organizations from public.kl_organizations; select count(*) as programs from public.kl_assurance_programs; select count(*) as audit_snapshots from public.kl_assurance_history;'
echo 'Restore command completed. Compare checksums/counts, verify roles/RLS and run cross-tenant acceptance before recording a successful drill.'
