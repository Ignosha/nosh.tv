# Operations handoff

The enterprise preview remains separate from production. Do not migrate, reset credentials or run the empty-project bootstrap against either populated database.

## Automated checks

GitHub Verification runs the application suite, browser/data flow, dependency audit, operations guard tests and native encrypted PostgreSQL recovery. Synthetic recovery passed locally and in run `42935748072`; monitoring and staging-runner guard tests passed in run `42936702112`. Those runs do not authenticate real staging users.

CI pins Ubuntu 24.04, uses its preinstalled Chrome and verifies the official age 1.3.2 archive against a committed SHA-256. This removes the failing Ubuntu package-mirror/DNS dependency while preserving every browser and recovery check. Run `43059128113` passed the application build and runtime tests but failed before recovery on Ubuntu package downloads; that infrastructure failure is not a successful full run.

Cloudflare Worker `tracesworn-staging-monitor` runs every five minutes. It checks staging database readiness, disabled public signup, anonymous company-read denial and the existing production homepage's availability. Homepage availability is not a dynamic application/database health check. The monitor has only a public staging key and its own private KV state, with no public Worker URL or control endpoint. Redacted history expires after seven days; the latest record is retained. Logs and traces are enabled.

The first checker used `redirect: error`, which Workers rejects before fetching. Version 2 uses `manual`, rejects redirect responses and separates its incident counters from those invalid checks. The Node-only tests missed the platform incompatibility; a new Miniflare runtime regression test reproduces it and verifies the fix, real KV persistence, redirect refusal and header isolation. The installed local runtime supports compatibility dates through 2026-08-06; the hosted Worker retains 2026-11-11 and requires an independent live check. Historical version-1 failures are checker errors, not uptime evidence.

Email alerts remain unconfigured. The sending domain was reverified and a domain-restricted send-only key was created, but automatic approval review rejected installing the key and recipient as private Cloudflare secrets without specific destination/address authorization. No key or recipient was installed and no test email was sent. The owner has been asked for that explicit authorization; no alternative transfer or sending route was attempted.

The implementation opens an incident after two failed checks, limits accepted reminders to once an hour, retries recovery delivery and uses idempotency keys. A send-only, domain-scoped Resend key belongs in a Worker secret, never source control. Provider acceptance is not proof of inbox delivery. These probes do not yet supply auth-failure, quota-abuse or full application-error alerts.

The updated monitor also accepts an optional private KV `delivery-test` record containing only `{ "id": "UUID", "requestedAt": "ISO_TIMESTAMP" }`, with a one-hour TTL. It fixes the recipient and message from reviewed code/private configuration, rejects stale requests, records a bounded provider receipt and suppresses repeated accepted sends with an idempotency key. It exposes no test/control HTTP endpoint. Both Node and real-KV Miniflare tests cover retries, duplicate suppression, secret/header isolation and ignored injected content. After authorized configuration, queue one request, read `latest.deliveryTest.providerMessageId`, and verify the provider's delivery event separately. Do not equate an accepted receipt with delivery or a staffed response channel.

The schedule uses about 288 invocations and 576 KV writes/day. Shared-account usage and billing still need checking: the connected Cloudflare OAuth credential cannot read subscriptions (403). No subscription was created or upgraded.

## Live staging acceptance: prepared, not executed

Review `scripts/live-acceptance.mjs` and its exact commit before granting credentials. It refuses every target except the operator's staging project. It creates four synthetic confirmed accounts, enrolls real TOTP, provisions two companies and exercises five roles, invitations/replay, tenant isolation, direct-write denial, stale revisions, independent action review, refresh/logout/fresh MFA, quotas, expiry and membership revocation through real Auth/API calls.

The runner disables its synthetic memberships, suspends its companies and bans/resets its accounts afterward, preserving immutable evidence. If cleanup fails, use the printed run UUID to find only that run's fixture company names and Auth metadata. Investigate with an administrator; do not rewrite audit history. Operations must have permission to update those fixture organizations/members; the runner reports failure rather than granting itself permissions.

On a trusted private runner, set `SUPABASE_URL=https://bowpuebiycqbodkpwdcb.supabase.co`, `SUPABASE_ANON_KEY`, the staging `SUPABASE_SERVICE_ROLE_KEY` and `ACCEPTANCE_CONFIRMATION=ISOLATED_STAGING_PROJECT`, then run `node scripts/live-acceptance.mjs`. Privileged keys belong in private runner secrets, never chat or the enterprise web deployment.

The GitHub workflow needs an `enterprise-staging` environment with a required reviewer and a selected deployment branch rule named exactly `refs/pull/10/merge`. Optionally also allow `feat/firm-premier` for later manual branch dispatch. Wildcards and all other refs are refused by the guard. Add the two keys as environment secrets after reviewing the commit. The current integration cannot create the environment or manage secrets (403); the account owner must configure [repository environments](https://github.com/Ignosha/nosh.tv/settings/environments).

Once configured, applying the `run-staging-acceptance` label to PR #10 starts the gated job. Approve the exact source commit shown by its environment link. The workflow checks out that PR head and cannot run for forks, another PR or another branch. No merge is needed for this label-triggered path; `workflow_dispatch` remains an optional future path after default-branch registration. A trusted private runner can also execute the same script.

Guard tests check TOTP standard vectors and reject unauthorized targets before network access. They do not prove the real-provider flow. JWT expiry timing, browser cookie/session behavior, SSO if contracted, report/storage quotas and invitation-expiry scenarios still require live acceptance.

## Real recovery: private access required

Use the backup/restore scripts on a trusted ephemeral runner with a private libpq service file. They preserve ACLs, use explicit aliases, prevent archive replacement, authenticate ciphertext before restoring, refuse the source identity and roll back an occupied-target failure. Decryption creates a temporary plaintext archive inside a 0700 directory and removes it on exit; destroy the runner afterward.

Managed Supabase recovery also needs compatible Auth roles/schemas, encryption/Vault keys where applicable, Storage object backups and new-session acceptance on the isolated restored project. The synthetic fixture is not a backup of either real project. Do not reset a live database password to give automation access.

## Commercial hosting

Upgrade the existing Vercel team through [its billing dashboard](https://vercel.com/ignoshas-projects/~/settings/billing). The checked Pro baseline is $20/month plus usage. No paid upgrade is complete.

Supabase Pro is $25/month before extra compute/add-ons and includes daily managed backups. A second active Micro project can add $10/month. The combined baseline is therefore $45/month, or about $55/month with the second Micro project, before usage, taxes and add-ons. PITR is separate. Verify organization/project billing before purchase. The catalog cannot attach its Vercel plan to the existing team; do not provision duplicate infrastructure as an upgrade.

Production promotion remains blocked until live acceptance, real recovery, delivered/staffed alerts, commercial hosting and operating/customer terms are confirmed.
