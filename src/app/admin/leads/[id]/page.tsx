import { requireAdmin } from "@/lib/adminAuth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLead, updateLead, logLead, leadEvents, LEAD_STATUSES, type LeadStatus } from "@/lib/leads";
import { draftStep, outreachReady, SEQUENCE_LENGTH } from "@/lib/outreach";
import { sendNextStep } from "@/lib/outreachSend";
import { mailto } from "@/lib/email";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function setStatus(form: FormData) {
  "use server";
  await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as LeadStatus;
  if (!LEAD_STATUSES.some((s) => s.id === status)) return;
  const stop = ["replied", "booked", "not_fit", "unsubscribed", "bounced", "finished"].includes(status);
  await updateLead(id, { status, ...(stop ? { next_send_at: null } : status === "queued" ? { next_send_at: new Date().toISOString() } : {}) });
  await logLead(id, "status", `Marked ${status}.`);
  revalidatePath(`/admin/leads/${id}`);
}

async function save(form: FormData) {
  "use server";
  await requireAdmin();
  const id = String(form.get("id"));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  await updateLead(id, { email: email || null, name: String(form.get("name") ?? "").trim() || null, notes: String(form.get("notes") ?? "").slice(0, 10000) });
  revalidatePath(`/admin/leads/${id}`);
}

async function sendNow(form: FormData) {
  "use server";
  await requireAdmin();
  const id = String(form.get("id"));
  const l = await getLead(id);
  if (!l) return;
  const r = await sendNextStep(l, { override: { subject: String(form.get("subject")), body: String(form.get("body")) } });
  if (!r.ok) await logLead(id, "note", r.error ?? "Not sent");
  revalidatePath(`/admin/leads/${id}`);
}

async function markSent(form: FormData) {
  "use server";
  await requireAdmin();
  const id = String(form.get("id"));
  const l = await getLead(id);
  if (!l) return;
  await updateLead(id, { step: l.step + 1, status: l.step + 1 >= SEQUENCE_LENGTH ? "finished" : "contacted", last_sent_at: new Date().toISOString() });
  await logLead(id, "email", `Step ${l.step + 1} sent from your own mail app.`);
  revalidatePath(`/admin/leads/${id}`);
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await getLead(id);
  if (!l) notFound();
  const log = await leadEvents(l.id);
  const d = draftStep(l, l.step);
  const ready = outreachReady();

  return (
    <div className="wrap" style={{ padding: "32px 0 96px", display: "grid", gap: 18 }}>
      <div>
        <Link href="/admin/leads" className="fine">← All leads</Link>
        <span className="kicker" style={{ display: "block", marginTop: 8 }}>{LEAD_STATUSES.find((s) => s.id === l.status)?.name} · score {l.score} · {l.segment}</span>
        <h1 className="serif" style={{ fontSize: 40, margin: "0 0 4px" }}>{l.name ?? l.firm ?? "Lead"}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {[l.name ? l.firm : null, l.city, l.state].filter(Boolean).join(" · ")}
          {l.phone ? <> · <a href={`tel:${l.phone}`}>{l.phone}</a></> : null}
          {l.website ? <> · <a href={/^https?:/.test(l.website) ? l.website : "https://" + l.website} target="_blank" rel="noreferrer">website ↗</a></> : null}
        </p>
        <p className="fine">{l.evidence} Practice: {l.practice.join(", ") || "not detected"}.</p>
      </div>

      <div className="instrument">
        <div>
          <div className="pane-head"><span>Email {Math.min(l.step + 1, SEQUENCE_LENGTH)} of {SEQUENCE_LENGTH}</span><span>{ready.ok ? "Sends from your domain" : "Send from your mail app"}</span></div>
          {d && l.email ? (
            <form action={sendNow}>
              <input type="hidden" name="id" value={l.id} />
              <div className="field"><label>Subject</label><input name="subject" defaultValue={d.subject} /></div>
              <div className="field" style={{ marginTop: 10 }}><label>Message</label><textarea name="body" defaultValue={d.body} style={{ minHeight: 320 }} /></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {ready.ok ? <button className="btn btn-small btn-primary" type="submit">Send now</button> : null}
                <a className="btn btn-small" href={mailto(l.email, d.subject, d.body)}>Open in mail app</a>
                <CopyButton text={d.body} label="Copy message" />
              </div>
            </form>
          ) : (
            <p className="muted">{!l.email ? "No email on file. Add one below, or call the number listed." : "Sequence finished."}</p>
          )}
          {d && l.email && !ready.ok ? (
            <form action={markSent} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={l.id} />
              <button className="btn btn-small" type="submit">I sent it from my mail app</button>
            </form>
          ) : null}
        </div>
        <div>
          <div className="pane-head"><span>Outcome</span><span>Stops the sequence</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEAD_STATUSES.filter((s) => ["queued", "replied", "booked", "not_fit", "bounced"].includes(s.id)).map((s) => (
              <form key={s.id} action={setStatus}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="status" value={s.id} />
                <button className={`btn btn-small${l.status === s.id ? " btn-primary" : ""}`} type="submit">{s.name}</button>
              </form>
            ))}
          </div>
          <form action={save} style={{ marginTop: 16 }}>
            <input type="hidden" name="id" value={l.id} />
            <div className="field"><label>Contact name</label><input name="name" defaultValue={l.name ?? ""} /></div>
            <div className="field" style={{ marginTop: 10 }}><label>Email</label><input name="email" type="email" defaultValue={l.email ?? ""} /></div>
            <div className="field" style={{ marginTop: 10 }}><label>Notes</label><textarea name="notes" defaultValue={l.notes ?? ""} style={{ minHeight: 100 }} /></div>
            <button className="btn btn-small" type="submit" style={{ marginTop: 10 }}>Save</button>
          </form>
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>When they reply: what to say on the call</summary>
            <ol className="fine" style={{ paddingLeft: 18 }}>
              <li>Ask about the matter, not the firm: &ldquo;Is there a current matter where crypto may be involved? What do you have so far: statements, an address, a device?&rdquo;</li>
              <li>Name the date that matters: date of death, separation or petition. &ldquo;We value everything on that date from named public sources.&rdquo;</li>
              <li>Offer the free first pass: send {"/tools/statements"} for their bank statements. It flags exchange payments in minutes, in their browser.</li>
              <li>Quote the fixed fee in writing: Discovery Report $2,500; Evidence Package $6,500 if it may be contested; Complex Matter $12,500 if assets may be hidden. Never a percentage.</li>
              <li>Book it: mark &ldquo;Call booked&rdquo; here, then open the matter from the homepage form with them, or send the payment link.</li>
            </ol>
          </details>
          <div className="pane-head" style={{ marginTop: 18 }}><span>Activity</span><span>{log.length}</span></div>
          {log.map((e) => (
            <div key={e.id} style={{ fontSize: 14, padding: "6px 0" }}>
              <span className="mono" style={{ fontSize: 12 }}>{e.at.slice(0, 16).replace("T", " ")}</span> · <b>{e.kind}</b> {e.body}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
