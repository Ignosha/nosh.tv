import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPS_EMAIL)
    return NextResponse.json({ off: "Set OPS_EMAIL for a daily work digest" });
  const client = db();
  if (!client)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  const [review, failed, replies] = await Promise.all([
    client
      .from("kl_cases")
      .select("id", { count: "exact", head: true })
      .eq("report_approved", false)
      .not("report", "is", null),
    client
      .from("kl_jobs")
      .select("id", { count: "exact", head: true })
      .eq("state", "failed"),
    client
      .from("kl_leads")
      .select("id", { count: "exact", head: true })
      .in("status", ["replied", "booked"]),
  ]);
  if ([review, failed, replies].some((r) => r.error))
    return NextResponse.json(
      { error: "Digest could not read work list" },
      { status: 503 },
    );
  const day = new Date().toISOString().slice(0, 10);
  const sent = await sendEmail(
    process.env.OPS_EMAIL,
    `TraceSworn daily desk — ${day}`,
    `${review.count ?? 0} reports await review.\n${failed.count ?? 0} automation jobs need attention.\n${replies.count ?? 0} leads are marked replied or booked.\n\nOpen your work list: ${SITE_URL}/admin/operations\nReview the monitored reply inbox separately; replies are not automatically imported.`,
    undefined,
    `ops-digest-${day}`,
  );
  return NextResponse.json(sent, { status: sent.ok ? 200 : 503 });
}
