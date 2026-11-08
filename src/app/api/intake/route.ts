import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PACKAGES } from "@/lib/pricing";
import { logEvent } from "@/lib/cases";
import { sendEmail, emailEnabled } from "@/lib/email";
import { stage, fill } from "@/lib/playbook";
import { SITE_URL, OPERATOR_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

const ROLES = ["family", "executor", "attorney", "advisor", "other"];
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  let f: Record<string, unknown>;
  try {
    f = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  if (clip(f.website, 200)) return NextResponse.json({ ok: true }); // honeypot

  const name = clip(f.name, 120);
  const email = clip(f.email, 200);
  const role = ROLES.includes(String(f.role)) ? String(f.role) : "other";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please add your name and a valid email." }, { status: 400 });
  }
  if (f.consent !== true) return NextResponse.json({ error: "Please confirm the consent box." }, { status: 400 });

  const date = clip(f.dateOfDeath, 10);
  const row = {
    role,
    name,
    email,
    phone: clip(f.phone, 40) || null,
    region: clip(f.region, 120) || null,
    date_of_death: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    known_holdings: clip(f.knownHoldings, 2000) || null,
    devices: clip(f.devices, 2000) || null,
    has_authority: clip(f.hasAuthority, 40) || null,
    message: clip(f.message, 4000) || null,
    package: PACKAGES.some((p) => p.id === f.package) ? String(f.package) : null,
  };

  const client = db();
  if (!client) {
    return NextResponse.json({ error: "Case intake is not connected yet. Please email us instead." }, { status: 503 });
  }
  // Due now: the playbook says reach out within one business day.
  const { data, error } = await client
    .from("kl_cases")
    .insert({ ...row, next_followup_at: new Date().toISOString() })
    .select("id, token")
    .single();
  if (error || !data) return NextResponse.json({ error: "We could not save your request. Please email us instead." }, { status: 500 });

  const portal = `${SITE_URL}/case/${data.token}`;
  await logEvent(data.id, "opened", `Case opened from the website (${role}${row.package ? `, ${row.package}` : ""}).`);
  if (emailEnabled()) {
    // Send the first playbook email automatically so the family has their private link right away.
    const st = stage("new");
    const vars = { name, first: name.split(" ")[0], portal, you: OPERATOR_NAME, package: "", price: "", pay: "" };
    const sent = await sendEmail(email, fill(st.email.subject, vars), fill(st.email.body, vars));
    await logEvent(data.id, sent.ok ? "email" : "email-failed", sent.ok ? `Sent: ${st.email.subject}` : sent.error);
  }
  return NextResponse.json({ ok: true, portal: `/case/${data.token}` });
}
