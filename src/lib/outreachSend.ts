import { db } from "./db";
import { sendEmail } from "./email";
import { draftStep, stepDelay, outreachReady } from "./outreach";
import { logLead, type Lead } from "./leads";
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
  // A durable claim protects this step even if the provider accepts the email and the response is lost.
  const client = db();
  if (!client) return {ok:false,error:"Database not configured"};
  const {data:claim,error:claimError}=await client.from("kl_leads").update({send_claimed_at:new Date().toISOString()}).eq("id",l.id).eq("step",l.step).in("status",["queued","contacted"]).is("send_claimed_at",null).select("id");
  if(claimError || !claim?.length) return {ok:false,error:"Step already claimed, suppressed, or awaiting delivery review"};
  // Stable copy is necessary for provider idempotency on retries. AI is available only as an editable preview.
  const d = opts.override ?? base;
  const r = await sendEmail(l.email, d.subject, d.body, {
    "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?t=${l.unsub_token}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }, `outreach-${l.id}-${l.step}`);
  if (!r.ok) {
    await client.from("kl_leads").update({delivery_error:r.error??"Delivery uncertain; review before retry"}).eq("id",l.id);
    await logLead(l.id, "email-failed", r.error ?? "Send failed");
    return { ok: false, error: r.error };
  }
  const nextStep = l.step + 1;
  const delay = stepDelay(nextStep);
  const previousDelay = stepDelay(l.step) ?? 0;
  const {error:finishError}=await client.from("kl_leads").update({
    status: delay === null ? "finished" : "contacted", step:nextStep,
    delivery_id:r.id??null,delivery_error:null,send_claimed_at:null,
    last_sent_at:new Date().toISOString(),
    next_send_at:delay===null?null:new Date(Date.now()+Math.max(1,delay-previousDelay)*86400000).toISOString(),
  }).eq("id",l.id).eq("step",l.step).in("status",["queued","contacted"]);
  if(finishError) return {ok:false,error:"Email accepted but state update failed; claim held for manual review"};
  await logLead(l.id, "email", `Step ${l.step + 1} sent: ${d.subject}`);
  return { ok: true };
}
