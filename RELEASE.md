# Enterprise release status and operating runbook

**Repository controls are implemented and locally tested. The production release is blocked until the evidence below is completed.** Passing a build or readiness endpoint is not an enterprise certification.

The connected Vercel project is `nosh.tv`, with verified `tracesworn.com` domains. Metadata inspection found a Supabase URL but no public session key in its environment; this executor has no production database credentials. No production variables, migrations, identity providers or production deployments have been changed by this work.

The most recent preview failed before building because the legacy preparation worker requested a ten-minute cron on a Hobby account. The default schedule is now daily to permit previews on the existing account. That worker processes at most one job per invocation; daily scheduling is for evaluation and does not establish service delivery capacity. Commercial service launch needs a permitted hosting plan, a suitable worker cadence and a measured backlog budget. Enterprise mode disables the legacy worker entirely. GitHub verification passed for the enterprise hardening commit; hosted preview verification is recorded separately below.

## Architecture and scope

Company access is `/workspace`, backed by Supabase Auth, mandatory current `aal2` MFA and Postgres RLS. Sessions are server-managed HttpOnly, SameSite=Lax, Secure-on-HTTPS cookies. Every company page/action verifies the Auth provider's user; it never trusts an unverified cookie user object. Every mutation checks the exact configured request origin. SSO initiation and PKCE callback exchange use the official SDK and require a configured provider. Password accounts must be provisioned externally; there is no application signup route.

Organization membership is enforced again in Postgres for reads and RPC writes. Owners manage roles; admins/editors can prepare programs, reviewers approve, viewers read published reports. Owners/admins can also review, but submitting or owning an action prevents self-approval. Active membership and MFA are checked on every access. Revoking membership removes future access, including when the contract is expired. Already downloaded/exported content cannot be remotely erased.

Company writes use the user's public-key client and JWT, **not a service-role client**. Do not put `SUPABASE_SERVICE_ROLE_KEY` in the company web deployment. Privileged keys remain in a separate operations environment for provisioning, contract activation and recovery. The public database readiness RPC exposes only a boolean about policy/function setup, not tenant records.

The original `/admin`, case/firm bearer portals, intake and old cron routes are disabled when `ENTERPRISE_MODE=1`. Shared-password administrator actions also reject direct calls in this mode. Keep the legacy service business on a separate controlled deployment if it must continue operating. The enterprise home page replaces service intake/payment messaging. Do not enable enterprise mode on the current service site without a deliberate cutover plan.

## Deployment sequence

1. Use a staging Supabase project and an isolated company deployment first. Configure Auth site URL and callback allowlist to the exact `APP_ORIGIN` and `/auth/callback`. Disable public signup, configure verified email/SSO provisioning, enforce provider rate limits, set access-token lifetime at most 15 minutes, and configure TOTP. Configure SAML/SSO only under an authorized provider plan; this code does not purchase one.
2. Back up the existing database. Review and apply `supabase/schema.sql`, then `supabase/enterprise.sql` with an authorized database migration account. Both files are rerunnable; enterprise.sql must be applied last. Existing pilot programs remain unassigned. Never guess a tenant for old records or present declared pilot approvals as authenticated company approvals.
3. Configure `.env.enterprise.example` through environment settings. Set the public Supabase key, the existing Supabase URL and the exact HTTPS origin. Do not include service-role or shared admin credentials. Use separate preview/staging origins and identity callback allowlists.
4. Run `npm ci`, `npm test`, `npm run typecheck`, `npm audit --omit=dev --audit-level=high`, `npm run build` and `npm run check:release`. Preflight checks configuration and a database readiness boolean; it does not test IdP enrollment or restore a backup.
5. Provision the first verified Auth user with the identity administrator. In a separate trusted operations environment, run `node scripts/provision-company.mjs --name=Company --owner-user-id=UUID`. The organization starts with a 14-day trial, 10 seats and 5 programs. The owner signs in, enrolls TOTP, and creates email-bound, 48-hour one-use invitations. Tokens are shared manually; this workflow does not send unsolicited invitations.
6. Confirm the signed commercial scope and billing outside this app. In the trusted operations environment run `node scripts/activate-contract.mjs --org=UUID --signed-reference=CONTRACT_ID --until=ISO_TIMESTAMP --seats=10 --programs=5`. This records entitlement and quotas; it charges no payment. Contract expiry makes writing read-only while preserving authorized reads/exports. Automated Stripe subscription billing is not implemented for company accounts.
7. Complete the live acceptance evidence below before routing customers to the company deployment. Promote only after successful staging acceptance. Keep prior deploy/schema backup references for rollback.

## Required live acceptance evidence — currently outstanding

- [ ] Real confirmed-user sign-in, TOTP enrollment/challenge, refresh, logout and session expiry against the configured Auth project.
- [ ] Real IdP/SSO callback, provisioning/deprovisioning and recovery tests if SSO is in the signed scope.
- [ ] Two independent real companies and all five roles tested through the browser/API, including guessed foreign IDs, revoked members, stale writes, self-approval attempts and direct RPC attempts.
- [ ] Expired contracts, seat/program/report/storage quotas, invitation replay/expiry and security revocation in read-only mode verified on staging.
- [ ] Encrypted production-style backup restored into an isolated target, with record checksums/counts, Auth/session/key compatibility, RLS and tenant-negative tests verified. Local PGlite physical restoration passed; that is not a production Supabase recovery drill.
- [ ] Hosting rate limits/WAF, TLS, secret rotation, dependency-update ownership and database/API timeout settings reviewed for the selected deployment.
- [ ] Alerting on readiness failure, auth failures, quota abuse, error rate and latency delivered to a staffed response channel. Assign incident owner and escalation contacts.
- [ ] RPO/RTO, retention/deletion/holds, DPA, subprocessor list, geographic residency and customer support terms agreed. No SOC 2/ISO certification or uptime SLA is claimed by this repository.

## Backups, restore and rollback

Use managed PITR plus separately encrypted off-site backups under your data policy. `scripts/backup.sh` pipes a custom-format `pg_dump` directly through `age`; credentials stay in environment/config files, not command arguments. It needs `DATABASE_URL`, `BACKUP_AGE_RECIPIENT`, and `BACKUP_OUTPUT`. Use a least-privilege backup account and protected output directory. Store private decryption identities separately and test key recovery.

`restore-drill.sh` needs a private `PGSERVICEFILE` with an isolated target service alias, `RESTORE_PG_SERVICE`, the source `DATABASE_URL`, `BACKUP_INPUT`, `BACKUP_AGE_IDENTITY_FILE`, and `RESTORE_CONFIRMATION=ISOLATED_DISPOSABLE_DATABASE`. It compares source/target database identities, never runs `--clean`, and uses a transaction. An operator must still verify the target is disposable; alias names alone do not prove isolation. Managed Supabase Auth roles/schemas may require provider-specific backup/restore procedures. Validate those with the provider before production use.

Rolling back application code must not re-enable the legacy surfaces against company data. Leave RLS in place. Do not roll back tenant assignments, audit history or published reports destructively. If a migration fails, pause writes and restore to an isolated environment before choosing a recovery path.

## Observability and security boundaries

`/api/health/live` returns process liveness. `/api/health/ready` is redacted and returns 503 unless enterprise configuration and database checks pass. It is not a compliance or recovery attestation. Database errors returned to company users are reduced to business errors or a correlation reference; logs do not include passwords, tokens, raw workspaces or report contents.

Auth/workspace responses are private/no-store with nonce-based script CSP, restricted form/connect/image policies and no-index headers. Global headers include HSTS, frame denial, nosniff and restricted browser permissions. The framework was upgraded to Next.js 16.4.6 after the initial dependency audit; production dependencies report no known vulnerabilities at verification time.

Audit history and published reports reject application-level updates/deletes. Authenticated submitter/reviewer IDs are separate from declared names inside imported reports. Database-privileged administrators remain trusted; this is not external notarization or protection against a compromised database owner. Source hashes establish integrity, not factual accuracy or legal admissibility.

Quotas: 200 risks, 200 evidence entries, 500 actions and bounded payloads per program; 100 submitted reports per organization/calendar month and 50 MB report storage. Audit storage is capped at 200 MB or 5,000 snapshots per organization by default; writes pause at the limit while reads/exports remain available. Default seats/programs are contract-adjustable by operations. RPC writes have database-backed per-user/per-organization minute buckets. Provider login throttling and edge abuse controls still need live configuration.

## Verification commands

`npm test` includes pure workflow/auth-boundary tests, rerunnable migrations, RLS role tests, authenticated review/publication, revocation, entitlement checks and a local physical restore with preserved tenant policies. `npm run test:browser` covers the local report/assurance features. `npm run test:enterprise-boundary` starts a separate fail-closed enterprise-mode server and checks disabled legacy routes and CSP boot. `npm run test:admin-security` tests the separate legacy mode only. These do not simulate a successful live Supabase login; provider tests require staging credentials and must not be faked.
