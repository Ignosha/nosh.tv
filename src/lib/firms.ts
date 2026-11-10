import { db } from "./db";
import { isUuid } from "./cases";
export type Firm = { id: string; token: string; name: string; email: string; case_lead: string; active: boolean };
export async function firmByToken(token: string): Promise<Firm | null> {
  const client = db();
  if (!client || !isUuid(token)) return null;
  const { data, error } = await client.from("kl_firms").select("*").eq("token", token).eq("active", true).maybeSingle();
  if (error) throw new Error("Firm lookup failed");
  return data;
}
/** Friday 23:59 UTC of the submission week. Same-week service is tracked explicitly. */
export function sameWeekDue(now = new Date()): string {
  const due = new Date(now);
  const day = due.getUTCDay();
  due.setUTCDate(due.getUTCDate() + (day <= 5 && day > 0 ? 5-day : day === 6 ? 6 : 5));
  due.setUTCHours(23,59,59,999);
  return due.toISOString();
}
