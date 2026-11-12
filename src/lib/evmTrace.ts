import { getJson } from "./chains";
import type { Trace, TraceEdge, TraceNode } from "./trace";

export const EXPLORERS = {
  ethereum: { url: "https://eth.blockscout.com", asset: "ETH" },
  base: { url: "https://base.blockscout.com", asset: "ETH" },
  arbitrum: { url: "https://arbitrum.blockscout.com", asset: "ETH" },
  optimism: { url: "https://explorer.optimism.io", asset: "ETH" },
  polygon: { url: "https://polygon.blockscout.com", asset: "POL" },
} as const;
export type EvmNetwork = keyof typeof EXPLORERS;
type Account = { hash: string; name?: string | null; is_contract?: boolean; coin_balance?: string; public_tags?: { label: string }[] };
type Tx = { hash: string; timestamp: string; status: string; value: string; from: Account; to: Account | null };

/** Native transfers only. Public labels identify a source assertion, never beneficial ownership. */
export async function traceEthereum(seeds: string[], network: EvmNetwork = "ethereum", hops = 1, since: string | null = null): Promise<Trace> {
  const { url, asset } = EXPLORERS[network];
  const nodes = new Map<string, TraceNode>();
  const edges = new Map<string, TraceEdge>();
  const limits = ["Native transfers only; excludes token transfers, internal calls and cross-chain bridge destinations. No ownership inference is made.", "Explorer labels are third-party assertions, not verified identity. Contracts and labeled services are stopping points. Each address reads at most 100 recent transactions; only the five largest destinations are expanded."];
  hops = Math.max(0, Math.min(3, hops));
  let frontier = [...new Set(seeds.map(a => a.toLowerCase()))].slice(0, 3);
  for (const address of frontier) nodes.set(address, { address, hop: 0, kind: "seed", balance: null, txCount: null });
  for (let hop = 0; hop <= Math.min(3, hops); hop++) {
    const next: string[] = [];
    for (const address of frontier) {
      const node = nodes.get(address)!;
      node.explorer = `${url}/address/${address}`;
      try {
        const info = await getJson<Account>(`${url}/api/v2/addresses/${address}`);
        node.balance = info.coin_balance == null ? null : Number(BigInt(info.coin_balance)) / 1e18;
        node.label = info.public_tags?.map(t => t.label).join(", ") || info.name || undefined;
        if (node.label || info.is_contract) {
          node.kind = "service";
          node.note = `Blockscout ${network}: ${node.label ?? "contract"}. Attribution requires independent confirmation.`;
          continue;
        }
        if (hop === hops) continue;
        let cursor = "";
        const totals = new Map<string, TraceEdge>();
        for (let page = 0; page < 2; page++) {
          const data = await getJson<{ items: Tx[]; next_page_params: Record<string, string | number> | null }>(`${url}/api/v2/addresses/${address}/transactions?filter=from${cursor}`);
          for (const tx of data.items) {
            if (tx.status !== "ok" || tx.from.hash.toLowerCase() !== address || !tx.to || (since && tx.timestamp.slice(0, 10) < since)) continue;
            const amount = Number(BigInt(tx.value)) / 1e18;
            if (!(amount > 0)) continue;
            const to = tx.to.hash.toLowerCase();
            const date = tx.timestamp.slice(0, 10);
            const e = totals.get(to) ?? { from: address, to, btc: 0, txs: 0, first: date, last: date, sample: tx.hash };
            e.btc += amount; e.txs++; e.first = e.first < date ? e.first : date; e.last = e.last > date ? e.last : date;
            totals.set(to, e);
          }
          if (!data.next_page_params) break;
          cursor = "&" + new URLSearchParams(Object.entries(data.next_page_params).map(([k,v]) => [k,String(v)])).toString();
          if (page === 1) limits.push(`${address}: history truncated after two pages.`);
        }
        for (const e of [...totals.values()].sort((a,b) => b.btc-a.btc).slice(0,5)) {
          if (!nodes.has(e.to)) {
            if (nodes.size >= 36) { limits.push("Stopped at 36 addresses."); continue; }
            nodes.set(e.to, { address: e.to, hop: hop+1, kind: "destination", balance: null, txCount: null, explorer: `${url}/address/${e.to}` }); next.push(e.to);
          }
          edges.set(`${address}>${e.to}`,e);
        }
      } catch (error) {
        node.note = `Unavailable: ${error instanceof Error ? error.message : "explorer read failed"}`;
        limits.push(`${address}: ${node.note}`);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return { asset, explorer: url, readAt: new Date().toISOString(), seeds, since, nodes: [...nodes.values()], edges: [...edges.values()], limits: [...new Set(limits)] };
}
