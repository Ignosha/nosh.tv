// Runs in the browser. Finds crypto clues in document text without sending it anywhere.
import { bech32, bech32m, createBase58check, base58 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";
import { wordlist } from "@scure/bip39/wordlists/english";

export type Chain = "bitcoin" | "ethereum" | "solana";

export type Clue =
  | { kind: "address"; chain: Chain; address: string; file: string; line: number; snippet: string }
  | { kind: "exchange" | "wallet"; name: string; file: string; line: number; snippet: string }
  | { kind: "phrase"; words: number; file: string; line: number };

const b58check = createBase58check(sha256);
const BIP39 = new Set(wordlist);

export function isBitcoinAddress(a: string): boolean {
  if (/^bc1/i.test(a)) {
    const lower = a.toLowerCase();
    const v0 = bech32.decodeUnsafe(lower, 90);
    if (v0 && v0.words[0] === 0) return true;
    const v1 = bech32m.decodeUnsafe(lower, 90);
    return !!v1 && v1.words[0] >= 1 && v1.words[0] <= 16;
  }
  if (!/^[13]/.test(a)) return false;
  try {
    const payload = b58check.decode(a);
    return payload.length === 21 && (payload[0] === 0x00 || payload[0] === 0x05);
  } catch {
    return false;
  }
}

export function isEthereumAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(a);
}

export function isSolanaAddress(a: string): boolean {
  if (a.length < 32 || a.length > 44) return false;
  try {
    return base58.decode(a).length === 32;
  } catch {
    return false;
  }
}

export function detectChain(a: string): Chain | null {
  const s = a.trim();
  if (isEthereumAddress(s)) return "ethereum";
  if (isBitcoinAddress(s)) return "bitcoin";
  if (isSolanaAddress(s)) return "solana";
  return null;
}

// Patterns are specific on purpose: "Ledger", "Gemini" or "Exodus" alone are ordinary words.
const SOURCES: { kind: "exchange" | "wallet"; name: string; re: RegExp }[] = [
  { kind: "exchange", name: "Coinbase", re: /\bcoinbase(?!\s*wallet)\b/i },
  { kind: "exchange", name: "Kraken", re: /\bkraken(\.com)?\b/i },
  { kind: "exchange", name: "Binance", re: /\bbinance(\.us|\.com)?\b/i },
  { kind: "exchange", name: "Gemini", re: /\bgemini\.com\b|\bgemini (trust|exchange|earn)\b/i },
  { kind: "exchange", name: "Crypto.com", re: /\bcrypto\.com\b/i },
  { kind: "exchange", name: "Bitstamp", re: /\bbitstamp\b/i },
  { kind: "exchange", name: "KuCoin", re: /\bkucoin\b/i },
  { kind: "exchange", name: "Bitfinex", re: /\bbitfinex\b/i },
  { kind: "exchange", name: "OKX", re: /\bokx(\.com)?\b/i },
  { kind: "exchange", name: "Bybit", re: /\bbybit\b/i },
  { kind: "exchange", name: "Uphold", re: /\buphold(\.com)?\b/i },
  { kind: "exchange", name: "eToro", re: /\betoro\b/i },
  { kind: "exchange", name: "Robinhood (crypto)", re: /\brobinhood crypto\b|\brobinhood\b.{0,40}\b(bitcoin|btc|crypto|eth)\b/i },
  { kind: "exchange", name: "Cash App (bitcoin)", re: /\bcash ?app\b.{0,40}\b(bitcoin|btc)\b|\b(bitcoin|btc)\b.{0,40}\bcash ?app\b/i },
  { kind: "exchange", name: "PayPal / Venmo crypto", re: /\b(paypal|venmo)\b.{0,40}\b(crypto|bitcoin|btc|eth)\b/i },
  { kind: "exchange", name: "Strike", re: /\bstrike\.me\b/i },
  { kind: "exchange", name: "River", re: /\briver\.com\b|\briver financial\b/i },
  { kind: "exchange", name: "Swan Bitcoin", re: /\bswan ?bitcoin\b|\bswanbitcoin\.com\b/i },
  { kind: "exchange", name: "Blockchain.com", re: /\bblockchain\.com\b|\bblockchain\.info\b/i },
  { kind: "wallet", name: "Ledger hardware wallet", re: /\bledger (nano|live|stax|flex)\b|\bledger\.com\b/i },
  { kind: "wallet", name: "Trezor hardware wallet", re: /\btrezor\b/i },
  { kind: "wallet", name: "MetaMask", re: /\bmeta ?mask\b/i },
  { kind: "wallet", name: "Exodus", re: /\bexodus (wallet|\.com)\b|\bexodus\.com\b/i },
  { kind: "wallet", name: "Electrum", re: /\belectrum\b/i },
  { kind: "wallet", name: "Trust Wallet", re: /\btrust ?wallet\b/i },
  { kind: "wallet", name: "Phantom", re: /\bphantom (wallet|\.app)\b|\bphantom\.app\b/i },
  { kind: "wallet", name: "Coinbase Wallet", re: /\bcoinbase wallet\b/i },
  { kind: "wallet", name: "BlueWallet", re: /\bblue ?wallet\b/i },
  { kind: "wallet", name: "Sparrow", re: /\bsparrow wallet\b/i },
  { kind: "wallet", name: "Keystone", re: /\bkeystone (wallet|hardware)\b/i },
  { kind: "wallet", name: "Wallet backup file", re: /\bwallet\.dat\b|\bkeystore\b|\bUTC--\d{4}-/i },
];

const ETH_RE = /(?<![0-9a-zA-Z])0x[0-9a-fA-F]{40}(?![0-9a-zA-Z])/g;
const BTC_RE = /(?<![0-9a-zA-Z])(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})(?![0-9a-zA-Z])/gi;
const B58_RE = /(?<![0-9a-zA-Z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![0-9a-zA-Z])/g;
const SOLANA_HINT = /\b(solana|phantom|solflare|backpack|\bSOL\b)/i;

function lineAt(starts: number[], index: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function snippetAround(text: string, index: number, length: number): string {
  const from = Math.max(0, index - 50);
  const to = Math.min(text.length, index + length + 50);
  return (from > 0 ? "…" : "") + text.slice(from, to).replace(/\s+/g, " ").trim() + (to < text.length ? "…" : "");
}

export function extractClues(file: string, text: string): Clue[] {
  const clues: Clue[] = [];
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  const seen = new Set<string>();

  for (const m of text.matchAll(ETH_RE)) {
    const address = m[0];
    const key = "ethereum:" + address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clues.push({ kind: "address", chain: "ethereum", address, file, line: lineAt(starts, m.index!), snippet: snippetAround(text, m.index!, address.length) });
  }

  for (const m of text.matchAll(BTC_RE)) {
    const address = m[0];
    if (!isBitcoinAddress(address)) continue;
    const key = "bitcoin:" + address;
    if (seen.has(key)) continue;
    seen.add(key);
    clues.push({ kind: "address", chain: "bitcoin", address, file, line: lineAt(starts, m.index!), snippet: snippetAround(text, m.index!, address.length) });
  }

  // Random base58 strings are common, so Solana is only searched when the text mentions it.
  if (SOLANA_HINT.test(text)) {
    for (const m of text.matchAll(B58_RE)) {
      const address = m[0];
      if (isBitcoinAddress(address) || !isSolanaAddress(address)) continue;
      const key = "solana:" + address;
      if (seen.has(key)) continue;
      seen.add(key);
      clues.push({ kind: "address", chain: "solana", address, file, line: lineAt(starts, m.index!), snippet: snippetAround(text, m.index!, address.length) });
    }
  }

  for (const source of SOURCES) {
    const m = source.re.exec(text);
    if (!m) continue;
    clues.push({ kind: source.kind, name: source.name, file, line: lineAt(starts, m.index), snippet: snippetAround(text, m.index, m[0].length) });
  }

  // A run of 12+ consecutive BIP39 words may be a recovery phrase. It is never displayed or sent.
  const tokenRe = /[A-Za-z]+/g;
  let run: { start: number; count: number } | null = null;
  const flush = () => {
    if (run && run.count >= 12) clues.push({ kind: "phrase", words: run.count, file, line: lineAt(starts, run.start) });
    run = null;
  };
  for (const m of text.matchAll(tokenRe)) {
    if (BIP39.has(m[0].toLowerCase()) && m[0].length >= 3) {
      if (run) run.count++;
      else run = { start: m.index!, count: 1 };
    } else {
      flush();
    }
  }
  flush();

  return clues;
}

/** True when the text contains 12 or more consecutive BIP39 words (a likely recovery phrase). */
export function hasSeedPhrase(text: string): boolean {
  let run = 0;
  for (const m of text.matchAll(/[A-Za-z]+/g)) {
    if (BIP39.has(m[0].toLowerCase())) {
      if (++run >= 12) return true;
    } else run = 0;
  }
  return false;
}

/** True when the text contains an extended private key or a WIF private key. */
export function hasPrivateKey(text: string): boolean {
  return /\b[xyz]prv[1-9A-HJ-NP-Za-km-z]{100,112}\b/.test(text) || /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/.test(text);
}
