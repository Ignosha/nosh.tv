import { NextResponse } from "next/server";
import { scanXpub } from "@/lib/xpub";
import { readAddress, priceNow, priceOnDate } from "@/lib/chains";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { xpub?: string; dateOfDeath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const scan = await scanXpub(String(body.xpub ?? ""));
  if (!scan.ok) return NextResponse.json({ error: scan.error }, { status: 400 });

  const date = body.dateOfDeath && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfDeath) ? body.dateOfDeath : null;
  let balanceAtDate: number | null = null;
  let atDateNote: string | undefined;
  if (date && scan.used.length) {
    // Rebuild each used address's balance at the end of that day (Bitcoin history is public and complete).
    const endOfDay = Date.parse(date + "T23:59:59Z") / 1000;
    const reads = [];
    for (let i = 0; i < scan.used.length; i += 4) {
      reads.push(...(await Promise.all(scan.used.slice(i, i + 4).map((a) => readAddress("bitcoin", a.address, endOfDay)))));
    }
    const missing = reads.filter((r) => !r.ok || r.holdings[0]?.balanceAtDate === null);
    if (missing.length === 0) balanceAtDate = reads.reduce((s, r) => s + (r.holdings[0]?.balanceAtDate ?? 0), 0);
    else atDateNote = `${missing.length} address${missing.length === 1 ? "" : "es"} could not be rebuilt for that date, so no total is shown.`;
  } else if (date) {
    balanceAtDate = 0;
  }

  const [now, atDate] = await Promise.all([priceNow("BTC"), date ? priceOnDate("BTC", date) : Promise.resolve(null)]);
  return NextResponse.json({ readAt: new Date().toISOString(), dateOfDeath: date, scan, balanceAtDate, atDateNote, price: { now, atDate } });
}
