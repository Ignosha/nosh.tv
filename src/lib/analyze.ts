// The case pipeline: read every address the family sent, value it live, and draft the report and letters.
// Every number comes from a live public source; anything that can't be read is listed as failed, never estimated.
import { readAddress, priceNow, priceOnDate, type Asset, type Price } from "./chains";
import { scanXpub } from "./xpub";
import { buildLetter } from "./letters";
import { generate, aiEnabled } from "./ai";
import { valuationLabel, type Case, type Report, type ReportRow, type Drafts } from "./cases";
import type { Chain } from "./extract";

const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function buildReport(c: Case): Promise<Report> {
  const date = c.date_of_death;
  const endOfDay = date ? Date.parse(date + "T23:59:59Z") / 1000 : null;

  const wanted = new Map<string, { chain: Chain; address: string }>();
  for (const a of c.findings?.addresses ?? []) {
    const chain = a.chain as Chain;
    wanted.set(chain + ":" + (chain === "ethereum" ? a.address.toLowerCase() : a.address), { chain, address: a.address });
  }
  // Hardware wallet keys: add every used address they derive.
  for (const x of c.findings?.xpubs ?? []) {
    const scan = await scanXpub(x);
    for (const u of scan.used) wanted.set("bitcoin:" + u.address, { chain: "bitcoin", address: u.address });
  }
  const list = [...wanted.values()].slice(0, 60);

  const reports = [];
  for (let i = 0; i < list.length; i += 4) {
    reports.push(...(await Promise.all(list.slice(i, i + 4).map((a) => readAddress(a.chain, a.address, endOfDay)))));
  }

  const assets = new Set<Asset>();
  for (const r of reports) for (const h of r.holdings) assets.add(h.asset);
  const prices: Record<string, { now: Price; atDate: Price | null }> = {};
  await Promise.all(
    [...assets].map(async (a) => {
      prices[a] = { now: await priceNow(a), atDate: date ? await priceOnDate(a, date) : null };
    }),
  );

  const rows: ReportRow[] = [];
  for (const r of reports) {
    if (!r.ok) continue;
    for (const h of r.holdings) {
      const p = prices[h.asset];
      rows.push({
        chain: r.chain,
        address: r.address,
        network: h.network,
        asset: h.asset,
        balanceNow: h.balanceNow,
        valueNow: p?.now.usd != null ? h.balanceNow * p.now.usd : null,
        balanceAtDate: h.balanceAtDate,
        valueAtDate: p?.atDate?.usd != null && h.balanceAtDate !== null ? h.balanceAtDate * p.atDate.usd : null,
        note: h.atDateNote,
        explorer: r.explorer,
      });
    }
  }
  const nonZeroAtDate = rows.filter((r) => !(r.balanceNow === 0 && r.balanceAtDate === 0));
  const atDateComplete = !!date && nonZeroAtDate.every((r) => r.valueAtDate !== null);
  const sources = Object.entries(prices).map(([a, p]) => `${a}: ${p.now.source}${p.atDate ? `; ${p.atDate.source}` : ""}`);

  return {
    readAt: new Date().toISOString(),
    dateOfDeath: date,
    rows,
    failed: reports.filter((r) => !r.ok).map((r) => ({ address: r.address, error: r.error ?? "Read failed" })),
    totalNow: rows.reduce((s, r) => s + (r.valueNow ?? 0), 0),
    totalAtDate: date && rows.some((r) => r.valueAtDate !== null) ? rows.reduce((s, r) => s + (r.valueAtDate ?? 0), 0) : null,
    atDateComplete,
    sources: [
      "Balances: Blockstream (Bitcoin), PublicNode (Ethereum, Base, Arbitrum, Optimism, Polygon), Solana mainnet RPC",
      ...sources,
    ],
  };
}

function templateSummary(c: Case, r: Report): string {
  const exchanges = (c.findings?.sources ?? []).filter((s) => s.kind === "exchange").map((s) => s.name);
  const wallets = (c.findings?.sources ?? []).filter((s) => s.kind === "wallet").map((s) => s.name);
  const funded = r.rows.filter((x) => x.balanceNow > 0);
  const lines = [
    `Findings for matter ${c.id.slice(0, 8)} (${c.matter_type ?? "estate"}), read ${r.readAt.slice(0, 16).replace("T", " ")} UTC.`,
    "",
    `Addresses read on the public ledger: ${new Set(r.rows.map((x) => x.address)).size}${r.failed.length ? ` (${r.failed.length} could not be read and are listed separately)` : ""}.`,
    `Value today: ${usd(r.totalNow)} across ${funded.length} holding${funded.length === 1 ? "" : "s"} with a balance.`,
    r.dateOfDeath
      ? r.totalAtDate !== null
        ? `Value on the ${valuationLabel(c.matter_type)} (${r.dateOfDeath}): ${usd(r.totalAtDate)}${r.atDateComplete ? "" : " (partial: some holdings have no historical reading; see notes)"}.`
        : `Value on the ${valuationLabel(c.matter_type)} (${r.dateOfDeath}): not available from free public sources for these holdings.`
      : "No valuation date was given, so only today's values are shown.",
    "",
    exchanges.length
      ? `Exchange accounts mentioned in the documents: ${exchanges.join(", ")}. Their balances are not visible on the public ledger; they are obtained through a records request, subpoena or deceased-account claim.`
      : "No exchange accounts were mentioned in the documents sent.",
    wallets.length ? `Wallet apps or devices mentioned: ${wallets.join(", ")}. Any device should be preserved, powered off and unchanged.` : "",
    c.findings?.phraseFlags
      ? `The scan flagged ${c.findings.phraseFlags} possible recovery phrase location${c.findings.phraseFlags === 1 ? "" : "s"} in the client's documents. These were not sent to us and must be handled offline.`
      : "",
    "",
    "Every figure above was read live from a named public source. This is a factual reading, not a legal or tax valuation.",
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

export async function buildDrafts(c: Case, r: Report): Promise<Drafts> {
  const base = templateSummary(c, r);
  let summary = base;
  let ai = false;
  if (aiEnabled()) {
    // Only the already-written factual summary is sent: no documents, addresses or phrases.
    const polished = await generate(
      "You rewrite a crypto asset findings summary for an attorney or fiduciary. Keep every number, date, name and fact exactly as given. Do not add facts, estimates or promises. Plain, precise, professional English, short paragraphs, no markdown headings. Keep the final sentence about sources.",
      [{ role: "user", text: base }],
      600,
    );
    if (polished && /\$/.test(polished) === /\$/.test(base)) {
      summary = polished;
      ai = true;
    }
  }

  const exchanges = [...new Set((c.findings?.sources ?? []).filter((s) => s.kind === "exchange").map((s) => s.name))];
  const role = c.role === "attorney" ? "Personal Representative" : "Executor";
  const letters = exchanges.map((exchange) => ({
    exchange,
    text: buildLetter({
      exchange: exchange.replace(/ \(.*\)$/, ""),
      decedent: "",
      dod: c.date_of_death ?? "",
      rep: c.role === "executor" ? c.name : "",
      role,
      repEmail: c.role === "executor" ? c.email : "",
      repPhone: c.role === "executor" ? c.phone ?? "" : "",
      request: "transfer",
      docs: ["Certified copy of the death certificate", "Letters testamentary / letters of administration", "Government-issued photo ID of the representative"],
    }),
  }));

  return { summary, letters, generatedAt: new Date().toISOString(), ai };
}
