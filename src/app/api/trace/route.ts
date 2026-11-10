import { NextResponse } from "next/server";
import { detectChain } from "@/lib/extract";
import { traceEthereum, EXPLORERS, type EvmNetwork } from "@/lib/evmTrace";
import { traceBitcoin } from "@/lib/trace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Public tracing preview: one hop from up to three Bitcoin addresses. Matters get the full map (three hops) in the case desk.
export async function POST(req: Request) {
  let body: { addresses?: string[]; since?: string; network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.addresses) || body.addresses.some(a => typeof a !== "string")) return NextResponse.json({error:"addresses must be an array of strings"},{status:400});
  const network = body.network ?? "bitcoin";
  if (network !== "bitcoin" && !Object.hasOwn(EXPLORERS, network)) return NextResponse.json({error:"Unknown network"},{status:400});
  const seeds = [...new Set((body.addresses ?? []).map((a) => String(a).trim()).filter((a) => detectChain(a) === (network === "bitcoin" ? "bitcoin" : "ethereum")))].slice(0, 3);
  if (!seeds.length) return NextResponse.json({ error: "Enter an address valid for the selected network." }, { status: 400 });
  const since = body.since && /^\d{4}-\d{2}-\d{2}$/.test(body.since) ? body.since : null;
  const trace = network === "bitcoin" ? await traceBitcoin(seeds, { hops: 1, since, maxNodes: 16, fanout: 5 }) : await traceEthereum(seeds, network as EvmNetwork, 1, since);
  return NextResponse.json(trace);
}
