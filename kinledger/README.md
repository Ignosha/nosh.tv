# Kinledger — crypto estate recovery

A website and working tool for a crypto inheritance business:

- **`/`**: the public site. It covers services and fees, how a case runs, a page for estate attorneys, the rules you keep, an FAQ and a case intake form. The "Exhibit A" card shows a **live** reading of the public ledger: the Bitcoin block height and BTC/ETH/SOL prices.
- **`/scan`**: the free estate scan.
  1. Drop in PDFs, email exports (`.eml`, `.mbox`), notes or CSVs. They are **read in the browser and never uploaded**.
  2. It finds exchanges, wallet apps, hardware wallets, Bitcoin/Ethereum/Solana addresses and possible recovery phrases. A phrase is flagged by file and line but **never displayed or sent**.
  3. **Read on the ledger** looks up each address's real balance and values it now and on the date of death. The result can be exported as JSON or printed to PDF.
  4. Optional **local AI** deep scan through [Ollama](https://ollama.com) on your own computer, so documents still never leave the machine.
- **`/admin`**: the case docket (basic auth).

Design: the *Estate Desk*, a sibling of the NOSHASHI Ledger Desk. It uses archival paper and walnut ink in place of graphite, Newsreader serif headings, IBM Plex Sans and Mono, hairline rules, a docket (§) structure, case-file exhibit tabs, double-rule stamps and verdigris ink. Light and dark modes follow the system setting.

## Live data sources (all free, no keys)

| Data | Source | Notes |
|---|---|---|
| Bitcoin balances + history | Blockstream Esplora | Date-of-death balance is rebuilt by undoing transactions after the date (up to 500). |
| Ethereum ETH, USDC, USDT | PublicNode RPC | Current balance only. Historical balances need an archive node, and the report says so. |
| Solana SOL, USDC | Solana mainnet RPC | Current balance only, flagged in the report. |
| BTC, ETH, SOL, USDT prices | Coinbase Exchange | Last trade, and the daily UTC close on any past date. |
| USDC price | CoinGecko | The free tier covers the last 365 days. Older dates show "unavailable" and are never guessed. |

When a reading fails, the report shows "unavailable". It never substitutes a sample figure.

## Setup

```bash
cd kinledger
npm install
cp .env.example .env.local   # fill in Supabase + ADMIN_PASSWORD
npm run dev                  # http://localhost:3100
```

1. Create a free Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. They are server-only and power the intake form and `/admin`.
3. Deploy on Vercel with **Root Directory = `kinledger`**. Vercel Hobby is for non-commercial use, so move to Pro once you charge clients.

Behind an HTTPS proxy, run Node with `NODE_USE_ENV_PROXY=1` so server-side `fetch` uses it.
