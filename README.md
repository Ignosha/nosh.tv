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
| Firm Plan | $4,500 / month (2 reports and alerts on one matter included, 25% off more) |
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

There is no mock or sample data. When a reading fails, the page says "unavailable" and never substitutes a figure.

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
