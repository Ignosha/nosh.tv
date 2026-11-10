import { PILOT_PROSPECTS } from "@/lib/pilotProspects";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listLeads, leadCounts, saveLeads, enrichAll, updateLead, logLead, LEAD_STATUSES } from "@/lib/leads";
import { osmLawyers, courtListenerLeads, courtListenerEnabled, parseImport, type Segment } from "@/lib/finder";
import { outreachReady, DAILY_LIMIT, SEQUENCE_LENGTH } from "@/lib/outreach";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SEGMENTS: { id: Segment; name: string }[] = [
  { id: "estate", name: "Estates & probate" },
  { id: "divorce", name: "Divorce & family" },
  { id: "bankruptcy", name: "Bankruptcy" },
];

const back = (msg: string) => redirect(`/admin/leads?msg=${encodeURIComponent(msg)}`);

async function loadPilot() {
  "use server";
  const {added,skipped}=await saveLeads(PILOT_PROSPECTS.map(l=>({...l,score:l.practice.includes("bankruptcy")?60:30})));
  revalidatePath("/admin/leads");
  back(`Pilot: ${added} prospects added, ${skipped} duplicates. Review fit and contact details before queueing; no emails sent.`);
}

async function findCity(form: FormData) {
  "use server";
  const city = String(form.get("city") ?? "").trim();
  const state = String(form.get("state") ?? "").trim();
  if (!city || !state) back("Enter a city and state.");
  let msg: string;
  try {
    const { leads, source } = await osmLawyers(city, state);
    const { enriched } = await enrichAll(leads);
    const { added, skipped } = await saveLeads(leads);
    msg = `${city}, ${state}: ${leads.length} law offices from ${source}; ${enriched} websites read; ${added} new leads, ${skipped} already on file.`;
  } catch (e) {
    msg = e instanceof Error ? e.message : "Search failed.";
  }
  revalidatePath("/admin/leads");
  back(msg);
}

async function findCourt(form: FormData) {
  "use server";
  const segment = String(form.get("segment") ?? "estate") as Segment;
  const since = String(form.get("since") ?? "") || undefined;
  let msg: string;
  try {
    const { leads, cases } = await courtListenerLeads(segment, { since });
    const { added, skipped } = await saveLeads(leads);
    msg = `Court records: ${cases} opinions matched; ${leads.length} counsel named; ${added} new leads, ${skipped} already on file.`;
  } catch (e) {
    msg = e instanceof Error ? e.message : "Search failed.";
  }
  revalidatePath("/admin/leads");
  back(msg);
}

async function importList(form: FormData) {
  "use server";
  const segment = String(form.get("segment") ?? "estate") as Segment;
  const leads = parseImport(String(form.get("csv") ?? ""), segment).slice(0, 500);
  await enrichAll(leads, 150_000);
  const { added, skipped } = await saveLeads(leads);
  revalidatePath("/admin/leads");
  back(`Imported ${added} lead(s); ${skipped} skipped as duplicates.`);
}

async function bulk(form: FormData) {
  "use server";
  const ids = form.getAll("id").map(String);
  const action = String(form.get("action") ?? "");
  if (!ids.length) back("Select at least one lead.");
  const client = db();
  if (action === "queue") {
    await client?.from("kl_leads").update({ status: "queued", next_send_at: new Date().toISOString() }).in("id", ids).in("status", ["new", "not_fit"]).not("email", "is", null);
    for (const id of ids) await logLead(id, "queued", "Approved for outreach.");
  } else if (action === "not_fit") {
    for (const id of ids) await updateLead(id, { status: "not_fit", next_send_at: null });
  }
  revalidatePath("/admin/leads");
  back(action === "queue" ? `Queued ${ids.length} lead(s). Leads without an email are skipped.` : `Marked ${ids.length} as not a fit.`);
}

export default async function Leads({ searchParams }: { searchParams: Promise<{ status?: string; segment?: string; min?: string; msg?: string }> }) {
  const sp = await searchParams;
  const status = sp.status ?? "new";
  const leads = await listLeads({ status: status === "all" ? undefined : status, segment: sp.segment || undefined, min: Number(sp.min) || undefined });
  const counts = await leadCounts();
  const ready = outreachReady();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="wrap" style={{ padding: "36px 0 96px", display: "grid", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Link href="/admin" className="fine">← Case desk</Link>
          <span className="kicker" style={{ display: "block", marginTop: 8 }}>Client finder</span>
          <h1 className="serif" style={{ fontSize: 44, margin: 0 }}>Find the counsel who need you.</h1>
        </div>
        <div className="fine">{total} leads on file · {counts.queued ?? 0} queued · {counts.contacted ?? 0} in sequence · {counts.replied ?? 0} replied · {counts.booked ?? 0} booked</div>
      </div>

      {sp.msg ? <div className="notice">{sp.msg}</div> : null}
      <div className={`notice ${ready.ok ? "" : "warn"}`}>
        {ready.ok
          ? `Outreach is on: up to ${DAILY_LIMIT} emails each weekday, ${SEQUENCE_LENGTH} emails per lead, stopping on unsubscribe or when you mark a reply in the lead desk. A monitored reply mailbox is required.`
          : <>Outreach sending is off until you add: {ready.missing.join(" · ")}. You can still find, review and queue leads, and send from your own mail app.</>}
      </div>

      <form action={loadPilot} className="form-card"><h2>Start the US insolvency pilot</h2><p>Four source-backed firms, researched on their own websites. One verified general business email; other contacts need qualification. These are prospects, not customers or expressions of interest.</p><button className="btn">Load researched pilot prospects</button></form>
      <div className="instrument">
        <form action={findCity}>
          <div className="pane-head"><span>1 · Law offices in a city</span><span>OpenStreetMap + firm websites</span></div>
          <p className="fine" style={{ marginTop: 0 }}>Finds every law office mapped in the city, reads each firm&rsquo;s own website for a public email and practice areas, and scores fit for estate, family and bankruptcy work.</p>
          <div className="form-grid">
            <div className="field"><label>City</label><input name="city" placeholder="Jacksonville" required /></div>
            <div className="field"><label>State</label><input name="state" placeholder="Florida" required /></div>
          </div>
          <button className="btn btn-small btn-primary" type="submit" style={{ marginTop: 12 }}>Find law offices</button>
          <p className="fine">Takes up to a few minutes for a large city.</p>
        </form>
        <form action={findCourt}>
          <div className="pane-head"><span>2 · Counsel in crypto cases</span><span>CourtListener</span></div>
          <p className="fine" style={{ marginTop: 0 }}>Searches court opinions for estate, divorce or bankruptcy cases that involved cryptocurrency, and lists the counsel named. The warmest leads: they have already met the problem.</p>
          <div className="form-grid">
            <div className="field"><label>Matter type</label><select name="segment" className="boxed-input">{SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="field"><label>Filed after</label><input type="date" name="since" defaultValue="2022-01-01" /></div>
          </div>
          <button className="btn btn-small btn-primary" type="submit" style={{ marginTop: 12 }} disabled={!courtListenerEnabled()}>Search court records</button>
          {!courtListenerEnabled() ? <p className="fine">Needs a free CourtListener API token: create an account at courtlistener.com, copy the token from your profile, and add it as COURTLISTENER_TOKEN.</p> : null}
        </form>
      </div>

      <details className="form-card">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>3 · Import a list (bar directory, conference attendees, referrals)</summary>
        <form action={importList} style={{ marginTop: 12 }}>
          <div className="field"><label>One per line: name, firm, email, website, city, state</label><textarea name="csv" style={{ minHeight: 140 }} placeholder={"Jane Doe, Doe Probate Law, jane@doeprobate.com, doeprobate.com, Tampa, FL"} /></div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select name="segment" className="boxed-input" style={{ width: "auto", padding: "6px 10px" }}>{SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <button className="btn btn-small" type="submit">Import &amp; enrich</button>
          </div>
        </form>
      </details>

      <div className="form-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[{ id: "all", name: "All" }, ...LEAD_STATUSES].map((s) => (
            <Link key={s.id} href={`/admin/leads?status=${s.id}${sp.segment ? `&segment=${sp.segment}` : ""}`} className={`btn btn-small${status === s.id ? " btn-primary" : ""}`}>
              {s.name}{s.id !== "all" && counts[s.id] ? ` · ${counts[s.id]}` : ""}
            </Link>
          ))}
        </div>
        <form action={bulk}>
          <div className="table-scroll">
            <table className="clue-table">
              <thead><tr><th></th><th>Lead</th><th>Fit</th><th>Contact</th><th>Why</th></tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td><input type="checkbox" name="id" value={l.id} aria-label={`Select ${l.firm ?? l.name}`} /></td>
                    <td>
                      <Link href={`/admin/leads/${l.id}`} style={{ fontWeight: 600 }}>{l.name ?? l.firm ?? "Unnamed"}</Link>
                      <div className="snippet">{[l.name ? l.firm : null, l.city, l.state].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td><span className={`stamp ${l.score >= 50 ? "stamp-found" : l.score >= 25 ? "stamp-pending" : "stamp-none"}`}>{l.score}</span><div className="snippet">{l.segment}{l.practice.length ? ` · ${l.practice.join(", ")}` : ""}</div></td>
                    <td style={{ fontSize: 13 }}>{l.email ?? <span className="faint">no email</span>}<div className="snippet">{l.phone ?? ""}{l.website ? <> · <a href={/^https?:/.test(l.website) ? l.website : "https://" + l.website} target="_blank" rel="noreferrer">site</a></> : null}</div></td>
                    <td className="snippet" style={{ maxWidth: 340 }}>{l.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leads.length === 0 ? <p className="fine">No leads here yet. Run a search above.</p> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-small btn-primary" type="submit" name="action" value="queue">Approve &amp; queue selected</button>
            <button className="btn btn-small" type="submit" name="action" value="not_fit">Not a fit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
