import { NextResponse } from "next/server";
import { getCaseByToken, updateCase, logEvent, type Findings } from "@/lib/cases";
import { startWatching } from "@/lib/watch";
import { detectChain } from "@/lib/extract";

export const dynamic = "force-dynamic";

// The family's portal sends only what the in-browser scan found: addresses, exchange/wallet names,
// and a count of possible recovery-phrase locations. Never documents or phrases.
export async function POST(req: Request) {
  let body: { token?: string; addresses?: { address?: string; source?: string }[]; sources?: { kind?: string; name?: string }[]; phraseFlags?: number; files?: number; xpubs?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const c = await getCaseByToken(String(body.token ?? ""));
  if (!c) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const seen = new Set<string>();
  const addresses: Findings["addresses"] = [];
  for (const a of body.addresses ?? []) {
    const address = String(a.address ?? "").trim();
    const chain = detectChain(address);
    const key = chain + ":" + (chain === "ethereum" ? address.toLowerCase() : address);
    if (!chain || seen.has(key) || addresses.length >= 60) continue;
    seen.add(key);
    addresses.push({ chain, address, source: String(a.source ?? "").slice(0, 200) });
  }
  const sources = (body.sources ?? [])
    .filter((s) => (s.kind === "exchange" || s.kind === "wallet") && s.name)
    .slice(0, 60)
    .map((s) => ({ kind: s.kind as string, name: String(s.name).slice(0, 80) }));
  const xpubs = (body.xpubs ?? []).map((x) => String(x).trim()).filter((x) => /^[xyz]pub[1-9A-HJ-NP-Za-km-z]{100,112}$/.test(x)).slice(0, 5);

  // Merge with anything sent before, so a family can send findings in several rounds.
  const prev = c.findings;
  const merged: Findings = {
    sentAt: new Date().toISOString(),
    addresses: [...(prev?.addresses ?? []), ...addresses].filter((a, i, arr) => arr.findIndex((b) => b.address.toLowerCase() === a.address.toLowerCase()) === i),
    sources: [...(prev?.sources ?? []), ...sources].filter((s, i, arr) => arr.findIndex((t) => t.name === s.name) === i),
    phraseFlags: (prev?.phraseFlags ?? 0) + Math.max(0, Math.min(99, Number(body.phraseFlags) || 0)),
    files: (prev?.files ?? 0) + Math.max(0, Math.min(999, Number(body.files) || 0)),
    xpubs: [...new Set([...(prev?.xpubs ?? []), ...xpubs])],
  };
  const saved = await updateCase(c.id, { findings: merged, next_followup_at: new Date().toISOString() });
  if (!saved) return NextResponse.json({error:"Could not save findings"},{status:500});
  if (c.firm_id) await startWatching({ ...c, findings: merged });
  await logEvent(c.id, "findings", `Family sent ${addresses.length} address(es), ${sources.length} exchange/wallet clue(s)${xpubs.length ? `, ${xpubs.length} wallet key(s)` : ""}.`);
  return NextResponse.json({ ok: true, total: merged.addresses.length });
}
