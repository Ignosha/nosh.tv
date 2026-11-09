// Bitcoin transaction history from Blockstream Esplora (free, public), shared by the tracing map,
// balance-over-time exhibits, cost-basis schedule and dissipation analysis.
import { getJson } from "./chains";

const ESPLORA = "https://blockstream.info/api";

export type EsploraTx = {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vin: { prevout: { scriptpubkey_address?: string; value: number } | null }[];
  vout: { scriptpubkey_address?: string; value: number }[];
};

export type Flow = {
  txid: string;
  time: number; // unix seconds (block time)
  date: string; // YYYY-MM-DD (UTC)
  received: number; // BTC into this address
  sent: number; // BTC out of this address (inputs it spent)
  net: number; // received - sent
  /** Other addresses that received funds when this address spent (likely destinations). */
  to: { address: string; btc: number }[];
  /** Other addresses spent in the same transaction as inputs (common-input: likely the same owner). */
  coInputs: string[];
  /** Addresses that funded this address in this transaction. */
  from: string[];
};

export type History = {
  address: string;
  txCount: number;
  balance: number;
  flows: Flow[]; // oldest first
  complete: boolean; // false when the address has more history than was read
};

const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

/** Reads up to maxPages × 25 confirmed transactions, newest first, and returns them oldest first. */
export async function btcHistory(address: string, maxPages = 8): Promise<History> {
  const info = await getJson<{ chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number } }>(`${ESPLORA}/address/${address}`);
  const txs: EsploraTx[] = [];
  let cursor = "";
  let complete = info.chain_stats.tx_count === 0;
  for (let page = 0; page < maxPages && !complete; page++) {
    const batch = await getJson<EsploraTx[]>(`${ESPLORA}/address/${address}/txs/chain${cursor ? "/" + cursor : ""}`);
    txs.push(...batch);
    if (batch.length < 25) complete = true;
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].txid;
  }
  const flows = txs
    .filter((tx) => tx.status.confirmed && tx.status.block_time)
    .map((tx) => toFlow(address, tx))
    .reverse();
  return {
    address,
    txCount: info.chain_stats.tx_count,
    balance: (info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum) / 1e8,
    flows,
    complete,
  };
}

export function toFlow(address: string, tx: EsploraTx): Flow {
  const time = tx.status.block_time ?? 0;
  const mine = tx.vin.some((i) => i.prevout?.scriptpubkey_address === address);
  const received = tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((s, o) => s + o.value, 0) / 1e8;
  const sent = tx.vin.filter((i) => i.prevout?.scriptpubkey_address === address).reduce((s, i) => s + (i.prevout?.value ?? 0), 0) / 1e8;
  const inputs = [...new Set(tx.vin.map((i) => i.prevout?.scriptpubkey_address).filter((a): a is string => !!a))];
  const to = mine
    ? tx.vout
        .filter((o) => o.scriptpubkey_address && o.scriptpubkey_address !== address && !inputs.includes(o.scriptpubkey_address))
        .map((o) => ({ address: o.scriptpubkey_address as string, btc: o.value / 1e8 }))
    : [];
  return {
    txid: tx.txid,
    time,
    date: day(time),
    received,
    sent,
    net: received - sent,
    to,
    coInputs: mine ? inputs.filter((a) => a !== address) : [],
    from: mine ? [] : inputs,
  };
}

/** Running balance after each transaction. Only exact when the history is complete. */
export function balanceSeries(h: History): { date: string; time: number; balance: number }[] {
  let bal = 0;
  return h.flows.map((f) => {
    bal += f.net;
    return { date: f.date, time: f.time, balance: Math.max(0, Math.round(bal * 1e8) / 1e8) };
  });
}

export async function btcTxCount(address: string): Promise<number | null> {
  try {
    const info = await getJson<{ chain_stats: { tx_count: number } }>(`${ESPLORA}/address/${address}`);
    return info.chain_stats.tx_count;
  } catch {
    return null;
  }
}
