import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkWatch, alertRecord, alertText, type Watch, type Movement } from "@/lib/watch";
import { getCase, updateCase, logEvent } from "@/lib/cases";
import { sendEmail, emailEnabled } from "@/lib/email";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Runs daily (vercel.json). Re-reads every watched address and, when anything moved, seals an alert record
// to the matter, logs it, and emails the client and you.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data } = await client.from("kl_watches").select("*").eq("active", true).order("last_checked_at", { ascending: true, nullsFirst: true }).limit(300);
  const watches = (data as Watch[]) ?? [];
  const byCase = new Map<string, Movement[]>();
  for (let i = 0; i < watches.length; i += 4) {
    const results = await Promise.all(watches.slice(i, i + 4).map((w) => checkWatch(w).catch(() => null)));
    results.forEach((m, j) => {
      if (m) byCase.set(watches[i + j].case_id, [...(byCase.get(watches[i + j].case_id) ?? []), m]);
    });
  }

  let alerts = 0;
  for (const [caseId, movements] of byCase) {
    const c = await getCase(caseId);
    if (!c) continue;
    const sealed = await alertRecord(caseId, movements);
    const extras = (c.extras ?? {}) as Record<string, unknown>;
    const past = Array.isArray(extras.alerts) ? (extras.alerts as unknown[]) : [];
    await updateCase(caseId, { extras: { ...extras, alerts: [sealed, ...past].slice(0, 60) } });
    await logEvent(caseId, "alert", `${movements.length} watched address(es) moved. Fingerprint ${sealed.fingerprint.value.slice(0, 16)}…`);
    const text = alertText(movements, sealed.fingerprint.value) + `\n\nMatter page: ${SITE_URL}/case/${c.token}`;
    if (emailEnabled()) {
      await sendEmail(c.email, "TraceSworn alert: a watched address moved", text);
      const ops = process.env.ALERT_EMAIL || CONTACT_EMAIL;
      if (ops) await sendEmail(ops, `Alert on ${c.name}: ${movements.length} address(es) moved`, text);
    }
    alerts++;
  }
  return NextResponse.json({ checked: watches.length, mattersAlerted: alerts, emailEnabled: emailEnabled() });
}
