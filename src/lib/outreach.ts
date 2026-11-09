// Outreach: a short, honest three-email sequence to professional prospects, sent only after you approve
// each lead. Every email names the sender, includes your postal address and a one-click unsubscribe
// (CAN-SPAM), and stops the moment someone replies, books, or unsubscribes.
import type { Lead } from "./leads";
import type { Segment } from "./finder";
import { generate, aiEnabled } from "./ai";
import { SITE_URL, OPERATOR_NAME } from "./site";
import { emailEnabled } from "./email";

type Step = { delayDays: number; subject: string; body: string };

const PITCH: Record<Segment, { who: string; problem: string; date: string; proof: string }> = {
  estate: {
    who: "probate and estate matters",
    problem: "When a decedent held crypto, the inventory and Form 706 need a date-of-death value that holds up, and exchange accounts need to be found before they can be claimed.",
    date: "date of death",
    proof: "every address read on the public ledger and valued on the date of death",
  },
  divorce: {
    who: "family law matters",
    problem: "When one spouse holds crypto, the other side often only sees transfers to an exchange on a bank statement. Disclosure turns on evidence, not suspicion.",
    date: "date of separation",
    proof: "transfers followed from the bank statements to the wallets, valued on the date of separation, with any post-separation transfers listed",
  },
  bankruptcy: {
    who: "bankruptcy matters",
    problem: "Undisclosed crypto is one of the easiest assets to leave off a schedule and one of the hardest to prove without tracing.",
    date: "petition date",
    proof: "wallets traced and valued on the petition date, with transfers in the look-back period listed",
  },
};

const SEQUENCE: Step[] = [
  {
    delayDays: 0,
    subject: "Crypto in your {who}: a sealed, fixed-fee reading",
    body: `{greeting}

{hook}{problem}

TraceSworn does that tracing for counsel: {proof}. Each figure names its source, and the report is sealed with a SHA-256 fingerprint that opposing counsel can verify themselves at {site}/verify. Fixed fees from $2,500, never a percentage. We never hold keys or assets.

If you have a matter where crypto may be involved, you can try the free tools first (statement scan and address check, run privately in your browser): {site}/tools

Would a 15-minute call be useful? Just reply to this email.

{you}`,
  },
  {
    delayDays: 4,
    subject: "Re: Crypto in your {who}",
    body: `{greeting}

A quick follow-up. The step most matters skip: bank statements. Exchanges bill under legal names that are easy to miss, such as Payward (Kraken), BAM Trading (Binance.US) and Foris DAX (Crypto.com). Our statement scan flags every one with its date and amount, in the browser, with nothing uploaded: {site}/tools/statements

If a current matter could use a {date} valuation, reply and I'll scope it the same day.

{you}`,
  },
  {
    delayDays: 10,
    subject: "Closing the loop",
    body: `{greeting}

I won't keep writing. If crypto comes up in a matter later, TraceSworn is here: tracing, valuation on the {date}, exchange records requests, and a sealed evidence record, at a fixed fee agreed in writing first.

{site}

{you}`,
  },
];

export const SEQUENCE_LENGTH = SEQUENCE.length;
export const stepDelay = (step: number) => SEQUENCE[step]?.delayDays ?? null;

function greeting(l: Lead) {
  const n = (l.name ?? "").replace(/^(hon\.|judge|mr\.|ms\.|mrs\.|dr\.)\s+/i, "").trim();
  const parts = n.split(" ").filter((w) => !/^[A-Z]\.?$/.test(w));
  return parts.length >= 2 ? `Dear ${parts[0]} ${parts[parts.length - 1]},` : "Hello,";
}

/** A factual hook from the lead's own record, e.g. the court case they were counsel in. */
function hook(l: Lead): string {
  if (l.source === "courtlistener" && l.evidence) {
    const m = l.evidence.match(/in (.+?) \(([^,]+), (\d{4})/);
    if (m) return `I read ${m[1]} (${m[2]}, ${m[3]}), where you were counsel and cryptocurrency was part of the record. `;
  }
  if (l.practice.includes("crypto")) return `I noticed ${l.firm ?? "your firm"} mentions digital assets in its practice. `;
  if (l.firm && l.city) return `I'm reaching out to ${l.firm} because of its ${PITCH[l.segment].who.replace(" matters", "")} practice in ${l.city}. `;
  return "";
}

export function footer(l: Lead): string {
  const addr = process.env.BUSINESS_ADDRESS || "[your postal address: required before sending]";
  return `\n\n—\nTraceSworn · ${SITE_URL}\n${addr}\nYou're receiving this because your firm's public listing shows ${PITCH[l.segment].who}. Not useful? One click and you won't hear from us again: ${SITE_URL}/u/${l.unsub_token}`;
}

export function draftStep(l: Lead, step: number): { subject: string; body: string } | null {
  const s = SEQUENCE[step];
  if (!s) return null;
  const p = PITCH[l.segment];
  const vars: Record<string, string> = {
    greeting: greeting(l),
    hook: hook(l),
    problem: p.problem,
    proof: p.proof,
    who: p.who,
    date: p.date,
    site: SITE_URL,
    you: OPERATOR_NAME,
  };
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? "");
  return { subject: fill(s.subject), body: fill(s.body) + footer(l) };
}

/** Optional: lets the AI tighten the first email's opening using only the facts on file. Numbers and links are checked. */
export async function personalize(l: Lead, d: { subject: string; body: string }): Promise<{ subject: string; body: string; ai: boolean }> {
  if (!aiEnabled()) return { ...d, ai: false };
  const [main, foot] = d.body.split("\n\n—\n");
  const out = await generate(
    "You edit a short B2B email from a crypto tracing firm to an attorney. Keep it under 170 words, plain and professional, no hype, no exclamation marks. Keep every link, price, and the sign-off exactly. Do not add any fact, claim, statistic or promise that is not in the draft or the facts given. Return only the email body.",
    [{ role: "user", text: `Facts about the recipient (use only these): ${JSON.stringify({ name: l.name, firm: l.firm, city: l.city, practice: l.practice, evidence: l.evidence })}\n\nDraft:\n${main}` }],
    500,
  );
  const links = main.match(/https?:\/\/\S+/g) ?? [];
  const keepsLinks = !!out && links.every((u) => out.includes(u.replace(/[.,)]$/, "")));
  const keepsPrice = !!out && out.includes("$2,500") === main.includes("$2,500");
  if (!out || !keepsLinks || !keepsPrice) return { ...d, ai: false };
  return { subject: d.subject, body: out.trim() + "\n\n—\n" + foot, ai: true };
}

export function outreachReady(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!emailEnabled()) missing.push("RESEND_API_KEY and EMAIL_FROM (a verified sending domain)");
  if (!process.env.BUSINESS_ADDRESS) missing.push("BUSINESS_ADDRESS (postal address, required by CAN-SPAM)");
  if (process.env.OUTREACH_ENABLED !== "1") missing.push("OUTREACH_ENABLED=1 (the on switch)");
  return { ok: missing.length === 0, missing };
}

export const DAILY_LIMIT = Math.max(1, Math.min(200, Number(process.env.OUTREACH_DAILY_LIMIT) || 25));
