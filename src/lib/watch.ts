// Asset-movement alerts: re-read every watched address and report any change in holdings or new transactions.
import { db } from "./db";
import { readAddress, type AddressReport } from "./chains";
import { btcTxCount } from "./btc";
import { seal } from "./fingerprint";
import { getCase, logEvent, type Case } from "./cases";
import type { Chain } from "./extract";

export type Watch = {
  id: number;
  case_id: string;
  chain: Chain;
  address: string;
  snapshot: Record<string, number> | null; // "ASSET@Network" → balance
  tx_count: number | null;
  active: boolean;
  created_at: string;
  last_checked_at: string | null;
  last_change_at: string | null;
};

export type Movement = { address: string; chain: string; explorer: string; changes: { holding: string; before: number; after: number }[]; newTxs: number | null };

const snap = (r: AddressReport) => Object.fromEntries(r.holdings.map((h) => [`${h.asset}@${h.network}`, h.balanceNow]));

/** Every address the matter's report or findings name, watched from today's reading. */
export async function startWatching(c: Case): Promise<number> {
  const client = db();
  if (!client) return 0;
  const seen = new Map<string, { chain: Chain; address: string }>();
  for (const r of c.report?.rows ?? []) seen.set(r.chain + ":" + r.address, { chain: r.chain as Chain, address: r.address });
  for (const a of c.findings?.addresses ?? []) seen.set(a.chain + ":" + a.address, { chain: a.chain as Chain, address: a.address });
  let added = 0;
  for (const a of seen.values()) {
    const r = await readAddress(a.chain, a.address, null);
    if (!r.ok || r.unreadNetworks?.length) continue;
    const tx = a.chain === "bitcoin" ? r.txCount ?? null : null;
    const { error } = await client
      .from("kl_watches")
      .upsert({ case_id: c.id, chain: a.chain, address: a.address, snapshot: snap(r), tx_count: tx, active: true, last_checked_at: new Date().toISOString() }, { onConflict: "case_id,chain,address" });
    if (!error) added++;
  }
  await logEvent(c.id, "alerts", `Asset-movement alerts on for ${added} address(es).`);
  return added;
}

export async function stopWatching(caseId: string) {
  const client = db();
  if (!client) return;
  await client.from("kl_watches").update({ active: false }).eq("case_id", caseId);
  await logEvent(caseId, "alerts", "Asset-movement alerts turned off.");
}

export async function watchesFor(caseId: string): Promise<Watch[]> {
  const client = db();
  if (!client) return [];
  const { data } = await client.from("kl_watches").select("*").eq("case_id", caseId).order("id");
  return (data as Watch[]) ?? [];
}

/** Re-reads one watch; returns the movement if anything changed, and stores the new snapshot. */
export async function checkWatch(w: Watch): Promise<Movement | null> {
  const client = db();
  const r = await readAddress(w.chain, w.address, null);
  if (!r.ok) return null; // a failed read is not a movement; try again tomorrow
  if (r.unreadNetworks?.length) return null; // Partial reads must not erase balances or create false alerts.
  const now = snap(r);
  const before = w.snapshot ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(now)]);
  const changes = [...keys]
    .map((k) => ({ holding: k.replace("@", " on "), before: before[k] ?? 0, after: now[k] ?? 0 }))
    .filter((c) => Math.abs(c.after - c.before) > 1e-9);
  const tx = w.chain === "bitcoin" ? r.txCount ?? (await btcTxCount(w.address)) : null;
  const newTxs = tx !== null && w.tx_count !== null && tx > w.tx_count ? tx - w.tx_count : null;
  const moved = changes.length > 0 || (newTxs ?? 0) > 0;
  await client
    ?.from("kl_watches")
    .update({ snapshot: now, tx_count: tx, last_checked_at: new Date().toISOString(), ...(moved ? { last_change_at: new Date().toISOString() } : {}) })
    .eq("id", w.id);
  return moved ? { address: w.address, chain: w.chain, explorer: r.explorer, changes, newTxs } : null;
}

/** A sealed alert record for the matter, so the notice itself is evidence of what moved and when. */
export async function alertRecord(caseId: string, movements: Movement[]) {
  const c = await getCase(caseId);
  const record = {
    generatedBy: "TraceSworn asset-movement alert",
    matter: caseId,
    matterType: c?.matter_type ?? null,
    detectedAt: new Date().toISOString(),
    movements,
    sources: "Blockstream (Bitcoin), PublicNode (EVM networks), Solana mainnet RPC",
  };
  return seal(record);
}

export function alertText(movements: Movement[], fingerprint: string): string {
  const lines = movements.map((m) => {
    const ch = m.changes.map((c) => `  ${c.holding}: ${c.before} → ${c.after} (${c.after > c.before ? "+" : ""}${+(c.after - c.before).toFixed(8)})`);
    return [`${m.address} (${m.chain})`, ...ch, m.newTxs ? `  ${m.newTxs} new transaction(s)` : "", `  ${m.explorer}`].filter(Boolean).join("\n");
  });
  return [
    "A watched address moved. Read live from the public ledger:",
    "",
    ...lines,
    "",
    `Alert record fingerprint (SHA-256): ${fingerprint}`,
    "The sealed record is saved to the matter. This is a factual reading, not legal advice.",
  ].join("\n");
}
