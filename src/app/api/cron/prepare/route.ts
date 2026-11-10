import { startWatching } from "@/lib/watch";
import { tokenEvidence } from "@/lib/tokenEvidence";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCase, logEvent } from "@/lib/cases";
import { buildReport, buildDrafts } from "@/lib/analyze";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = db();
  if (!client)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  await client
    .from("kl_jobs")
    .update({
      state: "failed",
      error: "Worker lease expired after final attempt",
    })
    .eq("state", "running")
    .gte("attempts", 3)
    .lt("locked_at", new Date(Date.now() - 600000).toISOString());
  const { data: jobs, error } = await client.rpc("kl_claim_job");
  if (error)
    return NextResponse.json(
      { error: "Apply the automation schema" },
      { status: 503 },
    );
  const job = jobs?.[0];
  if (!job) return NextResponse.json({ prepared: 0 });
  try {
    const c = await getCase(job.case_id);
    if (!c) throw new Error("Matter unavailable");
    if (!c.paid_at && !c.firm_id)
      throw new Error("Engagement must be confirmed before preparation");
    if (c.firm_id) {
      const { data: firm, error: firmError } = await client
        .from("kl_firms")
        .select("active")
        .eq("id", c.firm_id)
        .single();
      if (firmError || !firm?.active)
        throw new Error("Firm engagement is inactive");
    }
    if (c.findings_version !== job.version) {
      await client
        .from("kl_jobs")
        .update({ state: "review", error: "Superseded by newer findings" })
        .eq("id", job.id);
      return NextResponse.json({ superseded: true });
    }
    const report = await buildReport(c);
    const drafts = await buildDrafts(c, report);
    const eth = [
      ...new Set(
        (c.findings?.addresses ?? [])
          .filter((a) => a.chain === "ethereum")
          .map((a) => a.address.toLowerCase()),
      ),
    ].slice(0, 3);
    const tokens = await Promise.all(eth.map((a) => tokenEvidence(a)));
    // Optimistic version check: never replace a newer finding set or approval.
    const { data: saved, error: saveError } = await client.rpc(
      "kl_save_preparation",
      {
        p_case: c.id,
        p_version: job.version,
        p_report: report,
        p_drafts: drafts,
        p_tokens: tokens,
      },
    );
    if (saveError) throw new Error("Could not save draft");
    const { error: jobError } = await client
      .from("kl_jobs")
      .update({
        state: "review",
        error: saved ? null : "Superseded by newer findings",
      })
      .eq("id", job.id);
    if (jobError) throw new Error("Could not finish job");
    if (saved && c.firm_id) await startWatching({ ...c, report });
    if (saved)
      await logEvent(
        c.id,
        "analysis",
        "Draft prepared automatically. Named reviewer must verify readings and approve publication.",
      );
    return NextResponse.json({ prepared: saved ? 1 : 0, reviewRequired: true });
  } catch (e) {
    await client
      .from("kl_jobs")
      .update({
        state: job.attempts >= 3 ? "failed" : "pending",
        error: e instanceof Error ? e.message : "Preparation failed",
        available_at: new Date(
          Date.now() + job.attempts * 300000,
        ).toISOString(),
      })
      .eq("id", job.id);
    return NextResponse.json(
      { error: "Preparation failed; see operations desk" },
      { status: 500 },
    );
  }
}
