// Two add-on schedules built from the same on-chain history:
//  - Cost basis: every acquisition lot with its value on the day received, matched first-in first-out.
//  - Dissipation: every transfer out of the subject's wallets in a look-back window and after the key date.
// Treats all of the matter's Bitcoin addresses as one wallet, so moves between them are not counted.
import { btcHistory, type History } from "./btc";
import { dailyCloses } from "./prices";

type WalletTx = { txid: string; date: string; time: number; net: number; to: { address: string; btc: number }[] };

export type Lot = { date: string; txid: string; btc: number; price: number | null; basis: number | null; remaining: number };
export type Disposal = { date: string; txid: string; btc: number; price: number | null; proceeds: number | null; basis: number | null; gain: number | null };
export type CostBasis = {
  readAt: string;
  addresses: number;
  lots: Lot[];
  disposals: Disposal[];
  heldBtc: number;
  heldBasis: number | null;
  realizedGain: number | null;
  source: string;
  incomplete: string[];
};

export type Outflow = { date: string; txid: string; btc: number; price: number | null; usd: number | null; to: string[]; window: "look-back" | "after" };
export type Dissipation = {
  readAt: string;
  keyDate: string;
  lookbackFrom: string;
  outflows: Outflow[];
  totalLookbackUsd: number;
  totalAfterUsd: number;
  totalBtc: number;
  source: string;
  incomplete: string[];
};

async function walletTxs(addresses: string[]): Promise<{ txs: WalletTx[]; incomplete: string[] }> {
  const owned = new Set(addresses);
  const hs: History[] = [];
  const incomplete: string[] = [];
  for (let i = 0; i < addresses.length; i += 3) {
    const batch = await Promise.all(addresses.slice(i, i + 3).map((a) => btcHistory(a, 20).catch(() => null)));
    batch.forEach((h, j) => {
      if (!h) incomplete.push(`${addresses[i + j]}: could not be read`);
      else {
        if (!h.complete) incomplete.push(`${h.address}: more than ${h.flows.length} transactions; only the latest were read`);
        hs.push(h);
      }
    });
  }
  const byTx = new Map<string, WalletTx>();
  for (const h of hs) {
    for (const f of h.flows) {
      const t = byTx.get(f.txid) ?? { txid: f.txid, date: f.date, time: f.time, net: 0, to: [] };
      t.net += f.net;
      for (const o of f.to) if (!owned.has(o.address) && !t.to.some((x) => x.address === o.address)) t.to.push(o);
      byTx.set(f.txid, t);
    }
  }
  const txs = [...byTx.values()].filter((t) => Math.abs(t.net) > 1e-9).sort((a, b) => a.time - b.time);
  return { txs, incomplete };
}

const round = (n: number) => Math.round(n * 1e8) / 1e8;

export async function costBasis(addresses: string[]): Promise<CostBasis> {
  const { txs, incomplete } = await walletTxs(addresses);
  const today = new Date().toISOString().slice(0, 10);
  const { closes, source } = txs.length ? await dailyCloses("BTC", txs[0].date, today) : { closes: new Map<string, number>(), source: "" };
  const lots: Lot[] = [];
  const disposals: Disposal[] = [];
  for (const t of txs) {
    const price = closes.get(t.date) ?? null;
    if (t.net > 0) {
      lots.push({ date: t.date, txid: t.txid, btc: round(t.net), price, basis: price !== null ? t.net * price : null, remaining: t.net });
    } else {
      let left = -t.net;
      let basis: number | null = 0;
      for (const l of lots) {
        if (left <= 1e-9) break;
        const take = Math.min(l.remaining, left);
        if (take <= 0) continue;
        l.remaining -= take;
        left -= take;
        basis = basis !== null && l.price !== null ? basis + take * l.price : null;
      }
      const btc = round(-t.net);
      const proceeds = price !== null ? btc * price : null;
      disposals.push({ date: t.date, txid: t.txid, btc, price, proceeds, basis, gain: proceeds !== null && basis !== null ? proceeds - basis : null });
    }
  }
  for (const l of lots) l.remaining = round(Math.max(0, l.remaining));
  const held = lots.filter((l) => l.remaining > 0);
  const heldBasis = held.every((l) => l.price !== null) ? held.reduce((s, l) => s + l.remaining * (l.price ?? 0), 0) : null;
  const realizedGain = disposals.every((d) => d.gain !== null) ? disposals.reduce((s, d) => s + (d.gain ?? 0), 0) : null;
  return {
    readAt: new Date().toISOString(),
    addresses: addresses.length,
    lots,
    disposals,
    heldBtc: round(held.reduce((s, l) => s + l.remaining, 0)),
    heldBasis,
    realizedGain,
    source: `Blockstream (transactions); ${source}`,
    incomplete,
  };
}

export async function dissipation(addresses: string[], keyDate: string, lookbackMonths = 24): Promise<Dissipation> {
  const { txs, incomplete } = await walletTxs(addresses);
  const key = Date.parse(keyDate + "T00:00:00Z");
  const from = new Date(key);
  from.setUTCMonth(from.getUTCMonth() - lookbackMonths);
  const lookbackFrom = from.toISOString().slice(0, 10);
  const out = txs.filter((t) => t.net < 0 && t.date >= lookbackFrom);
  const today = new Date().toISOString().slice(0, 10);
  const { closes, source } = out.length ? await dailyCloses("BTC", out[0].date, today) : { closes: new Map<string, number>(), source: "" };
  const outflows: Outflow[] = out.map((t) => {
    const price = closes.get(t.date) ?? null;
    const btc = round(-t.net);
    return {
      date: t.date,
      txid: t.txid,
      btc,
      price,
      usd: price !== null ? btc * price : null,
      to: t.to.sort((a, b) => b.btc - a.btc).map((o) => o.address).slice(0, 4),
      window: Date.parse(t.date + "T00:00:00Z") >= key ? "after" : "look-back",
    };
  });
  const sum = (w: Outflow["window"]) => outflows.filter((o) => o.window === w).reduce((s, o) => s + (o.usd ?? 0), 0);
  return {
    readAt: new Date().toISOString(),
    keyDate,
    lookbackFrom,
    outflows,
    totalLookbackUsd: sum("look-back"),
    totalAfterUsd: sum("after"),
    totalBtc: round(outflows.reduce((s, o) => s + o.btc, 0)),
    source: `Blockstream (transactions); ${source}`,
    incomplete,
  };
}
