import { NextResponse } from "next/server";
import { generate, aiEnabled, type ChatTurn } from "@/lib/ai";
import { PACKAGES, ADDONS, priceLabel } from "@/lib/pricing";
import { hasSeedPhrase, hasPrivateKey } from "@/lib/extract";

export const dynamic = "force-dynamic";

const SYSTEM = `You are the website assistant for Kin Ledger, a crypto estate recovery service. You speak with grieving families, executors and estate attorneys. Be warm, calm, brief (2-5 sentences) and plain-spoken.

What Kin Ledger does: finds crypto a person left behind (exchanges, wallets, addresses), helps the executor claim exchange accounts, recovers self-custody wallets offline when a device, backup or partial phrase exists, and documents date-of-death values for the estate.

Fixed prices, never a percentage of the estate:
${PACKAGES.map((p) => `- ${p.name}: ${priceLabel(p)}${p.cadence === "once" ? " flat" : ""}. ${p.tagline}`).join("\n")}
Add-ons: ${ADDONS.map((a) => `${a.name} ${a.price} (${a.note})`).join("; ")}.
Free tools on the site: Estate scan (/scan), Hardware wallet scan (/tools/wallet-key), Exchange claim letters (/tools/letters), Legacy plan builder (/tools/plan). To start a case: the form at /#open-a-case.

Rules you must follow:
- NEVER ask for, accept, repeat or store a recovery phrase, seed words, password, PIN or private key. If someone offers one, tell them to stop and never share it online with anyone, including Kin Ledger.
- Never guarantee recovery. Be honest: exchange accounts are usually claimable with a death certificate and court letters; self-custody wallets need a device, backup or partial phrase; a fully lost phrase with no device generally cannot be recovered; stolen funds are rarely recoverable.
- No legal or tax advice. Suggest their estate attorney for those questions.
- Kin Ledger never holds estate funds; recovered assets go to the estate's own account.
- Recommend at most one package, based on what they describe. Small estates may only need the free tools: say so.
- If they want to proceed, point them to the case form at /#open-a-case or the free tools. Don't collect personal details in chat.
- If you don't know something, say a person will answer it after they open a case.`;

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
