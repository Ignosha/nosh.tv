# Operations handoff

The enterprise preview remains separate from production. Do not migrate, reset credentials or run the empty-project bootstrap against either populated database.

## Automated checks

GitHub Verification runs the application suite, browser/data flow, dependency audit, operations guard tests and native encrypted PostgreSQL recovery. Synthetic recovery passed locally and in run `42935748072`; monitoring and staging-runner guard tests passed in run `42936702112`. Those runs do not authenticate real staging users.

Cloudflare Worker `tracesworn-staging-monitor` runs every five minutes. It checks staging database readiness, disabled public signup, anonymous company-read denial and the existing production homepage's availability. Homepage availability is not a dynamic application/database health check. The monitor has only a public staging key and its own private KV state, with no public Worker URL or control endpoint. Redacted history expires after seven days; the latest record is retained. Logs and traces are enabled.

The first checker used `redirect: error`, which Workers rejects before fetching. Version 2 uses `manual`, rejects redirect responses and separates its incident counters from those invalid checks. The Node-only tests missed the platform incompatibility; a new Miniflare runtime regression test reproduces it and verifies the fix, real KV persistence, redirect refusal and header isolation. The installed local runtime supports compatibility dates through 2026-08-06; the hosted Worker retains 2026-11-11 and requires an independent live check. Historical version-1 failures are checker errors, not uptime evidence.

Email alerts remain unconfigured until the recipient is confirmed. No test email has been sent. The implementation opens an incident after two failed checks, limits accepted reminders to once an hour, retries recovery delivery and uses idempotency keys. A send-only, domain-scoped Resend key belongs in a Worker secret, never source control. Provider acceptance is not proof of inbox delivery. These probes do not yet supply auth-failure, quota-abuse or full application-error alerts.

The schedule uses about 288 invocations and 576 KV writes/day. Shared-account usage and billing still need checking: the connected Cloudflare OAuth credential cannot read subscriptions (403). No subscription was created or upgraded.

## Live staging acceptance: prepared, not executed

Review `scripts/live-acceptance.mjs` and its exact commit before granting credentials. It refuses every target except the operator's staging project. It creates four synthetic confirmed accounts, enrolls real TOTP, provisions two companies and exercises five roles, invitations/replay, tenant isolation, direct-write denial, stale revisions, independent action review, refresh/logout/fresh MFA, quotas, expiry and membership revocation through real Auth/API calls.

The runner disables its synthetic memberships, suspends its companies and bans/resets its accounts afterward, preserving immutable evidence. If cleanup fails, use the printed run UUID to find only that run's fixture company names and Auth metadata. Investigate with an administrator; do not rewrite audit history. Operations must have permission to update those fixture organizations/members; the runner reports failure rather than granting itself permissions.

On a trusted private runner, set `SUPABASE_URL=https://bowpuebiycqbodkpwdcb.supabase.co`, `SUPABASE_ANON_KEY`, the staging `SUPABASE_SERVICE_ROLE_KEY` and `ACCEPTANCE_CONFIRMATION=ISOLATED_STAGING_PROJECT`, then run `node scripts/live-acceptance.mjs`. Privileged keys belong in private runner secrets, never chat or the enterprise web deployment.

The optional GitHub workflow needs an `enterprise-staging` environment with a required reviewer and exactly one selected deployment branch: `feat/firm-premier`. Add the keys as environment secrets after reviewing the commit. The current integration cannot create the environment or manage secrets (403); the account owner must configure [repository environments](https://github.com/Ignosha/nosh.tv/settings/environments). A new `workflow_dispatch` workflow must exist on the default branch before GitHub exposes manual dispatch. Do not merge the enterprise release just to register it; a trusted private operations runner can execute the script separately while this release remains draft.

Guard tests check TOTP standard vectors and reject unauthorized targets before network access. They do not prove the real-provider flow. JWT expiry timing, browser cookie/session behavior, SSO if contracted, report/storage quotas and invitation-expiry scenarios still require live acceptance.

## Real recovery: private access required

Use the backup/restore scripts on a trusted ephemeral runner with a private libpq service file. They preserve ACLs, use explicit aliases, prevent archive replacement, authenticate ciphertext before restoring, refuse the source identity and roll back an occupied-target failure. Decryption creates a temporary plaintext archive inside a 0700 directory and removes it on exit; destroy the runner afterward.

Managed Supabase recovery also needs compatible Auth roles/schemas, encryption/Vault keys where applicable, Storage object backups and new-session acceptance on the isolated restored project. The synthetic fixture is not a backup of either real project. Do not reset a live database password to give automation access.

## Commercial hosting

Upgrade the existing Vercel team through [its billing dashboard](https://vercel.com/ignoshas-projects/~/settings/billing). The checked Pro baseline is $20/month plus usage. No paid upgrade is complete.

Supabase Pro is $25/month before extra compute/add-ons and includes daily managed backups. A second active Micro project can add $10/month. The combined baseline is therefore $45/month, or about $55/month with the second Micro project, before usage, taxes and add-ons. PITR is separate. Verify organization/project billing before purchase. The catalog cannot attach its Vercel plan to the existing team; do not provision duplicate infrastructure as an upgrade.

Production promotion remains blocked until live acceptance, real recovery, delivered/staffed alerts, commercial hosting and operating/customer terms are confirmed.
