// Server-only data access for cases and their activity log.
import { db } from "./db";
import type { StageId } from "./playbook";

export type Findings = {
  sentAt: string;
  addresses: { chain: string; address: string; source: string }[];
  sources: { kind: string; name: string }[];
  phraseFlags: number;
  files: number;
  xpubs?: string[];
};

export type ReportRow = {
  chain: string;
  address: string;
  network: string;
  asset: string;
  balanceNow: number;
  valueNow: number | null;
  balanceAtDate: number | null;
  valueAtDate: number | null;
  note?: string;
  explorer: string;
};

export type Report = {
  readAt: string;
  dateOfDeath: string | null;
  rows: ReportRow[];
  failed: { address: string; error: string }[];
  totalNow: number;
  totalAtDate: number | null;
  atDateComplete: boolean;
  sources: string[];
};

export type Drafts = {
  summary: string;
  letters: { exchange: string; text: string }[];
  generatedAt: string;
  ai: boolean;
};

export type Case = {
  findings_version?: number;
  report_version?: number | null;
  service_kind?: string;
  firm_id?: string | null;
  case_lead?: string | null;
  due_at?: string | null;
  id: string;
  created_at: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  region: string | null;
  date_of_death: string | null;
  known_holdings: string | null;
  devices: string | null;
  has_authority: string | null;
  message: string | null;
  package: string | null;
  matter_type: string | null;
  status: StageId | string;
  token: string;
  paid_at: string | null;
  amount_paid: number | null;
  stripe_session: string | null;
  findings: Findings | null;
  report: Report | null;
  report_approved: boolean;
  drafts: Drafts | null;
  extras: Record<string, unknown> | null;
  notes: string | null;
  last_contact_at: string | null;
  next_followup_at: string | null;
};

export type CaseEvent = { id: number; case_id: string; at: string; kind: string; body: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export async function getCase(id: string): Promise<Case | null> {
  const client = db();
  if (!client || !isUuid(id)) return null;
  const { data } = await client.from("kl_cases").select("*").eq("id", id).maybeSingle();
  return (data as Case) ?? null;
}

export async function getCaseByToken(token: string): Promise<Case | null> {
  const client = db();
  if (!client || !isUuid(token)) return null;
  const { data } = await client.from("kl_cases").select("*").eq("token", token).maybeSingle();
  return (data as Case) ?? null;
}

export async function updateCase(id: string, patch: Partial<Case>): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("kl_cases").update(patch).eq("id", id);
  return !error;
}

export async function logEvent(caseId: string, kind: string, body?: string): Promise<void> {
  const client = db();
  if (!client) return;
  await client.from("kl_events").insert({ case_id: caseId, kind, body: body ?? null });
}

export async function events(caseId: string): Promise<CaseEvent[]> {
  const client = db();
  if (!client) return [];
  const { data } = await client.from("kl_events").select("*").eq("case_id", caseId).order("at", { ascending: false }).limit(100);
  return (data as CaseEvent[]) ?? [];
}

export function valuationLabel(matter: string | null | undefined): string {
  return matter === "divorce" ? "date of separation" : matter === "bankruptcy" ? "petition date" : matter === "other" ? "valuation date" : "date of death";
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}
