// Server-only storage for prospects found by the client finder.
import { db } from "./db";
import { enrichWebsite, detectPractice, segmentOf, scoreLead, type LeadDraft, type Segment } from "./finder";

export type LeadStatus = "new" | "queued" | "contacted" | "replied" | "booked" | "not_fit" | "finished" | "unsubscribed" | "bounced";
export const LEAD_STATUSES: { id: LeadStatus; name: string }[] = [
  { id: "new", name: "New (review)" },
  { id: "queued", name: "Approved, queued" },
  { id: "contacted", name: "In sequence" },
  { id: "replied", name: "Replied" },
  { id: "booked", name: "Call booked" },
  { id: "finished", name: "Sequence done" },
  { id: "not_fit", name: "Not a fit" },
  { id: "unsubscribed", name: "Unsubscribed" },
  { id: "bounced", name: "Bounced" },
];

export type Lead = LeadDraft & {
  id: string;
  created_at: string;
  status: LeadStatus;
  step: number;
  next_send_at: string | null;
  last_sent_at: string | null;
  notes: string | null;
  unsub_token: string;
};

/** Fills email, phone and practice areas from each lead's own website, a few at a time, within a time budget. */
export async function enrichAll(leads: LeadDraft[], budgetMs = 200_000): Promise<{ enriched: number }> {
  const started = Date.now();
  let enriched = 0;
  const todo = leads.filter((l) => l.website && (!l.email || l.practice.length === 0));
  for (let i = 0; i < todo.length && Date.now() - started < budgetMs; i += 6) {
    await Promise.all(
      todo.slice(i, i + 6).map(async (l) => {
        const e = await enrichWebsite(l.website!);
        if (!e.reachable) return;
        enriched++;
        l.email ??= e.emails[0] ?? null;
        l.phone ??= e.phone;
        l.practice = [...new Set([...l.practice, ...e.practice])];
        if (l.source !== "courtlistener") l.segment = segmentOf(l.practice, l.segment);
        if (!l.firm && e.title) l.firm = e.title.split(/[|–-]/)[0].trim().slice(0, 120);
      }),
    );
  }
  for (const l of leads) {
    if (!l.practice.length) l.practice = detectPractice([l.firm, l.name].filter(Boolean).join(" "));
    l.score = scoreLead(l);
  }
  return { enriched };
}

/** Inserts new leads, skipping any email or source record already on file. */
export async function saveLeads(leads: LeadDraft[]): Promise<{ added: number; skipped: number }> {
  const client = db();
  if (!client) throw new Error("Database not configured.");
  let added = 0;
  let skipped = 0;
  const emails = leads.map((l) => l.email).filter((e): e is string => !!e);
  const refs = leads.map((l) => l.source_ref).filter((r): r is string => !!r);
  const [{ data: haveE }, { data: haveR }] = await Promise.all([
    emails.length ? client.from("kl_leads").select("email").in("email", emails) : Promise.resolve({ data: [] as { email: string }[] }),
    refs.length ? client.from("kl_leads").select("source_ref").in("source_ref", refs) : Promise.resolve({ data: [] as { source_ref: string }[] }),
  ]);
  const seenE = new Set((haveE ?? []).map((x: { email: string }) => x.email.toLowerCase()));
  const seenR = new Set((haveR ?? []).map((x: { source_ref: string }) => x.source_ref));
  for (const l of leads) {
    if ((l.email && seenE.has(l.email)) || (l.source_ref && seenR.has(l.source_ref))) {
      skipped++;
      continue;
    }
    const { error } = await client.from("kl_leads").insert({ ...l, status: l.score < 15 ? "not_fit" : "new" });
    if (error) skipped++;
    else {
      added++;
      if (l.email) seenE.add(l.email);
      if (l.source_ref) seenR.add(l.source_ref);
    }
  }
  return { added, skipped };
}

export async function listLeads(filter: { status?: string; segment?: string; min?: number } = {}): Promise<Lead[]> {
  const client = db();
  if (!client) return [];
  let q = client.from("kl_leads").select("*").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.segment) q = q.eq("segment", filter.segment);
  if (filter.min) q = q.gte("score", filter.min);
  const { data } = await q;
  return (data as Lead[]) ?? [];
}

export async function leadCounts(): Promise<Record<string, number>> {
  const client = db();
  if (!client) return {};
  const { data } = await client.from("kl_leads").select("status");
  const out: Record<string, number> = {};
  for (const r of (data as { status: string }[]) ?? []) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

export async function getLead(id: string): Promise<Lead | null> {
  const client = db();
  if (!client) return null;
  const { data } = await client.from("kl_leads").select("*").eq("id", id).maybeSingle();
  return (data as Lead) ?? null;
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  await db()?.from("kl_leads").update(patch).eq("id", id);
}

export async function logLead(id: string, kind: string, body: string | null) {
  await db()?.from("kl_lead_events").insert({ lead_id: id, kind, body });
}

export async function leadEvents(id: string): Promise<{ id: number; at: string; kind: string; body: string | null }[]> {
  const { data } = (await db()?.from("kl_lead_events").select("*").eq("lead_id", id).order("at", { ascending: false }).limit(100)) ?? { data: [] };
  return (data as { id: number; at: string; kind: string; body: string | null }[]) ?? [];
}

export type { Segment };
