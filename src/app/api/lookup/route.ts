import { NextResponse } from "next/server";
import { detectChain, type Chain } from "@/lib/extract";
import { readAddress, priceNow, priceOnDate, type Asset, type AddressReport, type Price } from "@/lib/chains";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ADDRESSES = 40;

type Body = { addresses?: { chain?: Chain; address?: string }[]; dateOfDeath?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  const date = body.dateOfDeath && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfDeath) ? body.dateOfDeath : null;
  if (date && Date.parse(date + "T00:00:00Z") > Date.now()) {
    return NextResponse.json({ error: "The date of death cannot be in the future." }, { status: 400 });
  }
  const endOfDay = date ? Date.parse(date + "T23:59:59Z") / 1000 : null;

  const wanted = new Map<string, { chain: Chain; address: string }>();
  for (const item of body.addresses ?? []) {
    const address = String(item.address ?? "").trim();
    const chain = detectChain(address);
    if (!chain) continue;
    wanted.set(chain + ":" + (chain === "ethereum" ? address.toLowerCase() : address), { chain, address });
  }
  const list = [...wanted.values()].slice(0, MAX_ADDRESSES);
  if (list.length === 0) return NextResponse.json({ error: "No valid Bitcoin, Ethereum or Solana addresses." }, { status: 400 });

  // A few at a time, to stay polite with free public endpoints.
  const reports: AddressReport[] = [];
  for (let i = 0; i < list.length; i += 4) {
    const batch = list.slice(i, i + 4);
    reports.push(...(await Promise.all(batch.map((a) => readAddress(a.chain, a.address, endOfDay)))));
  }

  const assets = new Set<Asset>();
  for (const r of reports) for (const h of r.holdings) assets.add(h.asset);
  const prices: Record<string, { now: Price; atDate: Price | null }> = {};
  await Promise.all(
    [...assets].map(async (asset) => {
      const [now, atDate] = await Promise.all([priceNow(asset), date ? priceOnDate(asset, date) : Promise.resolve(null)]);
      prices[asset] = { now, atDate };
    }),
  );

  return NextResponse.json({ readAt: new Date().toISOString(), dateOfDeath: date, reports, prices, skipped: wanted.size - list.length });
}
