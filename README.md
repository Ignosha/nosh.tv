# TraceSworn — crypto asset discovery and sealed valuation

Finds crypto in estates, divorces and bankruptcies, values it on the date that matters (death, separation or petition), and seals every figure in a record anyone can verify. Built for attorneys, fiduciaries and trustees.


## Pages

| Page | What it does |
|---|---|
| `/` | Live ledger badge, Find / Open / Prove folder stack, free **address check**, fixed-price packages, process, attorney section, promises, FAQ and case intake |
| `/scan` | **Estate scan**: drop in PDFs, emails (.eml/.mbox), notes or CSVs. They are read in the browser and never uploaded. Finds exchanges, wallets, addresses and possible recovery phrases (flagged, never shown), then values every address now and on the date of death |
| `/tools/wallet-key` | **Hardware wallet scan**: paste a Ledger/Trezor/Sparrow xpub, ypub or zpub; every derived address is checked live (gap limit 20) with balances now and on the date of death. Private keys are refused |
| `/tools/letters` | **Exchange claim letters**: a complete deceased-account request letter for any exchange, printable. Stays in the browser |
| `/tools/plan` | **Legacy plan builder**: a crypto letter of instruction for the living. Warns and blocks printing if a recovery phrase or private key is typed in |
| `/tools` | Hub for all free tools |
| `/case/<token>` | **Family case portal**: private link per case: progress steps, package and Stripe payment, approved findings report, and an in-browser scan that sends only findings (never documents or phrases) |
| `/admin` | **Case desk** (basic auth): what's due today, open cases, revenue this month |
| `/admin/cases/<id>` | **Case workspace**: the playbook for the current stage (checklist, what to say, what to avoid), the stage email (send or open in mail app), payment links tied to the case, **Run analysis** (reads every address and xpub live and drafts the report summary and exchange letters), approve & publish to the family, notes and activity log |
| `/admin/playbook` | The full operating playbook: every stage, call scripts, emails and honest answers to hard questions |

## Pricing

Fixed fees in `src/lib/pricing.ts`, never a percentage. Live Stripe Payment Links are built in.

| Package | Fee |
|---|---|
| Free tools | Free (statement scan, document scan, wallet-key scan, address check, verify, request letters) |
| Discovery Report | $2,500 |
| Evidence Package | $6,500 (court exhibit pack, up to 5 exchanges and 2 wallets) |
| Complex Matter | $12,500 (follow-the-money tracing map, multiple dates, 6+ exchanges) |
| Firm Plan | $1,500 / month (2 reports included, 25% off more) |
| Add-ons | Asset-movement alerts $750/mo · tax cost-basis schedule $1,950 · dissipation analysis $1,500 · valuation date $350 · exchange $495 · wallet $1,250 · rush +$1,500 |

## Premium work (case desk → matter → Premium work)

- **Follow-the-money map** (`src/lib/trace.ts`): follows Bitcoin three hops from the matter's addresses, groups addresses spent together (common-input heuristic, skipping batches over 20 inputs), and stops at high-volume services (400+ transactions), where records must be requested. Public preview, one hop: `/tools/trace`.
- **Court exhibit pack** (`/admin/cases/<id>/exhibits`): numbered exhibits (summary, balance-history charts, tracing map, schedules, alerts), methodology and a declaration template, all tied to one SHA-256 fingerprint. Print to PDF; the sealed `.json` is at `/admin/cases/<id>/record`.
- **Cost-basis schedule** and **dissipation analysis** (`src/lib/schedules.ts`): every lot and every transfer out, valued at the daily close.
- **Asset-movement alerts** (`src/lib/watch.ts`, `/api/cron/watch` daily): re-reads every watched address and emails a sealed alert when anything moves. Paying the alerts link turns watching on automatically.

## Client finder & outreach (`/admin/leads`)

1. **Find**: law offices in any city from OpenStreetMap (Overpass), counsel named in court opinions involving crypto in estate, divorce or bankruptcy matters (CourtListener, free token), or your own list. Each firm's own website is read for a public email and practice areas, and every lead is scored for fit (0–100) with its source kept.
2. **Review**: you approve leads before anything is sent.
3. **Send**: a three-email sequence (day 0, 4, 10), weekdays, up to `OUTREACH_DAILY_LIMIT` a day, through Resend. Every email has your postal address and a one-click unsubscribe (`/u/<token>`, plus `List-Unsubscribe` headers). Replies, bookings and unsubscribes stop the sequence. Without Resend, each email opens in your own mail app.

## Sealed records

Every downloadable record is wrapped as `{ record, fingerprint }`, where `fingerprint.value` is the SHA-256 of `record` serialised as JSON with keys sorted at every level and no whitespace (`src/lib/fingerprint.ts`). `/verify` recomputes it in the browser; any standard SHA-256 tool gives the same result.

## Statement scan

`src/lib/statements.ts` flags bank and card statement lines that pay or receive money from 24 exchanges, apps and Bitcoin ATM operators, including the legal names they bill under (Payward for Kraken, BAM Trading for Binance.US, Foris DAX for Crypto.com), with date, amount and direction.

## How a case flows

1. A family opens a case (form or AI chat → form) or pays straight from the pricing page. Either way a case is created and they get a private case page.
2. They run the scan on their case page; only exchange names, addresses and wallet keys are sent.
3. You press **Run analysis**: every address is read live and valued on the date of death, and the summary and exchange letters are drafted (AI-polished if `GEMINI_API_KEY` is set).
4. You review, edit and **Approve & publish**; the family sees the report on their page.
5. Stripe payments (links carry the case ID) mark the case paid automatically via `/api/stripe/webhook`.
6. Every day `/api/cron/followups` sends due reminders for early stages (if Resend is set up) and keeps everything else in your **Due now** list.

## Live data sources (all free, no keys)

| Data | Source | Notes |
|---|---|---|
| Bitcoin balances + history | Blockstream Esplora | Date-of-death balance is rebuilt by undoing transactions after the date (up to 500 per address) |
| ETH + USDC/USDT on Ethereum, Base, Arbitrum, Optimism; POL + USDC/USDT on Polygon | PublicNode RPCs | One 0x address is read on all five networks. Token contracts were verified on-chain. Current balances only; historical EVM balances need an archive node and the report says so |
| Solana SOL, USDC | Solana mainnet RPC | Current balance only, flagged in the report |
| BTC, ETH, SOL, POL, USDT prices | Coinbase Exchange | Last trade, and the daily UTC close on any past date |
| USDC price | CoinGecko | The free tier covers the last 365 days; older dates show "unavailable" |

Live readings never substitute sample figures: when a reading fails, the page says "unavailable". The company landing page and `/product` include a clearly labeled fictional, interactive product example; it never reads or writes customer records.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + ADMIN_PASSWORD
npm run dev                  # http://localhost:3100
```

1. Create a free Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` (server-only).
3. Deploy on Vercel from the repository root. Vercel Hobby is for non-commercial use, so move to Pro once you charge clients.

Behind an HTTPS proxy, run Node with `NODE_USE_ENV_PROXY=1` so server-side `fetch` uses it.

Design: **Heirloom**: oat paper, forest ink and terracotta; Fraunces, Hanken Grotesk and DM Mono; soft folder cards and pill controls. Light by default, with a dark toggle.

## Firm Premier — $10,000/month

The `premier` package adds five services: Ethereum native-transfer tracing, a private firm portal, unlimited alert enrollment, monthly new-matter screening, and same-week turnaround with a named case lead.

1. Apply the updated `supabase/schema.sql`. Firm tables have RLS enabled and are accessible only through server-side service-role queries.
2. Open `/admin/firms` with admin authentication. Provision a firm after confirming the engagement and billing, and enter the actual case lead's name. Share the generated `/firm/<token>` link securely; it is a bearer credential granting access to all firm matters. Revocation currently requires setting `kl_firms.active=false` in the database. Existing individual case links require separate revocation.
3. Submit new matters through that portal. Each receives the named lead and Friday 23:59 UTC deadline; weekend submissions enter the next week. This tracks an operational service commitment; investigation and approval still require the case lead.
4. Submit scan findings through the matter page. Firm addresses automatically enroll in daily alerts with no subscription enrollment cap. The existing watch worker processes 300 oldest-check addresses per invocation; schedule more frequent runs or increase worker capacity for larger portfolios. Alerts are daily polling, not real-time, and delivery needs Resend configuration. Failed or partial EVM reads do not become false zero-balance alerts.
5. The authenticated `/api/cron/screening` job catches up closed calendar months from firm enrollment. It adds every new portal matter to a screening cycle. `/admin/firms` records per-matter review outcomes and marks the cycle complete only when all have outcomes. No-matter months complete automatically. Screening only covers matters submitted to the portal; this does not ingest a firm's external matter-management system.
6. In the case desk, run Ethereum tracing for discovered Ethereum addresses. Results enter the sealed evidence record. The public tracing tool supports Ethereum, Base, Arbitrum, Optimism and Polygon as well as Bitcoin. Ethereum tracing includes native transfers only, up to three hops, 36 nodes, two history pages per address, and five destinations per address. Token transfers, internal calls, bridges and ownership attribution require further investigation. Labels are third-party assertions and may be absent.

Blockscout uses these exact hosts, with no API key:

- `eth.blockscout.com`
- `base.blockscout.com`
- `arbitrum.blockscout.com`
- `explorer.optimism.io` (canonical destination of `optimism.blockscout.com`)
- `polygon.blockscout.com`

In this environment Ethereum answered successfully; Base, Arbitrum and Polygon returned remote Cloudflare challenges. An outbound allowlist alone cannot resolve those remote challenges. Unavailable reads remain explicitly unknown.

Set `NEXT_PUBLIC_PAY_PREMIER` only to a verified **$10,000/month** subscription checkout. Until configured the site routes Premier inquiries into intake. The old $1,500 Firm Plan remains separate. Premier subscription activation, renewal and cancellation are currently administered manually; the existing case payment webhook is not a firm entitlement system.

Validation: `npm run typecheck`, `npm run build`, and `npm test`. Full database and email acceptance testing requires configured Supabase and Resend; no service credentials are included.

## Low-workload paid pilot (current operating model)

The offer now starts with one paid, scoped Discovery Report at `/for-firms`; Premier is an upgrade for repeat customers. Premier includes **4 investigations, 50 screening submissions, 25 specialist hours total, and one revision per investigation per calendar month**. Capacity does not roll over. The service-role `kl_open_firm_matter` function locks the firm row and rejects excess monthly submissions and new investigations after 25 recorded specialist hours. Additional work requires a separate written quote. Discovery and Premier reports read up to 10 supplied/derived public addresses; larger scopes require review. Unlimited alerts means no per-address enrollment charge, not unlimited investigator labor or real-time monitoring.

### Automated work

- New findings invalidate approval, increment a version and queue preparation **only for paid cases or provisioned firms**. First payment also queues already-submitted findings.
- `/api/cron/prepare` claims one job with `SKIP LOCKED` and prepares readings, summary drafts and recent ERC-20 evidence. Failed jobs retry up to three times; expired leases recover. It checks the findings version before saving and leaves final publication to the reviewer. Old findings cannot overwrite an approved or newer report. The committed schedule runs **once daily** so the existing Hobby account can build previews; this processes at most **one job/day**, with retries consuming later runs. It cannot support a same-week service commitment at scale. Before commercial service launch, move to a plan permitting commercial use and change this schedule in `vercel.json` to `*/10 * * * *` (up to 144 single-job attempts/day). Verify provider limits, worker duration, costs and backlog against actual demand. Enterprise mode disables this legacy service worker.
- ERC-20 evidence preserves exact raw quantities and contract addresses, reads at most 50 recent transfers for each of the first three supplied Ethereum addresses, and discloses truncation. It is **not** complete token-flow tracing, bridge tracking or verified token metadata.
- Firm alert enrollment occurs during successful preparation, keeping intake responsive. Already-watched addresses keep their movement baselines. Daily watch-worker throughput remains 300 addresses/run; expand scheduling when needed.
- `/api/cron/digest` sends one weekday digest to `OPS_EMAIL`: review counts, failed jobs and leads marked as replied/booked. It does not read your inbox.
- `/admin/operations` combines review tasks, delivery dates, failed-job retries, time entry, estimated contribution and acquisition counts. Record all specialist time. Firm margins are modeled at list price and exclude other expenses; case receipts are existing cumulative payment fields. These numbers are operational estimates, not an accounting ledger or profit guarantee.

### Remaining human work

Confirm authority and scope, assign an actual qualified lead, review source coverage and conclusions, approve final reports, handle third-party records, answer sales replies, and record time. Screening completion still requires per-matter outcomes. There is no automated expert testimony, recovery, admissibility determination, or guaranteed asset identification. Provisioning and subscription lifecycle remain manual.

### Outreach pilot

`/admin/leads` has a **Load researched pilot prospects** button. Four firms have practice evidence from their own websites; only one general business email was verified. Load and qualify them once, then queue appropriate prospects. Duplicate imports are skipped. The three-message sequence offers the $2,500 scoped engagement and links to `/for-firms`; it does not promise recovery or pretend to have read a case.

Configure `RESEND_API_KEY`, verified `EMAIL_FROM`, monitored `EMAIL_REPLY_TO`, actual `OPERATOR_NAME`, actual `BUSINESS_ADDRESS`, the deployed `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, and `OUTREACH_ENABLED=1`. Never use a prospect's address as your own. Start with `OUTREACH_DAILY_LIMIT=10`, check domain authentication/deliverability, and honor applicable recipient rules. Public listings are not consent or buying intent.

Each email step is claimed in the database before sending and has a stable provider idempotency key. Uncertain or failed sends hold their claim for operator review rather than silently retrying and risking duplicates. Check provider logs before manually reconciling `send_claimed_at`, `delivery_id` and `delivery_error`. Provider idempotency is time-limited; do not blindly clear claims and resend later. Replies, bounces and complaints are **not imported automatically**: monitor the configured mailbox/provider dashboard and mark leads replied, bounced, not-fit or unsubscribed. The unsubscribe endpoint stops future sequence steps automatically. Review cross-border outreach rules before contacting firms outside the initial US pilot.

This environment has no Supabase, sender or billing credentials, so production activation, actual outreach delivery and full database acceptance testing remain blocked. The researched list is a starting pipeline, not acquired clients. See `PILOT.md` for the validation and operator routine.

Database acceptance tests run against embedded PostgreSQL (PGlite), including schema reruns, 4/50 submission caps, the 25-hour gate, payment-triggered queueing, exclusive job claims, invalidation, stale-write rejection and preservation of approved reports. This does not replace acceptance against deployed Supabase, RLS roles and email delivery.

## Report Studio software preview

Open `/report-builder` for branded report preparation, three reusable templates, source-linked findings, local file hashes, review checks, printable reports and verifiable issued versions. The browser preview works without a database. Download drafts before closing; no automatic persistence is enabled. Case administrators can verify and preserve issued records under `/admin/cases/<id>/reports` after applying the latest schema. See [REPORT-STUDIO.md](REPORT-STUDIO.md) for archive behavior, proposed $199/$499 pilot prices and current limitations. These software prices are separate from investigation fees and are not active subscriptions.

## Company Assurance pilot

`/assurance` adds evidence-backed risk assessment, dependent remediation workflows, recurring obligations, operational policy starters, owner workload summaries and portable portfolio exports. `/report-compare` verifies and compares issued report revisions. Hosted programs and preserved audit snapshots are available under `/admin/assurance` after schema setup, with optimistic save conflicts and direct admin-action authentication. Proposed Company Assurance pricing is **$1,499/month**, separate from $199/$499 Report Studio plans and investigation services. Software subscriptions are not active; company isolation is implemented through the separate enterprise deployment path described below. See [ASSURANCE.md](ASSURANCE.md) for scoring, workflow rules, limits and production requirements.

## Enterprise deployment path

Company workflows now include five setup playbooks, a paginated portfolio exception inbox, printable management briefs, sealed JSON/streamed CSV exports and a native capacity/proposal builder at `/plans`. See [COMMERCIAL.md](COMMERCIAL.md) for proposed company pricing, scope limits and the distinction between a proposal and an activated paid contract. `npm run test:company-growth` covers real Next/browser/data flows with disposable fixture identities; it does not log into live Supabase.

The company experience uses a responsive navy/mint interface, light and dark themes, mobile navigation, a company sidebar and saved-workload visuals. `/product` demonstrates the real portfolio calculations using fictional records. `/trust` provides a downloadable, fingerprinted software security overview, with deployment acceptance and customer arrangements explicitly separate.

`/workspace/[org]/programs/[id]/changes` compares two preserved revisions by stable record ID, with full field changes in a sealed export and both snapshots evaluated on the same UTC date. Reordering records alone is not an edit. The portfolio's authenticated `.ics` export creates a one-time calendar snapshot of open deadlines on the selected program page, with stable event identifiers and escaped/folded UTF-8 text. It is not a public feed, email invitation or reminder service; calendar import behavior varies by app. Authorized exports remain available after contract expiry.

Company users now use `/workspace` with Supabase Auth, mandatory MFA, organization RLS, role permissions, authenticated independent review, invitations and contract entitlements. Enterprise mode disables shared-admin and bearer-token pilot surfaces. The web runtime uses a public session key only; service credentials stay in a separate operations environment. See [RELEASE.md](RELEASE.md) for tested controls, migration order and the outstanding live release gates. This repository is not yet a verified production deployment or compliance certification.
