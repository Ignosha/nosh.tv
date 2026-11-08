import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logEvent, daysFromNow, type Case } from "@/lib/cases";
import { stage, fill } from "@/lib/playbook";
import { sendEmail, emailEnabled } from "@/lib/email";
import { packageById, priceLabel, payLink, casePayLink } from "@/lib/pricing";
import { SITE_URL, OPERATOR_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs daily (vercel.json). Sends each due case the email for its stage, if email is configured,
// then schedules the next reminder from the playbook. Stages that need a phone call or a real update
// from you are left in the admin "Due" list instead of being emailed automatically.
const AUTO_EMAIL_STAGES = new Set(["new", "contacted", "engaged"]);

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data } = await client
    .from("kl_cases")
    .select("*")
    .lte("next_followup_at", new Date().toISOString())
    .not("status", "in", "(closed,declined)")
    .limit(100);
  const due = (data as Case[]) ?? [];
  let sent = 0;
  for (const c of due) {
    const st = stage(c.status);
    // A brand-new case is due immediately for YOUR call; only email it after a day of no contact.
    const ageHours = (Date.now() - Date.parse(c.created_at)) / 3600000;
    if (st.id === "new" && ageHours < 24) continue; // leave it in your Due list for the first call
    if (emailEnabled() && AUTO_EMAIL_STAGES.has(st.id)) {
      const p = packageById(c.package);
      const link = p ? payLink(p.id) : null;
      const vars = {
        name: c.name,
        first: c.name.split(" ")[0],
        portal: `${SITE_URL}/case/${c.token}`,
        you: OPERATOR_NAME,
        package: p?.name ?? "the package we discussed",
        price: p ? priceLabel(p) : "",
        pay: link ? casePayLink(link, c.id, c.email) : `${SITE_URL}/#services`,
      };
      const r = await sendEmail(c.email, "Following up: " + fill(st.email.subject, vars), fill(st.email.body, vars));
      await logEvent(c.id, r.ok ? "email" : "email-failed", r.ok ? `Automatic follow-up: ${st.email.subject}` : r.error);
      if (r.ok) sent++;
    }
    if (st.followupDays) await client.from("kl_cases").update({ next_followup_at: daysFromNow(st.followupDays) }).eq("id", c.id);
  }
  return NextResponse.json({ due: due.length, sent, emailEnabled: emailEnabled() });
}
