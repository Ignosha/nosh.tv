// Server-only reads from free public sources. Nothing here signs or moves funds.
// Bitcoin: Blockstream Esplora. Ethereum: PublicNode RPC. Solana: public mainnet RPC.
// Prices: Coinbase Exchange daily candles (full history) and CoinGecko for USDC.

import type { Chain } from "./extract";

const UA = { "User-Agent": "kinledger/0.1", Accept: "application/json" };
const ESPLORA = "https://blockstream.info/api";
const ETH_RPC = "https://ethereum-rpc.publicnode.com";
const SOL_RPC = "https://api.mainnet-beta.solana.com";

export type Asset = "BTC" | "ETH" | "SOL" | "USDC" | "USDT";

export type Holding = {
  asset: Asset;
  network: string;
  balanceNow: number;
  balanceAtDate: number | null;
  atDateNote?: string;
};

export type AddressReport = {
  chain: Chain;
  address: string;
  ok: boolean;
  error?: string;
  txCount?: number;
  firstSeen?: string | null;
  lastSeen?: string | null;
  holdings: Holding[];
  explorer: string;
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...UA, ...(init?.headers ?? {}) }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${new URL(url).host} replied ${res.status}`);
  return (await res.json()) as T;
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const body = await getJson<{ result?: T; error?: { message: string } }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

// ---------- Bitcoin ----------

type EsploraAddress = {
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
};
type EsploraTx = {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vin: { prevout: { scriptpubkey_address?: string; value: number } | null }[];
  vout: { scriptpubkey_address?: string; value: number }[];
};

const MAX_BTC_PAGES = 20; // 25 transactions each

async function bitcoin(address: string, endOfDay: number | null): Promise<AddressReport> {
  const info = await getJson<EsploraAddress>(`${ESPLORA}/address/${address}`);
  const sats = info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
  const holding: Holding = { asset: "BTC", network: "Bitcoin", balanceNow: sats / 1e8, balanceAtDate: null };
  const report: AddressReport = {
    chain: "bitcoin",
    address,
    ok: true,
    txCount: info.chain_stats.tx_count,
    holdings: [holding],
    explorer: `https://blockstream.info/address/${address}`,
  };

  // Walk confirmed history newest-first and undo every transaction after the date.
  let balanceAt = sats;
  let lastSeen: number | null = null;
  let oldestSeen: number | null = null;
  let reachedEnd = info.chain_stats.tx_count === 0;
  let reachedDate = false;
  let cursor = "";
  for (let page = 0; page < MAX_BTC_PAGES && !reachedEnd && !reachedDate; page++) {
    const txs = await getJson<EsploraTx[]>(`${ESPLORA}/address/${address}/txs/chain${cursor ? "/" + cursor : ""}`);
    if (txs.length === 0) {
      reachedEnd = true;
      break;
    }
    for (const tx of txs) {
      const t = tx.status.block_time ?? 0;
      lastSeen ??= t;
      oldestSeen = t;
      if (endOfDay === null || reachedDate) continue;
      if (t > endOfDay) {
        const received = tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((s, o) => s + o.value, 0);
        const sent = tx.vin.filter((i) => i.prevout?.scriptpubkey_address === address).reduce((s, i) => s + (i.prevout?.value ?? 0), 0);
        balanceAt -= received - sent;
      } else {
        reachedDate = true;
      }
    }
    if (txs.length < 25) reachedEnd = true;
    cursor = txs[txs.length - 1].txid;
    if (endOfDay === null) break; // without a date, the first page is enough
  }

  report.lastSeen = lastSeen ? new Date(lastSeen * 1000).toISOString() : null;
  report.firstSeen = reachedEnd && oldestSeen ? new Date(oldestSeen * 1000).toISOString() : null;
  if (endOfDay !== null) {
    if (reachedEnd || reachedDate) holding.balanceAtDate = balanceAt / 1e8;
    else holding.atDateNote = `More than ${MAX_BTC_PAGES * 25} transactions after this date; read it with a full node.`;
  }
  return report;
}

// ---------- Ethereum ----------

const ERC20: { asset: Asset; contract: string; decimals: number }[] = [
  { asset: "USDC", contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { asset: "USDT", contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
];
const ARCHIVE_NOTE = "Historical Ethereum balances need an archive node, which the free public RPC does not provide.";

async function ethereum(address: string, withDate: boolean): Promise<AddressReport> {
  const [weiHex, nonceHex] = await Promise.all([
    rpc<string>(ETH_RPC, "eth_getBalance", [address, "latest"]),
    rpc<string>(ETH_RPC, "eth_getTransactionCount", [address, "latest"]),
  ]);
  const holdings: Holding[] = [
    { asset: "ETH", network: "Ethereum", balanceNow: Number(BigInt(weiHex)) / 1e18, balanceAtDate: null, atDateNote: withDate ? ARCHIVE_NOTE : undefined },
  ];
  const data = "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0");
  for (const token of ERC20) {
    const raw = await rpc<string>(ETH_RPC, "eth_call", [{ to: token.contract, data }, "latest"]);
    const amount = Number(BigInt(raw === "0x" ? "0x0" : raw)) / 10 ** token.decimals;
    if (amount > 0) holdings.push({ asset: token.asset, network: "Ethereum", balanceNow: amount, balanceAtDate: null, atDateNote: withDate ? ARCHIVE_NOTE : undefined });
  }
  return {
    chain: "ethereum",
    address,
    ok: true,
    txCount: Number(BigInt(nonceHex)),
    holdings,
    explorer: `https://etherscan.io/address/${address}`,
  };
}

// ---------- Solana ----------

const SOL_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_NOTE = "Historical Solana balances are not available from the free public RPC.";

async function solana(address: string, withDate: boolean): Promise<AddressReport> {
  const bal = await rpc<{ value: number }>(SOL_RPC, "getBalance", [address]);
  const holdings: Holding[] = [{ asset: "SOL", network: "Solana", balanceNow: bal.value / 1e9, balanceAtDate: null, atDateNote: withDate ? SOL_NOTE : undefined }];
  const tokens = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[] }>(
    SOL_RPC,
    "getTokenAccountsByOwner",
    [address, { mint: SOL_USDC_MINT }, { encoding: "jsonParsed" }],
  );
  const usdc = tokens.value.reduce((s, a) => s + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
  if (usdc > 0) holdings.push({ asset: "USDC", network: "Solana", balanceNow: usdc, balanceAtDate: null, atDateNote: withDate ? SOL_NOTE : undefined });
  return { chain: "solana", address, ok: true, holdings, explorer: `https://solscan.io/account/${address}` };
}

export async function readAddress(chain: Chain, address: string, endOfDay: number | null): Promise<AddressReport> {
  try {
    if (chain === "bitcoin") return await bitcoin(address, endOfDay);
    if (chain === "ethereum") return await ethereum(address, endOfDay !== null);
    return await solana(address, endOfDay !== null);
  } catch (e) {
    const explorer =
      chain === "bitcoin" ? `https://blockstream.info/address/${address}` : chain === "ethereum" ? `https://etherscan.io/address/${address}` : `https://solscan.io/account/${address}`;
    return { chain, address, ok: false, error: e instanceof Error ? e.message : "Read failed", holdings: [], explorer };
  }
}

// ---------- Prices ----------

export type Price = { usd: number | null; source: string; note?: string };

const COINBASE: Partial<Record<Asset, string>> = { BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", USDT: "USDT-USD" };

export async function priceNow(asset: Asset): Promise<Price> {
  try {
    const product = COINBASE[asset];
    if (product) {
      const t = await getJson<{ price: string }>(`https://api.exchange.coinbase.com/products/${product}/ticker`);
      return { usd: Number(t.price), source: `Coinbase ${product} last trade` };
    }
    const g = await getJson<Record<string, { usd: number }>>("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd");
    return { usd: g["usd-coin"]?.usd ?? null, source: "CoinGecko USDC" };
  } catch (e) {
    return { usd: null, source: "unavailable", note: e instanceof Error ? e.message : undefined };
  }
}

/** Daily close (UTC) for the given YYYY-MM-DD. */
export async function priceOnDate(asset: Asset, date: string): Promise<Price> {
  const start = Date.parse(date + "T00:00:00Z");
  try {
    const product = COINBASE[asset];
    if (product) {
      const end = new Date(start + 86400000).toISOString();
      const candles = await getJson<number[][]>(
        `https://api.exchange.coinbase.com/products/${product}/candles?granularity=86400&start=${new Date(start).toISOString()}&end=${end}`,
      );
      const day = candles.find((c) => c[0] * 1000 === start);
      if (!day) return { usd: null, source: `Coinbase ${product}`, note: "No trading data for that day." };
      return { usd: day[4], source: `Coinbase ${product} daily close (UTC)` };
    }
    if (Date.now() - start > 364 * 86400000) {
      return { usd: null, source: "CoinGecko", note: "The free CoinGecko tier only covers the last 365 days." };
    }
    const [y, m, d] = date.split("-");
    const g = await getJson<{ market_data?: { current_price?: { usd?: number } } }>(
      `https://api.coingecko.com/api/v3/coins/usd-coin/history?date=${d}-${m}-${y}&localization=false`,
    );
    const usd = g.market_data?.current_price?.usd;
    return usd ? { usd, source: "CoinGecko USDC daily" } : { usd: null, source: "CoinGecko", note: "The free tier only covers the last 365 days." };
  } catch (e) {
    return { usd: null, source: "unavailable", note: e instanceof Error ? e.message : undefined };
  }
}

// ---------- Live reading for the homepage ----------

export async function ledgerReading() {
  const [height, btc, eth, sol] = await Promise.all([
    getJson<number>(`${ESPLORA}/blocks/tip/height`).catch(() => null),
    priceNow("BTC"),
    priceNow("ETH"),
    priceNow("SOL"),
  ]);
  return { height, btc: btc.usd, eth: eth.usd, sol: sol.usd, readAt: new Date().toISOString() };
}
