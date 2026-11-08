// Server-only. Scans every address derived from a Bitcoin extended public key (xpub / ypub / zpub).
// A public key can only see balances; it can never spend. Reads come from Blockstream Esplora.
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import { getJson } from "./chains";

const ESPLORA = "https://blockstream.info/api";
const GAP = 20; // stop a chain after this many unused addresses in a row
const MAX_PER_CHAIN = 200;

type Kind = "legacy" | "nested-segwit" | "native-segwit" | "taproot";
const VERSIONS: Record<string, { public: number; kinds: Kind[] }> = {
  xpub: { public: 0x0488b21e, kinds: ["native-segwit", "legacy", "taproot"] },
  ypub: { public: 0x049d7cb2, kinds: ["nested-segwit"] },
  zpub: { public: 0x04b24746, kinds: ["native-segwit"] },
};

export const KIND_LABEL: Record<Kind, string> = {
  legacy: "Legacy (1…)",
  "nested-segwit": "Nested SegWit (3…)",
  "native-segwit": "Native SegWit (bc1q…)",
  taproot: "Taproot (bc1p…)",
};

export type XpubAddress = { address: string; path: string; kind: Kind; txCount: number; sats: number };
export type XpubScan = {
  ok: boolean;
  error?: string;
  prefix?: string;
  scanned: number;
  used: XpubAddress[];
  totalSats: number;
  kindsWithActivity: Kind[];
};

function addressFor(kind: Kind, pub: Uint8Array): string {
  if (kind === "legacy") return btc.p2pkh(pub).address!;
  if (kind === "native-segwit") return btc.p2wpkh(pub).address!;
  if (kind === "nested-segwit") return btc.p2sh(btc.p2wpkh(pub)).address!;
  return btc.p2tr(pub.slice(1)).address!;
}

type EsploraAddress = { chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number } };

async function scanChain(root: HDKey, kind: Kind, change: 0 | 1, found: XpubAddress[]): Promise<{ scanned: number; usedCount: number }> {
  let gap = 0;
  let index = 0;
  let usedCount = 0;
  const node = root.deriveChild(change);
  while (gap < GAP && index < MAX_PER_CHAIN) {
    const batch = Array.from({ length: 10 }, (_, k) => index + k);
    const infos = await Promise.all(
      batch.map(async (i) => {
        const address = addressFor(kind, node.deriveChild(i).publicKey!);
        const a = await getJson<EsploraAddress>(`${ESPLORA}/address/${address}`);
        return { i, address, a };
      }),
    );
    for (const { i, address, a } of infos) {
      if (a.chain_stats.tx_count > 0) {
        gap = 0;
        usedCount++;
        found.push({
          address,
          path: `${change}/${i}`,
          kind,
          txCount: a.chain_stats.tx_count,
          sats: a.chain_stats.funded_txo_sum - a.chain_stats.spent_txo_sum,
        });
      } else {
        gap++;
        if (gap >= GAP) break;
      }
    }
    index += batch.length;
  }
  return { scanned: index, usedCount };
}

export async function scanXpub(input: string): Promise<XpubScan> {
  const key = input.trim();
  const prefix = key.slice(0, 4);
  const v = VERSIONS[prefix];
  if (!v) return { ok: false, error: "Paste a Bitcoin xpub, ypub or zpub (mainnet).", scanned: 0, used: [], totalSats: 0, kindsWithActivity: [] };
  let root: HDKey;
  try {
    root = HDKey.fromExtendedKey(key, { private: 0, public: v.public });
  } catch {
    return { ok: false, error: "That extended public key is not valid.", scanned: 0, used: [], totalSats: 0, kindsWithActivity: [] };
  }
  if (root.privateKey) return { ok: false, error: "That is a private key. Never share it. Use the public key (xpub/ypub/zpub).", scanned: 0, used: [], totalSats: 0, kindsWithActivity: [] };

  const used: XpubAddress[] = [];
  let scanned = 0;
  const kindsWithActivity: Kind[] = [];
  try {
    for (const kind of v.kinds) {
      const r = await scanChain(root, kind, 0, used);
      scanned += r.scanned;
      // A type with no used receive addresses is not this wallet's type; skip its change chain.
      if (r.usedCount > 0) {
        kindsWithActivity.push(kind);
        scanned += (await scanChain(root, kind, 1, used)).scanned;
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `Blockstream did not answer: ${e.message}` : "Read failed.", prefix, scanned, used, totalSats: 0, kindsWithActivity };
  }
  return { ok: true, prefix, scanned, used, totalSats: used.reduce((s, a) => s + a.sats, 0), kindsWithActivity };
}
