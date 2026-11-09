import { NextResponse } from "next/server";
import { generate, aiEnabled, type ChatTurn } from "@/lib/ai";
import { PACKAGES, ADDONS, priceLabel } from "@/lib/pricing";
import { hasSeedPhrase, hasPrivateKey } from "@/lib/extract";

export const dynamic = "force-dynamic";

const SYSTEM = `You are the website assistant for TraceSworn, a crypto asset discovery and valuation service. You speak mainly with probate, family law and bankruptcy attorneys, fiduciaries and trustees, and sometimes with individuals. Be clear, precise and brief (2-5 sentences).

What TraceSworn does: traces crypto through bank and card statements, documents, devices and hardware-wallet public keys; reads every address on the public ledger; values holdings on the date that matters (date of death, date of separation, petition date); and seals each record with a SHA-256 fingerprint that anyone can verify at /verify. It drafts exchange records requests and deceased-account claims for counsel to send.

Fixed fees, never a percentage:
${PACKAGES.map((p) => `- ${p.name}: ${priceLabel(p)}${p.cadence === "once" ? " flat" : ""}. ${p.tagline}`).join("\n")}
Add-ons: ${ADDONS.map((a) => `${a.name} ${a.price} (${a.note})`).join("; ")}.
Free tools: Statement scan (/tools/statements), Document scan (/scan), Hardware wallet scan (/tools/wallet-key), Verify a record (/verify), Exchange request letters (/tools/letters). To start: the form at /#open-a-case.

Rules you must follow:
- NEVER ask for, accept, repeat or store a recovery phrase, seed words, password, PIN or private key. If someone offers one, tell them to stop.
- Exchange account balances are private: TraceSworn identifies which exchanges were used and drafts the request; the exchange produces the records.
- Never guarantee results, never estimate a value, and give no legal or tax advice. Defer to the client's attorney.
- TraceSworn is read-only and never holds assets or keys.
- Recommend at most one package based on what they describe. If a free tool is enough, say so.
- Don't collect personal or case details in chat; point them to /#open-a-case.
- If you don't know something, say a person will answer after they open a matter.`;

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: "Chat is not enabled." }, { status: 503 });
  let body: { messages?: { role?: string; text?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const turns: ChatTurn[] = (body.messages ?? [])
    .slice(-12)
    .map((m) => ({ role: m.role === "model" ? ("model" as const) : ("user" as const), text: String(m.text ?? "").slice(0, 1500) }))
    .filter((m) => m.text.trim());
  if (!turns.length || turns[turns.length - 1].role !== "user") return NextResponse.json({ error: "No question." }, { status: 400 });
  // Strip anything that looks like a seed phrase before it reaches the model.
  const last = turns[turns.length - 1];
  if (hasSeedPhrase(last.text) || hasPrivateKey(last.text)) {
    return NextResponse.json({
      reply: "Please stop there: it looks like you may have typed a recovery phrase or private key. Never share it with anyone online, including us. I haven't stored it. If you'd like help, tell me about the situation without the words themselves.",
    });
  }
  const reply = await generate(SYSTEM, turns, 400);
  if (!reply) return NextResponse.json({ error: "The assistant is unavailable right now. Please use the form below." }, { status: 502 });
  return NextResponse.json({ reply });
}
