import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outreachReady, DAILY_LIMIT } from "@/lib/outreach";
import { sendNextStep } from "@/lib/outreachSend";
import type { Lead } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Runs on weekdays (vercel.json). Sends due emails to approved leads, highest score first, up to the daily limit.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ready = outreachReady();
  if (!ready.ok) return NextResponse.json({ sent: 0, off: ready.missing });
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const day = new Date().getUTCDay();
  if (day === 0 || day === 6) return NextResponse.json({ sent: 0, note: "Weekend: no outreach." });

  const since = new Date(Date.now() - 86400000).toISOString();
  const { count, error: countError } = await client.from("kl_leads").select("id", { count: "exact", head: true }).gte("last_sent_at", since);
  if (countError) return NextResponse.json({error:"Could not verify daily send limit"},{status:503});
  const room = Math.max(0, DAILY_LIMIT - (count ?? 0));
  if (!room) return NextResponse.json({ sent: 0, note: "Daily limit reached." });

  const { data, error: queryError } = await client
    .from("kl_leads")
    .select("*")
    .in("status", ["queued", "contacted"])
    .not("email", "is", null)
    .is("send_claimed_at", null)
    .or(`next_send_at.is.null,next_send_at.lte.${new Date().toISOString()}`)
    .order("score", { ascending: false })
    .limit(room);
  if(queryError) return NextResponse.json({error:"Could not load due prospects"},{status:503});
  let sent = 0;
  const errors: string[] = [];
  for (const l of (data as Lead[]) ?? []) {
    const r = await sendNextStep(l);
    if (r.ok) sent++;
    else if (r.error) errors.push(r.error);
    await new Promise((res) => setTimeout(res, 1200)); // spread sends out
  }
  return NextResponse.json({ sent, room, errors: errors.slice(0, 5) });
}
