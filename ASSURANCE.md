# Company Assurance — operational workflow pilot

The company tier is proposed at **$1,499/month**, alongside the $199 individual and $499 practice software pilots. These prices are unvalidated hypotheses, not active subscriptions or guaranteed ROI. Investigation-service pricing remains separate.

## What companies can do

- Start a program for vendor oversight, financial review or a custom evidence-driven process.
- Import a verified issued Report Studio record into an evidence-backed risk register. Imported risks remain **unassessed** until an operator records an assessment.
- Score likelihood and impact, describe controls and record claimed effectiveness. The model removes control credit when supporting references are missing, future-dated or stale.
- Assign remediation owners and due dates, connect dependencies, block premature closure and record a declared reviewer and resolution.
- Generate recurring follow-ups on completion. Due dates remain anchored to the prior obligation rather than moving forward from late completion. Follow-ups need new evidence and review; no automatic completion occurs.
- Review a portfolio brief with critical risks, unassessed items, overdue/blocked actions, stale evidence and owner workloads.
- Compare two issued reports locally to see changed findings, evidence hashes, review checks and metadata after verifying both fingerprints.
- Export sealed portable workspaces, spreadsheet-safe action CSV and printable portfolio briefs.
- Preserve hosted revision snapshots and change reasons, rejecting stale saves instead of silently overwriting another operator's work.

## Routes and data handling

`/assurance` is a local browser preview. Workspace JSON, CSV and report imports are processed in the browser. There is no automatic local persistence. Export before closing or refreshing. Original source documents are not uploaded; references and hashes are recorded. Import files must be below 700 KB; normalized workspace payloads are bounded to 600 KB for round-trip exports.

`/report-compare` accepts two issued Report Studio JSON records below 900 KB, validates fingerprints and required review fields, and compares stable source/finding identifiers. This establishes which supplied report content differs, not whether the content is true. Different matter references produce a warning.

`/admin/assurance` is the existing operator-managed hosted workspace. Configure Supabase, apply `supabase/schema.sql`, and configure `ADMIN_PASSWORD`. A save requires a declared operator name and change reason. The server validates the entire workspace, then calls a service-role-only transaction that locks the program, checks the expected revision and appends an audit snapshot. History pages are read-only and evaluate freshness at the recorded date; current workspaces evaluate it today. A privileged database administrator remains able to change the system; this is application-level audit preservation, not independent notarization.

Admin server actions now check credentials directly in addition to middleware, including assurance saves and the existing matter, lead, time-entry, firm and report-archive actions. This still uses a shared administrator identity; author/reviewer/operator names are declarations, not separate authenticated users.

## Model and workflow rules

- Likelihood and impact: integers 1–5. Inherent score: their product.
- Claimed effectiveness: 0–100%. Credited only when assessed, a control is described and every linked evidence reference is within the configured freshness window.
- Residual: `max(1, ceil(inherent * (100 - credited_effectiveness) / 100))`.
- Bands: low 1–5, medium 6–11, high 12–19, critical 20–25. Unassessed risks are explicitly labeled and receive no control credit.
- Evidence freshness uses UTC calendar dates, including the end of the configured window. Future dates do not count as fresh. Referenced documents are not fetched or independently verified.
- Actions: open → in progress → review → complete. Returning from review to in progress is allowed. Closure needs a distinct declared reviewer, resolution, fresh evidence and all dependencies complete. Missing references and dependency cycles are rejected.
- Reopening a completed action is blocked while it has completed dependent actions. Re-completing an action does not create duplicate recurring follow-ups.
- Recurrence uses fixed calendar days, not business days, months or jurisdictional holiday calendars. Late follow-ups can remain overdue; that is deliberate, visible backlog.
- Capacity per workspace: 200 risks, 200 evidence entries and 500 action instances, subject to payload limits. Split programs or archive/export before reaching these limits. Starter packs are operational examples, not exhaustive compliance frameworks.

## What is not sold as implemented

The company pilot is not a production multi-tenant enterprise SaaS. Separate company accounts, tenant isolation, workforce RBAC/SSO, authenticated dual approval, subscription entitlements, automatic owner emails/escalations, third-party integrations, continuous source verification, regulatory certification, and a contracted uptime/backup-recovery SLA remain unimplemented. Do not onboard independent companies into a shared administrator environment as though it isolates their data. Production company deployment needs those controls and end-to-end acceptance before paid rollout.

Software should earn repeat use through useful workflows and portable history. Exports intentionally support migration; there is no artificial data lock-in.

## Validation and deployment checklist

`npm test` exercises freshness/control scoring, unassessed imports, graph validation, closure/reopening rules, recurrence anchoring/deduplication, CSV formula safety, report differences, policy starters and direct administrator credential checks. Embedded PostgreSQL tests cover schema reruns, audit snapshot preservation, optimistic conflicts, immutable history and anonymous write denial, alongside earlier service tests.

Start the app, then run `npm run test:browser` (set `REPORT_STUDIO_URL`, `BROWSER_EXECUTABLE` and `REPORT_STUDIO_ARTIFACTS` as needed). Browser acceptance covers dependent closure, recurring follow-ups, export/printing, tamper rejection, source-hash comparison and unassessed report import with fictional data.

Before production: test real Supabase roles and transport, simultaneous saves, backup restoration, retention obligations and approved company access policies. Verify all client-facing pricing/limits against the signed scope. There are no production service credentials in the current environment.

To validate the proposed company price, measure the buyer's actual time saved, missed-review reduction and review workload in a paid pilot. For illustration only, $1,499 equals about 15 hours at a $100 loaded hourly cost; this is not a savings forecast and excludes adoption effort and other costs.

For larger local workspaces, action-editing and control-editing forms mount only when expanded; portfolio lists remain visible without constructing hundreds of dependency selectors. Save form changes before closing an editor or navigating away. Editing in the browser is distinct from committing a hosted audit revision.

For local direct-action security acceptance, start the production build with a test `ADMIN_PASSWORD`, then run `TEST_ADMIN_PASSWORD=<same local password> npm run test:admin-security` with `REPORT_STUDIO_URL` set to that local origin. It uses an invalid workspace so no database write occurs. This is a local test command, not a request to put production secrets into chat.
