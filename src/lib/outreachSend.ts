import { sendEmail } from "./email";
import { draftStep, personalize, stepDelay, outreachReady } from "./outreach";
import { updateLead, logLead, type Lead } from "./leads";
import { SITE_URL } from "./site";

const STOP = new Set(["replied", "booked", "not_fit", "unsubscribed", "bounced", "finished"]);

/** Sends the lead's next email, records it, and schedules the next step (or ends the sequence). */
export async function sendNextStep(l: Lead, opts: { override?: { subject: string; body: string } } = {}): Promise<{ ok: boolean; error?: string }> {
  const ready = outreachReady();
  if (!ready.ok) return { ok: false, error: "Outreach is off. Missing: " + ready.missing.join("; ") };
  if (!l.email) return { ok: false, error: "No email on file." };
  if (STOP.has(l.status)) return { ok: false, error: `Lead is ${l.status}.` };
  const base = draftStep(l, l.step);
  if (!base) return { ok: false, error: "Sequence finished." };
  const d = opts.override ?? (l.step === 0 ? await personalize(l, base) : base);
  const r = await sendEmail(l.email, d.subject, d.body, {
    "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?t=${l.unsub_token}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
  if (!r.ok) {
    await logLead(l.id, "email-failed", r.error ?? "Send failed");
    return { ok: false, error: r.error };
  }
  const nextStep = l.step + 1;
  const delay = stepDelay(nextStep);
  await updateLead(l.id, {
    status: delay === null ? "finished" : "contacted",
    step: nextStep,
    last_sent_at: new Date().toISOString(),
    next_send_at: delay === null ? null : new Date(Date.now() + delay * 86400000).toISOString(),
  });
  await logLead(l.id, "email", `Step ${l.step + 1} sent: ${d.subject}`);
  return { ok: true };
}
