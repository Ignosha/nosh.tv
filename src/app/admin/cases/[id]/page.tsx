import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCase, updateCase, logEvent, events, daysFromNow, valuationLabel } from "@/lib/cases";
import { STAGES, STAGE_IDS, stage, fill } from "@/lib/playbook";
import { packageById, priceLabel, payLink, casePayLink, PACKAGES, ADDONS_LINK, ALERTS_LINK, COST_BASIS_LINK, DISSIPATION_LINK } from "@/lib/pricing";
import { buildReport, buildDrafts } from "@/lib/analyze";
import { sendEmail, emailEnabled, mailto } from "@/lib/email";
import { aiEnabled } from "@/lib/ai";
import { SITE_URL, OPERATOR_NAME } from "@/lib/site";
import { CopyButton } from "@/components/CopyButton";
import { TraceMap } from "@/components/TraceMap";
import { traceBitcoin } from "@/lib/trace";
import { costBasis, dissipation } from "@/lib/schedules";
import { extrasOf, btcAddresses } from "@/lib/record";
import { startWatching, stopWatching, watchesFor } from "@/lib/watch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- server actions (all under /admin, behind basic auth) ----------
async function setStage(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const to = String(form.get("stage"));
  if (!STAGE_IDS.includes(to as never)) return;
  const st = stage(to);
  await updateCase(id, { status: to, next_followup_at: st.followupDays ? daysFromNow(st.followupDays) : null });
  await logEvent(id, "stage", `Moved to “${st.name}”.`);
  revalidatePath(`/admin/cases/${id}`);
}

async function setPackage(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const pkg = String(form.get("package"));
  await updateCase(id, { package: PACKAGES.some((p) => p.id === pkg) ? pkg : null });
  await logEvent(id, "package", `Package set to ${pkg}.`);
  revalidatePath(`/admin/cases/${id}`);
}

async function runAnalysis(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const c = await getCase(id);
  if (!c) return;
  const report = await buildReport(c);
  const drafts = await buildDrafts(c, report);
  await updateCase(id, { report, drafts, report_approved: false });
  await logEvent(id, "analysis", `Read ${report.rows.length} holding line(s); ${report.failed.length} address(es) failed. Drafts ${drafts.ai ? "polished with AI" : "from templates"}.`);
  revalidatePath(`/admin/cases/${id}`);
}

async function approveReport(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const approve = form.get("approve") === "1";
  const summary = form.get("summary");
  const c = await getCase(id);
  if (!c) return;
  await updateCase(id, {
    report_approved: approve,
    ...(typeof summary === "string" && c.drafts ? { drafts: { ...c.drafts, summary: summary.slice(0, 8000) } } : {}),
  });
  await logEvent(id, "report", approve ? "Report approved and published to the matter page." : "Report hidden from the matter page.");
  revalidatePath(`/admin/cases/${id}`);
}

async function saveNotes(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const followup = String(form.get("followup") ?? "");
  await updateCase(id, {
    notes: String(form.get("notes") ?? "").slice(0, 20000),
    ...(followup ? { next_followup_at: new Date(followup + "T15:00:00Z").toISOString() } : {}),
  });
  revalidatePath(`/admin/cases/${id}`);
}

async function logContact(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const what = String(form.get("what") ?? "Contacted");
  const c = await getCase(id);
  if (!c) return;
  const st = stage(c.status);
  await updateCase(id, { last_contact_at: new Date().toISOString(), next_followup_at: st.followupDays ? daysFromNow(st.followupDays) : null });
  await logEvent(id, "contact", what.slice(0, 300));
  revalidatePath(`/admin/cases/${id}`);
}

async function emailNow(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const subject = String(form.get("subject") ?? "");
  const body = String(form.get("body") ?? "");
  const c = await getCase(id);
  if (!c || !subject || !body) return;
  const r = await sendEmail(c.email, subject, body);
  if (r.ok) {
    const st = stage(c.status);
    await updateCase(id, { last_contact_at: new Date().toISOString(), next_followup_at: st.followupDays ? daysFromNow(st.followupDays) : null });
  }
  await logEvent(id, r.ok ? "email" : "email-failed", r.ok ? `Sent: ${subject}` : r.error);
  revalidatePath(`/admin/cases/${id}`);
}

async function runExtra(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  const kind = String(form.get("kind"));
  const c = await getCase(id);
  if (!c) return;
  const btc = btcAddresses(c);
  const extras = extrasOf(c);
  if (kind === "trace") {
    const since = String(form.get("since") ?? "") || null;
    const trace = await traceBitcoin(btc.slice(0, 8), { hops: 3, since, maxNodes: 48, fanout: 4 });
    await updateCase(id, { extras: { ...extras, trace } });
    await logEvent(id, "trace", `Tracing map: ${trace.nodes.length} addresses, ${trace.edges.length} transfers.`);
  } else if (kind === "basis") {
    const cb = await costBasis(btc.slice(0, 20));
    await updateCase(id, { extras: { ...extras, costBasis: cb } });
    await logEvent(id, "cost-basis", `Cost-basis schedule: ${cb.lots.length} lots, ${cb.disposals.length} transfers out.`);
  } else if (kind === "dissipation") {
    const date = String(form.get("date") ?? "") || c.date_of_death;
    if (!date) return;
    const months = Math.min(60, Math.max(1, Number(form.get("months")) || 24));
    const d = await dissipation(btc.slice(0, 20), date, months);
    await updateCase(id, { extras: { ...extras, dissipation: d } });
    await logEvent(id, "dissipation", `Dissipation analysis: ${d.outflows.length} transfers out since ${d.lookbackFrom}.`);
  } else if (kind === "watch-on") {
    await startWatching(c);
  } else if (kind === "watch-off") {
    await stopWatching(id);
  }
  revalidatePath(`/admin/cases/${id}`);
}

// ---------- page ----------
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const log = await events(c.id);
  const st = stage(c.status);
  const p = packageById(c.package);
  const base = p ? payLink(p.id) : null;
  const pay = base ? casePayLink(base, c.id, c.email) : `${SITE_URL}/#services`;
  const portal = `${SITE_URL}/case/${c.token}`;
  const vars = {
    name: c.name,
    first: c.name.split(" ")[0],
    package: p?.name ?? "the package we discussed",
    price: p ? `${priceLabel(p)}${p.cadence === "once" ? " flat" : ""}` : "[price]",
    portal,
    pay,
    you: OPERATOR_NAME,
  };
  const subject = fill(st.email.subject, vars);
  const body = fill(st.email.body, vars);
  const r = c.report;
  const nextIdx = STAGE_IDS.indexOf(st.id) + 1;
  const next = STAGES[nextIdx] && st.id !== "closed" && st.id !== "declined" ? STAGES[nextIdx] : null;
  const x = extrasOf(c);
  const btcCount = btcAddresses(c).length;
  const watches = await watchesFor(c.id);
  const watching = watches.filter((w) => w.active);

  return (
    <div className="wrap" style={{ padding: "32px 0 96px", display: "grid", gap: 18 }}>
      <div>
        <Link href="/admin" className="fine">← All cases</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
          <div>
            <span className="kicker">{st.name}</span>
            <h1 className="serif" style={{ fontSize: 44, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{c.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {c.role} · <a href={`mailto:${c.email}`}>{c.email}</a>
              {c.phone ? <> · <a href={`tel:${c.phone}`}>{c.phone}</a></> : null}
              {c.region ? ` · ${c.region}` : ""} · {c.matter_type ?? "estate"} · {valuationLabel(c.matter_type)} {c.date_of_death ?? "unknown"} · filed/letters: {c.has_authority ?? "?"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {c.paid_at ? <span className="stamp stamp-found">Paid {usd((c.amount_paid ?? 0) / 100)}</span> : <span className="stamp stamp-pending">Not paid</span>}
            <a className="btn btn-small" href={portal} target="_blank" rel="noreferrer">Matter page ↗</a>
          </div>
        </div>
      </div>

      {/* Stage + playbook */}
      <div className="instrument">
        <div>
          <div className="pane-head"><span>Playbook · {st.name}</span><span>Do this now</span></div>
          <h3 className="pane-title" style={{ fontSize: 26 }}>{st.goal}</h3>
          <ul style={{ paddingLeft: 18, margin: "0 0 16px" }}>
            {st.checklist.map((x) => <li key={x} style={{ marginBottom: 6 }}>{x}</li>)}
          </ul>
          {st.avoid.length ? (
            <div className="notice warn" style={{ marginBottom: 16 }}>
              <b>Avoid:</b> {st.avoid.join(" · ")}
            </div>
          ) : null}
          <div className="label" style={{ marginBottom: 6 }}>What to say</div>
          <pre className="letter" style={{ fontSize: 14 }}>{fill(st.say, vars)}</pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <CopyButton text={fill(st.say, vars)} label="Copy script" />
            <Link className="btn btn-small" href="/admin/playbook">Hard questions &amp; answers</Link>
          </div>
          <form action={logContact} style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <input type="hidden" name="id" value={c.id} />
            <input name="what" className="boxed-input" placeholder="Log a call or message (e.g. Called, left voicemail)" style={{ flex: 1, minWidth: 220, padding: "8px 12px" }} />
            <button className="btn btn-small" type="submit">Log contact</button>
          </form>
        </div>

        <div>
          <div className="pane-head"><span>Email for this stage</span><span>{emailEnabled() ? "Sends from your domain" : "Opens in your mail app"}</span></div>
          <form action={emailNow}>
            <input type="hidden" name="id" value={c.id} />
            <div className="field"><label>Subject</label><input name="subject" defaultValue={subject} /></div>
            <div className="field" style={{ marginTop: 10 }}><label>Message</label><textarea name="body" defaultValue={body} style={{ minHeight: 260 }} /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {emailEnabled() ? <button className="btn btn-small btn-primary" type="submit">Send email</button> : null}
              <a className="btn btn-small" href={mailto(c.email, subject, body)}>Open in mail app</a>
              <CopyButton text={body} label="Copy message" />
            </div>
          </form>
          <div style={{ marginTop: 22 }}>
            <div className="label" style={{ marginBottom: 8 }}>Move the case</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {next ? (
                <form action={setStage}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="stage" value={next.id} />
                  <button className="btn btn-small btn-primary" type="submit">Next: {next.name} →</button>
                </form>
              ) : null}
              <form action={setStage} style={{ display: "flex", gap: 6 }}>
                <input type="hidden" name="id" value={c.id} />
                <select name="stage" defaultValue={st.id} className="boxed-input" style={{ padding: "6px 10px", fontFamily: "var(--font-sans)" }}>
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button className="btn btn-small" type="submit">Set</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Package + payment */}
      <div className="form-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <form action={setPackage} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="id" value={c.id} />
            <b>Package</b>
            <select name="package" defaultValue={c.package ?? ""} className="boxed-input" style={{ padding: "6px 10px", fontFamily: "var(--font-sans)", width: "auto" }}>
              <option value="">Not chosen</option>
              {PACKAGES.filter((x) => x.id !== "scan").map((x) => <option key={x.id} value={x.id}>{x.name} · {priceLabel(x)}</option>)}
            </select>
            <button className="btn btn-small" type="submit">Save</button>
          </form>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {base ? <CopyButton text={pay} label="Copy payment link" /> : null}
            <CopyButton text={casePayLink(ADDONS_LINK, c.id, c.email)} label="Copy add-ons link" />
            <CopyButton text={casePayLink(ALERTS_LINK, c.id, c.email)} label="Copy alerts link ($750/mo)" />
            <CopyButton text={casePayLink(COST_BASIS_LINK, c.id, c.email)} label="Copy cost-basis link" />
            <CopyButton text={casePayLink(DISSIPATION_LINK, c.id, c.email)} label="Copy dissipation link" />
            <CopyButton text={portal} label="Copy matter page link" />
          </div>
        </div>
        <p className="fine" style={{ margin: "10px 0 0" }}>Payment links carry this case&rsquo;s ID, so Stripe marks it paid here automatically.</p>
      </div>

      {/* Findings + pipeline */}
      <div className="form-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Findings &amp; report</h3>
          <form action={runAnalysis}>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn btn-small btn-primary" type="submit" disabled={!c.findings}>{r ? "Re-run analysis" : "Run analysis"}</button>
          </form>
        </div>
        {c.findings ? (
          <p className="muted">
            Client sent {c.findings.addresses.length} address(es){c.findings.xpubs?.length ? `, ${c.findings.xpubs.length} wallet key(s)` : ""}
            {c.findings.sources.length ? `; clues: ${c.findings.sources.map((s) => s.name).join(", ")}` : ""}
            {c.findings.phraseFlags ? `; ⚠ ${c.findings.phraseFlags} possible recovery phrase location(s) in their documents (not sent; handle offline)` : ""}.
          </p>
        ) : (
          <p className="muted">No findings yet. Ask the client to run the scans on their matter page, or run <Link href="/tools/statements">the statement scan</Link> and <Link href="/scan">document scan</Link> yourself and send findings from that page.</p>
        )}
        {r ? (
          <>
            <div className="totals">
              <div><div className="label">Value today</div><div className="big">{usd(r.totalNow)}</div></div>
              <div><div className="label">On {valuationLabel(c.matter_type)}</div><div className="big">{r.totalAtDate !== null ? usd(r.totalAtDate) : "—"}</div>{r.totalAtDate !== null && !r.atDateComplete ? <div className="fine">Partial</div> : null}</div>
              <div><div className="label">Read</div><div className="big" style={{ fontSize: 22 }}>{r.readAt.slice(0, 16).replace("T", " ")} UTC</div></div>
            </div>
            <div className="table-scroll">
              <table className="clue-table">
                <thead><tr><th>Address</th><th>Asset</th><th style={{ textAlign: "right" }}>Now</th><th style={{ textAlign: "right" }}>On {valuationLabel(c.matter_type)}</th></tr></thead>
                <tbody>
                  {r.rows.map((x, i) => (
                    <tr key={i}>
                      <td className="addr-cell"><a className="addr" href={x.explorer} target="_blank" rel="noreferrer">{x.address}</a>{x.note && r.rows[i - 1]?.address !== x.address ? <div className="snippet">{x.note}</div> : null}</td>
                      <td className="mono">{x.asset}<div className="snippet">{x.network}</div></td>
                      <td className="num">{x.balanceNow.toLocaleString("en-US", { maximumFractionDigits: 8 })}<div className="snippet">{x.valueNow === null ? "—" : usd(x.valueNow)}</div></td>
                      <td className="num">{x.balanceAtDate === null ? "—" : x.balanceAtDate.toLocaleString("en-US", { maximumFractionDigits: 8 })}<div className="snippet">{x.valueAtDate === null ? "—" : usd(x.valueAtDate)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.failed.length ? <div className="notice warn" style={{ marginTop: 12 }}>Could not read: {r.failed.map((f) => `${f.address} (${f.error})`).join("; ")}. Re-run later.</div> : null}
            <form action={approveReport} style={{ marginTop: 16 }}>
              <input type="hidden" name="id" value={c.id} />
              <div className="field"><label>Summary for the client {c.drafts?.ai ? "(AI-polished; check every number)" : "(from template)"}</label><textarea name="summary" defaultValue={c.drafts?.summary ?? ""} style={{ minHeight: 200 }} /></div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                {c.report_approved ? (
                  <>
                    <span className="stamp stamp-found">Published to matter page</span>
                    <input type="hidden" name="approve" value="0" />
                    <button className="btn btn-small" type="submit">Hide from matter page</button>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="approve" value="1" />
                    <button className="btn btn-small btn-primary" type="submit">Approve &amp; publish to matter page</button>
                  </>
                )}
              </div>
            </form>
            <p className="fine">{r.sources.join(" · ")}</p>
          </>
        ) : null}
      </div>

      {/* Premium work */}
      <div className="form-card" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Premium work</h3>
          <Link className="btn btn-small btn-primary" href={`/admin/cases/${c.id}/exhibits`}>Open court exhibit pack →</Link>
        </div>
        <p className="fine" style={{ margin: 0 }}>{btcCount} Bitcoin address(es) on this matter. Tracing, cost basis and dissipation read Bitcoin history from the public ledger; results are saved to the matter and sealed into the exhibit pack.</p>
        <div className="instrument">
          <form action={runExtra}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="kind" value="trace" />
            <div className="pane-head"><span>Follow-the-money map</span><span>Complex Matter</span></div>
            <div className="field"><label>Only transfers on or after</label><input type="date" name="since" defaultValue={x.trace?.since ?? ""} /></div>
            <button className="btn btn-small" type="submit" disabled={!btcCount} style={{ marginTop: 10 }}>{x.trace ? "Re-run trace" : "Run trace (3 hops)"}</button>
            {x.trace ? <p className="fine">{x.trace.nodes.length} addresses · {x.trace.edges.length} transfers · read {x.trace.readAt.slice(0, 10)}</p> : null}
          </form>
          <div style={{ display: "grid", gap: 14 }}>
            <form action={runExtra}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="kind" value="basis" />
              <div className="pane-head"><span>Tax cost-basis schedule</span><span>Add-on $1,950</span></div>
              <button className="btn btn-small" type="submit" disabled={!btcCount}>{x.costBasis ? "Re-run" : "Build schedule"}</button>
              {x.costBasis ? <span className="fine"> {x.costBasis.lots.length} lots · basis held {x.costBasis.heldBasis !== null ? usd(x.costBasis.heldBasis) : "—"}</span> : null}
            </form>
            <form action={runExtra}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="kind" value="dissipation" />
              <div className="pane-head"><span>Dissipation analysis</span><span>Add-on $1,500</span></div>
              <div className="form-grid">
                <div className="field"><label>Key date</label><input type="date" name="date" defaultValue={c.date_of_death ?? ""} /></div>
                <div className="field"><label>Look-back (months)</label><input type="number" name="months" min={1} max={60} defaultValue={c.matter_type === "bankruptcy" ? 24 : 12} /></div>
              </div>
              <button className="btn btn-small" type="submit" disabled={!btcCount} style={{ marginTop: 10 }}>{x.dissipation ? "Re-run" : "Run analysis"}</button>
              {x.dissipation ? <span className="fine"> {x.dissipation.outflows.length} transfers out · {usd(x.dissipation.totalAfterUsd)} after the date</span> : null}
            </form>
            <form action={runExtra}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="kind" value={watching.length ? "watch-off" : "watch-on"} />
              <div className="pane-head"><span>Asset-movement alerts</span><span>$750/month</span></div>
              <button className="btn btn-small" type="submit" disabled={!r && !c.findings}>{watching.length ? `Stop watching ${watching.length} address(es)` : "Start watching every address"}</button>
              {watching.length ? <span className="fine"> Checked daily; last change {watching.map((w) => w.last_change_at).filter(Boolean).sort().pop()?.slice(0, 10) ?? "none yet"}.</span> : null}
            </form>
          </div>
        </div>
        {x.trace ? <TraceMap trace={x.trace} /> : null}
      </div>

      {c.drafts?.letters.length ? (
        <div className="form-card">
          <h3>Exchange claim letters (drafts)</h3>
          <p className="fine" style={{ marginTop: 0 }}>Fill in the bracketed details with the executor, then send through each exchange&rsquo;s official help center. Record ticket numbers in the notes.</p>
          {c.drafts.letters.map((l) => (
            <details key={l.exchange} style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{l.exchange}</summary>
              <pre className="letter" style={{ marginTop: 10, fontSize: 13.5 }}>{l.text}</pre>
              <div style={{ marginTop: 8 }}><CopyButton text={l.text} label="Copy letter" /></div>
            </details>
          ))}
        </div>
      ) : null}

      {/* Notes + log */}
      <div className="instrument">
        <form action={saveNotes}>
          <input type="hidden" name="id" value={c.id} />
          <div className="pane-head"><span>Notes</span><span>Private</span></div>
          <textarea name="notes" defaultValue={c.notes ?? ""} className="boxed-input" style={{ minHeight: 200, fontFamily: "var(--font-sans)" }} placeholder="Exchange ticket numbers, what counsel said, next steps…" />
          <div className="field" style={{ marginTop: 10 }}>
            <label>Next follow-up</label>
            <input type="date" name="followup" defaultValue={c.next_followup_at ? c.next_followup_at.slice(0, 10) : ""} />
          </div>
          <button className="btn btn-small" type="submit" style={{ marginTop: 10 }}>Save</button>
          <div className="fine" style={{ marginTop: 14 }}>
            What they told us: {c.known_holdings || "—"}
            <br />Devices: {c.devices || "—"}
            <br />Message: {c.message || "—"}
          </div>
        </form>
        <div>
          <div className="pane-head"><span>Activity</span><span>{log.length}</span></div>
          {log.length === 0 ? <p className="fine">No activity yet.</p> : null}
          {log.map((e) => (
            <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid color-mix(in srgb, currentColor 14%, transparent)", fontSize: 14 }}>
              <span className="mono" style={{ fontSize: 12, opacity: 0.75 }}>{e.at.slice(0, 16).replace("T", " ")}</span> · <b>{e.kind}</b>
              <div>{e.body}</div>
            </div>
          ))}
          <p className="fine" style={{ marginTop: 12 }}>AI drafting: {aiEnabled() ? "on (Gemini)" : "off: add GEMINI_API_KEY to turn it on"} · Email sending: {emailEnabled() ? "on (Resend)" : "off: add RESEND_API_KEY and EMAIL_FROM"}</p>
        </div>
      </div>
    </div>
  );
}
