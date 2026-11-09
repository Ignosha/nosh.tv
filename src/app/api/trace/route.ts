import { NextResponse } from "next/server";
import { detectChain } from "@/lib/extract";
import { traceBitcoin } from "@/lib/trace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Public tracing preview: one hop from up to three Bitcoin addresses. Matters get the full map (three hops) in the case desk.
export async function POST(req: Request) {
  let body: { addresses?: string[]; since?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const seeds = [...new Set((body.addresses ?? []).map((a) => String(a).trim()).filter((a) => detectChain(a) === "bitcoin"))].slice(0, 3);
  if (!seeds.length) return NextResponse.json({ error: "Enter at least one Bitcoin address. Tracing currently follows Bitcoin." }, { status: 400 });
  const since = body.since && /^\d{4}-\d{2}-\d{2}$/.test(body.since) ? body.since : null;
  const trace = await traceBitcoin(seeds, { hops: 1, since, maxNodes: 16, fanout: 5 });
  return NextResponse.json(trace);
}
