import { getJson } from "./chains";
import { EXPLORERS, type EvmNetwork } from "./evmTrace";
export type TokenEvidence = {
  readAt: string;
  network: string;
  address: string;
  transfers: {
    transaction: string;
    timestamp: string;
    from: string;
    to: string;
    contract: string;
    symbol: string;
    raw: string;
    decimals: number | null;
    amount: string | null;
    source: string;
  }[];
  limits: string[];
};
export function decimalAmount(raw: string, decimals: number): string {
  if (
    !/^\d+$/.test(raw) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36
  )
    throw new Error("Invalid token quantity");
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
}
export async function tokenEvidence(
  address: string,
  network: EvmNetwork = "ethereum",
): Promise<TokenEvidence> {
  const root = EXPLORERS[network].url;
  const result: TokenEvidence = {
    readAt: new Date().toISOString(),
    network,
    address,
    transfers: [],
    limits: [
      "At most 50 recent ERC-20 transfers for the supplied address; not a complete token trace. No USD valuation, ownership inference, internal calls or bridge attribution. Token symbols and decimals are unverified explorer metadata; identify assets by contract.",
    ],
  };
  try {
    const page = await getJson<{
      items: {
        transaction_hash: string;
        timestamp: string;
        from: { hash: string };
        to: { hash: string };
        token: {
          address_hash: string;
          symbol: string | null;
          decimals: string | null;
        };
        total: { value: string; decimals?: string | null };
      }[];
      next_page_params: unknown;
    }>(`${root}/api/v2/addresses/${address}/token-transfers?type=ERC-20`);
    for (const t of page.items.slice(0, 50)) {
      if (
        !t.total?.value ||
        !/^\d+$/.test(t.total.value) ||
        !t.token?.address_hash
      )
        continue;
      const d = t.total.decimals ?? t.token.decimals;
      const decimals = d == null ? null : Number(d);
      result.transfers.push({
        transaction: t.transaction_hash,
        timestamp: t.timestamp,
        from: t.from.hash,
        to: t.to.hash,
        contract: t.token.address_hash,
        symbol: (t.token.symbol ?? "unknown").slice(0, 40),
        raw: t.total.value,
        decimals,
        amount:
          decimals !== null &&
          Number.isInteger(decimals) &&
          decimals >= 0 &&
          decimals <= 36
            ? decimalAmount(t.total.value, decimals)
            : null,
        source: `${root}/tx/${t.transaction_hash}`,
      });
    }
    if (page.next_page_params)
      result.limits.push(
        "More transfer history exists; this reading is truncated.",
      );
  } catch (e) {
    result.limits.push(
      `Unavailable: ${e instanceof Error ? e.message : "Explorer failed"}`,
    );
  }
  return result;
}
