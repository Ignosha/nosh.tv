// Daily closing prices over a date range from Coinbase Exchange public candles (free, no key).
import { getJson, type Asset } from "./chains";

const PRODUCT: Partial<Record<Asset, string>> = { BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", POL: "POL-USD", USDT: "USDT-USD" };
const DAY = 86400000;

/** Map of YYYY-MM-DD → daily close in USD (UTC days). Missing days are simply absent. */
export async function dailyCloses(asset: Asset, from: string, to: string): Promise<{ closes: Map<string, number>; source: string }> {
  const product = PRODUCT[asset];
  const closes = new Map<string, number>();
  if (asset === "USDC") return { closes, source: "USDC is treated at face value only where noted" };
  if (!product) return { closes, source: "No free daily price source" };
  const start = Date.parse(from + "T00:00:00Z");
  const end = Date.parse(to + "T00:00:00Z") + DAY;
  const chunks: [number, number][] = [];
  for (let s = start; s < end; s += 299 * DAY) chunks.push([s, Math.min(end, s + 299 * DAY)]);
  // Coinbase allows a few requests per second; read chunks in small batches.
  for (let i = 0; i < chunks.length; i += 3) {
    await Promise.all(
      chunks.slice(i, i + 3).map(async ([s, e]) => {
        const rows = await getJson<number[][]>(
          `https://api.exchange.coinbase.com/products/${product}/candles?granularity=86400&start=${new Date(s).toISOString()}&end=${new Date(e).toISOString()}`,
        ).catch(() => [] as number[][]);
        for (const r of rows) closes.set(new Date(r[0] * 1000).toISOString().slice(0, 10), r[4]);
      }),
    );
  }
  return { closes, source: `Coinbase ${product} daily close (UTC)` };
}

export const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
