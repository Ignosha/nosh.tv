import { db } from "@/lib/db";
import { isUuid } from "@/lib/cases";
import { contribution, PREMIER_SCOPE } from "@/lib/servicePolicy";
import { outreachReady } from "@/lib/outreach";
import { revalidatePath } from "next/cache";
export const dynamic = "force-dynamic";
async function retryJob(form: FormData) {
  "use server";
  const id = Number(form.get("job_id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid job");
  const { error } = await db()!
    .from("kl_jobs")
    .update({
      state: "pending",
      attempts: 0,
      error: null,
      available_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("state", "failed");
  if (error) throw new Error("Retry could not be queued");
  revalidatePath("/admin/operations");
}
async function recordTime(form: FormData) {
  "use server";
  const caseId = String(form.get("case_id")),
    minutes = Number(form.get("minutes")),
    note = String(form.get("note") ?? "")
      .trim()
      .slice(0, 1000);
  if (
    !isUuid(caseId) ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 1440 ||
    !note
  )
    throw new Error("Enter a matter, minutes and work description");
  const { error } = await db()!
    .from("kl_time_entries")
    .insert({ case_id: caseId, minutes, note });
  if (error) throw new Error("Time entry could not be saved");
  revalidatePath("/admin/operations");
}
export default async function Operations() {
  const client = db();
  const ready = outreachReady();
  if (!client)
    return (
      <main className="wrap" style={{ padding: 40 }}>
        <h1>Operations setup</h1>
        <p>
          Connect Supabase and apply supabase/schema.sql to activate the work
          queue, capacity limits and cost tracking.
        </p>
        <p>Outreach needs: {ready.missing.join("; ")}</p>
      </main>
    );
  const month = new Date();
  month.setUTCDate(1);
  month.setUTCHours(0, 0, 0, 0);
  const results = await Promise.all([
    client
      .from("kl_cases")
      .select(
        "id,name,firm_id,paid_at,amount_paid,due_at,report_approved,status,case_lead",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    client
      .from("kl_jobs")
      .select("id,case_id,state,error,attempts")
      .neq("state", "review")
      .limit(100),
    client
      .from("kl_time_entries")
      .select("case_id,minutes")
      .gte("created_at", month.toISOString()),
    client.from("kl_firms").select("id,name").eq("active", true),
    client.from("kl_leads").select("status"),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Operations data unavailable. Apply the schema and retry.");
  const matters = results[0].data ?? [],
    jobs = results[1].data ?? [],
    time = results[2].data ?? [],
    firms = results[3].data ?? [],
    leads = results[4].data ?? [];
  const counts: Record<string, number> = {};
  for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
  const minutesFor = (id: string) =>
    time.filter((t) => t.case_id === id).reduce((n, t) => n + t.minutes, 0);
  const needsReview = matters.filter(
    (m) => !m.report_approved && !["closed", "declined"].includes(m.status),
  );
  const cash = matters
    .filter((m) => m.paid_at && m.paid_at >= month.toISOString())
    .reduce((s, m) => s + (m.amount_paid ?? 0), 0);
  const totalMinutes = time.reduce((s, t) => s + t.minutes, 0);
  const economics = contribution(cash, totalMinutes);
  return (
    <main className="wrap" style={{ padding: 40 }}>
      <a href="/admin">Case desk</a> · <a href="/admin/firms">Firms</a> ·{" "}
      <a href="/admin/leads">Outreach</a>
      <h1>Operations &amp; margins</h1>
      <p>
        One work list for review, delivery exceptions and sales. Automated
        drafts stay private until approved.
      </p>
      <section className="form-card">
        <h2>This month</h2>
        <p>
          Recorded case payments: ${(cash / 100).toLocaleString()} · Time:{" "}
          {(totalMinutes / 60).toFixed(1)} hours · Estimated labor cost: $
          {(economics.laborCents / 100).toLocaleString()}
        </p>
        <p>
          Case payment contribution before all other costs: $
          {(economics.contributionCents / 100).toLocaleString()}. This is not
          accounting profit. Payments are recorded case totals and may include
          prior installments; firm subscription receipts and untracked expenses
          are excluded.
        </p>
      </section>
      <h2>Firm capacity</h2>
      {firms.map((f) => {
        const ids = matters.filter((m) => m.firm_id === f.id).map((m) => m.id);
        const minutes = time
          .filter((t) => ids.includes(t.case_id))
          .reduce((s, t) => s + t.minutes, 0);
        const estimate = contribution(1000000, minutes);
        return (
          <p key={f.id}>
            {f.name}: {(minutes / 60).toFixed(1)} /{" "}
            {PREMIER_SCOPE.includedHours} included hours used · estimated
            labor-only margin at full contracted price:{" "}
            {((estimate.margin ?? 0) * 100).toFixed(0)}%{" "}
            {minutes >= 1500
              ? "— Capacity reached: quote further work separately"
              : ""}
            . Contracted price is a planning assumption, not collected revenue.
          </p>
        );
      })}
      <h2>Review &amp; delivery</h2>
      {needsReview.map((m) => (
        <p key={m.id}>
          <a href={`/admin/cases/${m.id}`}>{m.name}</a> ·{" "}
          {m.case_lead ?? "Assign a lead"} ·{" "}
          {m.due_at
            ? `Due ${m.due_at.slice(0, 10)}${Date.parse(m.due_at) < Date.now() ? " — overdue" : ""}`
            : "Scope intake"}{" "}
          · {(minutesFor(m.id) / 60).toFixed(1)} hours this month
        </p>
      ))}
      <h2>Automation queue</h2>
      {jobs.map((j) => (
        <div className="form-card" key={j.id}>
          <a href={`/admin/cases/${j.case_id}`}>Matter</a>: {j.state} · attempts{" "}
          {j.attempts} · {j.error ?? "Waiting for worker"}
          {j.state === "failed" ? (
            <form action={retryJob}>
              <input type="hidden" name="job_id" value={j.id} />
              <button className="btn btn-small">
                Retry after resolving the error
              </button>
            </form>
          ) : null}
        </div>
      ))}
      <h2>Record specialist time</h2>
      <form action={recordTime} className="form-card">
        <label>
          Matter{" "}
          <select name="case_id">
            {matters.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minutes{" "}
          <input name="minutes" type="number" min={1} max={1440} required />
        </label>
        <label>
          Work performed <input name="note" required maxLength={1000} />
        </label>
        <button className="btn">Record time</button>
      </form>
      <h2>Acquisition funnel</h2>
      <p>
        {Object.entries(counts)
          .map(([s, n]) => `${s}: ${n}`)
          .join(" · ") || "No leads yet"}
      </p>
      <p>
        {ready.ok
          ? "Outreach configured. Review qualified prospects in the outreach desk."
          : `Outreach blocked: ${ready.missing.join("; ")}`}
      </p>
      <p>
        Validate the pilot before scaling: 3 paid firms, repeat matters, and
        delivery costs below 50% of collected revenue. Tracked hours and
        conversion counts support this decision; they do not guarantee
        profitability.
      </p>
    </main>
  );
}
