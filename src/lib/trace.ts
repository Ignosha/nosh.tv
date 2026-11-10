// Follow-the-money: starting from known Bitcoin addresses, follow where funds were sent, hop by hop,
// and group addresses that were spent together (the common-input heuristic: inputs signed in one
// transaction are very likely controlled by one owner). Every edge is a real on-chain transaction.
import { btcHistory, type History } from "./btc";

export type TraceNode = {
  address: string;
  label?: string;
  explorer?: string;
  hop: number;
  kind: "seed" | "same-owner" | "destination" | "service";
  txCount: number | null;
  balance: number | null;
  note?: string;
};
export type TraceEdge = { from: string; to: string; btc: number; txs: number; first: string; last: string; sample: string };
export type Trace = {
  asset?: string;
  explorer?: string;
  readAt: string;
  seeds: string[];
  since: string | null;
  nodes: TraceNode[];
  edges: TraceEdge[];
  limits: string[];
};

// An address with this many transactions behaves like an exchange, custodian or payment processor;
// following it further would mix in other people's funds, so the trace stops there.
const SERVICE_TX = 400;
const MAX_COSPEND = 20;

export async function traceBitcoin(seeds: string[], opts: { hops?: number; since?: string | null; maxNodes?: number; fanout?: number } = {}): Promise<Trace> {
  const hops = Math.min(opts.hops ?? 2, 3);
  const maxNodes = opts.maxNodes ?? 36;
  const fanout = opts.fanout ?? 4;
  const since = opts.since ?? null;
  const sinceT = since ? Date.parse(since + "T00:00:00Z") / 1000 : 0;
  const nodes = new Map<string, TraceNode>();
  const edges = new Map<string, TraceEdge>();
  const limits: string[] = [];
  const histories = new Map<string, History>();
  let sweeps = 0;

  const read = async (a: string, pages: number) => {
    if (histories.has(a)) return histories.get(a)!;
    const h = await btcHistory(a, pages).catch(() => null);
    if (h) histories.set(a, h);
    return h;
  };

  let frontier = [...new Set(seeds)];
  for (const s of frontier) nodes.set(s, { address: s, hop: 0, kind: "seed", txCount: null, balance: null });

  for (let hop = 0; hop <= hops && frontier.length; hop++) {
    const next: string[] = [];
    for (let i = 0; i < frontier.length; i += 3) {
      const batch = frontier.slice(i, i + 3);
      const hs = await Promise.all(batch.map((a) => read(a, hop === 0 ? 8 : 2)));
      batch.forEach((a, j) => {
        const h = hs[j];
        const n = nodes.get(a)!;
        if (!h) {
          n.note = "Could not be read";
          return;
        }
        n.txCount = h.txCount;
        n.balance = h.balance;
        if (n.kind !== "seed" && h.txCount >= SERVICE_TX) {
          n.kind = "service";
          n.note = `${h.txCount.toLocaleString("en-US")} transactions: behaves like an exchange or custodian. Trace stops here; ask that service for records.`;
          return;
        }
        if (!h.complete) limits.push(`${a.slice(0, 12)}…: only the latest ${h.flows.length} transactions were read.`);
        // Same owner: addresses co-spent with this one.
        let added = 0;
        for (const f of h.flows) {
          // Large batches are exchange sweeps or CoinJoins, where inputs belong to many people.
          if (f.coInputs.length + 1 > MAX_COSPEND) {
            sweeps++;
            continue;
          }
          for (const co of f.coInputs) {
            if (added >= 8) break;
            if (!nodes.has(co) && nodes.size < maxNodes) {
              nodes.set(co, { address: co, hop, kind: "same-owner", txCount: null, balance: null, note: `Spent together with ${a.slice(0, 10)}… in ${f.txid.slice(0, 10)}…` });
              added++;
              if (hop < hops) next.push(co);
            }
          }
        }
        if (hop === hops) return;
        // Destinations: total sent per counterparty after the date, largest first.
        const totals = new Map<string, TraceEdge>();
        for (const f of h.flows) {
          if (f.time < sinceT) continue;
          for (const o of f.to) {
            const e = totals.get(o.address) ?? { from: a, to: o.address, btc: 0, txs: 0, first: f.date, last: f.date, sample: f.txid };
            e.btc += o.btc;
            e.txs += 1;
            e.last = f.date;
            totals.set(o.address, e);
          }
        }
        const top = [...totals.values()].sort((x, y) => y.btc - x.btc).slice(0, fanout);
        if (totals.size > fanout) limits.push(`${a.slice(0, 12)}…: showing the ${fanout} largest of ${totals.size} destinations.`);
        for (const e of top) {
          if (!nodes.has(e.to)) {
            if (nodes.size >= maxNodes) {
              limits.push(`Stopped at ${maxNodes} addresses.`);
              continue;
            }
            nodes.set(e.to, { address: e.to, hop: hop + 1, kind: "destination", txCount: null, balance: null });
            next.push(e.to);
          }
          edges.set(e.from + ">" + e.to, e);
        }
      });
    }
    frontier = [...new Set(next)];
  }
  // Read the last ring so it shows balances too (no further expansion).
  for (const n of nodes.values()) {
    if (n.txCount === null && n.note !== "Could not be read") {
      const h = await read(n.address, 1);
      if (h) {
        n.txCount = h.txCount;
        n.balance = h.balance;
        if (h.txCount >= SERVICE_TX && n.kind === "destination") {
          n.kind = "service";
          n.note = `${h.txCount.toLocaleString("en-US")} transactions: behaves like an exchange or custodian.`;
        }
      }
    }
  }
  if (sweeps) limits.unshift(`${sweeps} transaction(s) spent more than ${MAX_COSPEND} inputs together, typical of an exchange sweep or CoinJoin, so their inputs were not grouped as one owner.`);
  return { readAt: new Date().toISOString(), seeds, since, nodes: [...nodes.values()], edges: [...edges.values()], limits: [...new Set(limits)].slice(0, 12) };
}
