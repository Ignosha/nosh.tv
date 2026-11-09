// Optional email sending through Resend (free tier: 3,000 emails/month).
// Without RESEND_API_KEY and EMAIL_FROM, nothing is sent and the admin uses copy / mailto instead.
export function emailEnabled(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string, headers?: Record<string, string>): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!emailEnabled()) return { ok: false, error: "Email sending is not configured." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, reply_to: process.env.EMAIL_REPLY_TO || undefined, headers }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `Resend replied ${res.status}` };
    const j = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: j.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

export function mailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
