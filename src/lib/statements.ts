// Finds crypto exchange transactions in bank and card statements (CSV, PDF text, exports).
// Runs in the browser. Each match is a candidate to verify against the statement, never a conclusion.

// Descriptor patterns as they commonly appear on US bank and card statements, including the
// legal entity names exchanges bill under (e.g. Kraken = Payward, Binance.US = BAM Trading).
const VENUES: { name: string; re: RegExp }[] = [
  { name: "Coinbase", re: /\bcoinbase\b|\bcb\.com\b/i },
  { name: "Kraken", re: /\bkraken\b|\bpayward\b/i },
  { name: "Binance.US", re: /\bbinance\b|\bbam trading\b/i },
  { name: "Gemini", re: /\bgemini (trust|exchange)\b|\bgemini\.com\b/i },
  { name: "Crypto.com", re: /\bcrypto\.com\b|\bforis dax\b/i },
  { name: "Robinhood", re: /\brobinhood\b/i },
  { name: "Cash App (bitcoin)", re: /\bcash ?app\b.*\b(btc|bitcoin)\b|\b(btc|bitcoin)\b.*\bcash ?app\b/i },
  { name: "PayPal / Venmo crypto", re: /\b(paypal|venmo)\b.*\bcrypto\b/i },
  { name: "Strike", re: /\bstrike\.me\b|\bzap solutions\b/i },
  { name: "River", re: /\briver financial\b|\briver\.com\b/i },
  { name: "Swan Bitcoin", re: /\bswan ?bitcoin\b|\belectric solidus\b/i },
  { name: "Uphold", re: /\buphold\b/i },
  { name: "Bitstamp", re: /\bbitstamp\b/i },
  { name: "KuCoin", re: /\bkucoin\b/i },
  { name: "OKX", re: /\bokx\b|\bokcoin\b/i },
  { name: "Bybit", re: /\bbybit\b/i },
  { name: "MoonPay", re: /\bmoonpay\b/i },
  { name: "Transak", re: /\btransak\b/i },
  { name: "Ramp", re: /\bramp network\b|\bramp\.network\b/i },
  { name: "BitPay", re: /\bbitpay\b/i },
  { name: "Paxos", re: /\bpaxos\b/i },
  { name: "Blockchain.com", re: /\bblockchain\.com\b/i },
  { name: "eToro", re: /\betoro\b/i },
  { name: "Bitcoin ATM", re: /\b(bitcoin depot|coinflip|athena bitcoin|coinme|bitcoin atm|btm)\b/i },
];

const MONEY = /(?<![\d.])-?\(?\$?\s?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\)?(?![\d])/g;
const DATES = [
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2}),? (\d{4})\b/i,
];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export type StatementHit = {
  venue: string;
  file: string;
  line: number;
  date: string | null; // YYYY-MM-DD
  amount: number | null; // absolute value
  direction: "to-exchange" | "from-exchange" | "unknown";
  text: string;
};

function parseDate(line: string): string | null {
  let m = line.match(DATES[0]);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = line.match(DATES[1]);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = line.match(DATES[2]);
  if (m) return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

function parseAmount(raw: string): { value: number; negative: boolean } {
  const negative = /-|\(/.test(raw);
  return { value: Number(raw.replace(/[^\d.]/g, "")), negative };
}

export function scanStatement(file: string, text: string): StatementHit[] {
  const hits: StatementHit[] = [];
  text.split(/\r?\n/).forEach((rawLine: string, i: number) => {
    const line: string = rawLine.replace(/\s+/g, " ").trim();
    if (!line) return;
    const venue = VENUES.find((v) => v.re.test(line));
    if (!venue) return;
    const amounts = line.match(MONEY) ?? [];
    // The first money figure on a statement line is normally the transaction; later ones are balances.
    const first = amounts[0] !== undefined ? parseAmount(amounts[0]) : null;
    let direction: StatementHit["direction"] = "unknown";
    if (/\b(withdrawal|debit|purchase|pos|ach debit|payment to|transfer to|sent)\b/i.test(line) || first?.negative) direction = "to-exchange";
    else if (/\b(deposit|credit|ach credit|transfer from|received|payout)\b/i.test(line)) direction = "from-exchange";
    hits.push({
      venue: venue.name,
      file,
      line: i + 1,
      date: parseDate(line),
      amount: first && first.value > 0 ? first.value : null,
      direction,
      text: line.slice(0, 220),
    });
  });
  return hits;
}

export type VenueSummary = {
  venue: string;
  count: number;
  toExchange: number;
  fromExchange: number;
  unknown: number;
  first: string | null;
  last: string | null;
};

export function summarize(hits: StatementHit[]): VenueSummary[] {
  const map = new Map<string, VenueSummary>();
  for (const h of hits) {
    const s = map.get(h.venue) ?? { venue: h.venue, count: 0, toExchange: 0, fromExchange: 0, unknown: 0, first: null, last: null };
    s.count++;
    const amt = h.amount ?? 0;
    if (h.direction === "to-exchange") s.toExchange += amt;
    else if (h.direction === "from-exchange") s.fromExchange += amt;
    else s.unknown += amt;
    if (h.date) {
      if (!s.first || h.date < s.first) s.first = h.date;
      if (!s.last || h.date > s.last) s.last = h.date;
    }
    map.set(h.venue, s);
  }
  return [...map.values()].sort((a, b) => b.toExchange + b.unknown - (a.toExchange + a.unknown));
}
