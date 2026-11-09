import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase, valuationLabel } from "@/lib/cases";
import { matterRecord, extrasOf, btcAddresses } from "@/lib/record";
import { btcHistory, balanceSeries, type History } from "@/lib/btc";
import { BalanceChart } from "@/components/BalanceChart";
import { TraceMap, TraceTable } from "@/components/TraceMap";
import { PrintButton } from "@/components/PrintButton";
import { usd } from "@/lib/prices";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const amt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 8 });

export default async function Exhibits({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const r = c.report;
  if (!r) {
    return (
      <div className="wrap" style={{ padding: "48px 0" }}>
        <div className="notice warn">Run the analysis on the <Link href={`/admin/cases/${c.id}`}>matter page</Link> first. The exhibit pack is built from the report.</div>
      </div>
    );
  }
  const x = extrasOf(c);
  const sealed = await matterRecord(c);
  const label = valuationLabel(c.matter_type);
  const btc = btcAddresses(c).slice(0, 12);
  const histories = (await Promise.all(btc.map((a) => btcHistory(a, 8).catch(() => null)))).filter((h): h is History => !!h);
  let n = 1;
  const ex = () => `Exhibit ${n++}`;

  return (
    <div className="wrap" style={{ padding: "28px 0 96px" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <Link href={`/admin/cases/${c.id}`} className="fine">← Back to the matter</Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn btn-small" href={`/admin/cases/${c.id}/record`}>Download sealed record (.json)</a>
          <PrintButton />
        </div>
      </div>

      <div className="xpack">
        <section className="xpage">
          <div className="xlabel">Evidence package</div>
          <h2>Cryptocurrency asset findings</h2>
          <p>
            Matter {c.id.slice(0, 8)} · {c.matter_type ?? "estate"} · prepared for {c.name} ({c.role})
            <br />Valuation date ({label}): {c.date_of_death ?? "not given"} · Ledger read {r.readAt.slice(0, 16).replace("T", " ")} UTC
          </p>
          <div className="totals">
            <div><div className="label">Value today</div><div className="big">{usd(r.totalNow)}</div></div>
            <div><div className="label">On {label}</div><div className="big">{r.totalAtDate !== null ? usd(r.totalAtDate) : "—"}</div>{r.totalAtDate !== null && !r.atDateComplete ? <div className="fine">Partial</div> : null}</div>
            <div><div className="label">Addresses</div><div className="big">{new Set(r.rows.map((x) => x.address)).size}</div></div>
          </div>
          <p className="fine" style={{ marginTop: 16 }}>Record fingerprint (SHA-256, canonical sorted-key JSON):</p>
          <p className="fp">{sealed.fingerprint.value}</p>
          <p className="fine">Anyone can recompute this fingerprint from the sealed record at {"/verify"} or with any SHA-256 tool. If a single figure changes, it will not match.</p>
          <ol className="fine" style={{ paddingLeft: 18 }}>
            <li>Summary of holdings</li>
            {histories.length ? <li>Balance history, by Bitcoin address</li> : null}
            {x.trace ? <li>Tracing map</li> : null}
            {x.costBasis ? <li>Cost-basis schedule</li> : null}
            {x.dissipation ? <li>Dissipation analysis</li> : null}
            {x.alerts?.length ? <li>Asset-movement alerts</li> : null}
            <li>Methodology</li>
            <li>Declaration (template)</li>
          </ol>
        </section>

        <section className="xpage">
          <div className="xlabel">{ex()}</div>
          <h2>Summary of holdings</h2>
          <div className="table-scroll">
            <table className="clue-table">
              <thead><tr><th>Address</th><th>Asset</th><th style={{ textAlign: "right" }}>Balance today</th><th style={{ textAlign: "right" }}>Value today</th><th style={{ textAlign: "right" }}>On {label}</th><th style={{ textAlign: "right" }}>Value</th></tr></thead>
              <tbody>
                {r.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>{row.address}{row.note ? <div className="snippet">{row.note}</div> : null}</td>
                    <td className="mono">{row.asset}<div className="snippet">{row.network}</div></td>
                    <td className="num">{amt(row.balanceNow)}</td>
                    <td className="num">{row.valueNow === null ? "—" : usd(row.valueNow)}</td>
                    <td className="num">{row.balanceAtDate === null ? "—" : amt(row.balanceAtDate)}</td>
                    <td className="num">{row.valueAtDate === null ? "—" : usd(row.valueAtDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.failed.length ? <p className="fine">Could not be read at the time of this report: {r.failed.map((f) => f.address).join(", ")}.</p> : null}
          <p className="fine">Sources: {r.sources.join(" · ")}</p>
        </section>

        {histories.length ? (
          <section className="xpage">
            <div className="xlabel">{ex()}</div>
            <h2>Balance history</h2>
            <p className="fine" style={{ marginTop: 0 }}>Balance after each confirmed transaction, rebuilt from the public Bitcoin ledger (Blockstream). The dashed line marks the {label}.</p>
            {histories.map((h) => (
              <div key={h.address} style={{ marginTop: 18 }}>
                <div className="mono" style={{ fontSize: 12.5, wordBreak: "break-all" }}>{h.address}</div>
                <div className="fine">{h.txCount} transactions · balance today {amt(h.balance)} BTC{h.complete ? "" : ` · chart shows the latest ${h.flows.length} transactions only`}</div>
                {h.complete ? <BalanceChart series={balanceSeries(h)} markDate={c.date_of_death} /> : <p className="fine">Too much history to rebuild from the free index; the summary balance above is exact.</p>}
              </div>
            ))}
          </section>
        ) : null}

        {x.trace ? (
          <section className="xpage">
            <div className="xlabel">{ex()}</div>
            <h2>Tracing map</h2>
            <p className="fine" style={{ marginTop: 0 }}>Funds followed from the known addresses{ x.trace.since ? ` on or after ${x.trace.since}` : ""}. Addresses spent together in one transaction are grouped as likely the same owner. Addresses with very large transaction counts are treated as exchanges or custodians, where records must be requested. Read {x.trace.readAt.slice(0, 16).replace("T", " ")} UTC.</p>
            <TraceMap trace={x.trace} />
            <div style={{ marginTop: 14 }}><TraceTable trace={x.trace} /></div>
            {x.trace.limits.length ? <p className="fine">Limits: {x.trace.limits.join(" ")}</p> : null}
          </section>
        ) : null}

        {x.costBasis ? (
          <section className="xpage">
            <div className="xlabel">{ex()}</div>
            <h2>Cost-basis schedule</h2>
            <p className="fine" style={{ marginTop: 0 }}>
              Each receipt into the subject&rsquo;s wallets is a lot, valued at the daily close on the day received; transfers out are matched first-in, first-out. Moves between the matter&rsquo;s own addresses are excluded. Purchase prices on exchange records may differ and should replace these where available. For an estate, basis generally steps to the date-of-death value (26 U.S.C. §1014); for transfers between spouses incident to divorce, basis generally carries over (26 U.S.C. §1041). The tax treatment is for counsel or a CPA.
            </p>
            <div className="totals">
              <div><div className="label">Still held</div><div className="big">{amt(x.costBasis.heldBtc)} BTC</div></div>
              <div><div className="label">Basis of held lots</div><div className="big">{x.costBasis.heldBasis !== null ? usd(x.costBasis.heldBasis) : "—"}</div></div>
              <div><div className="label">Gain on transfers out</div><div className="big">{x.costBasis.realizedGain !== null ? usd(x.costBasis.realizedGain) : "—"}</div></div>
            </div>
            <div className="table-scroll" style={{ marginTop: 14 }}>
              <table className="clue-table">
                <thead><tr><th>Received</th><th style={{ textAlign: "right" }}>BTC</th><th style={{ textAlign: "right" }}>Close</th><th style={{ textAlign: "right" }}>Basis</th><th style={{ textAlign: "right" }}>Still held</th><th>Transaction</th></tr></thead>
                <tbody>
                  {x.costBasis.lots.slice(-150).map((l) => (
                    <tr key={l.txid}>
                      <td className="mono" style={{ fontSize: 12 }}>{l.date}</td>
                      <td className="num">{amt(l.btc)}</td>
                      <td className="num">{l.price !== null ? usd(l.price) : "—"}</td>
                      <td className="num">{l.basis !== null ? usd(l.basis) : "—"}</td>
                      <td className="num">{amt(l.remaining)}</td>
                      <td><a className="addr" href={`https://blockstream.info/tx/${l.txid}`}>{l.txid.slice(0, 14)}…</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {x.costBasis.incomplete.length ? <p className="fine">Limits: {x.costBasis.incomplete.join(" ")}</p> : null}
            <p className="fine">Sources: {x.costBasis.source}</p>
          </section>
        ) : null}

        {x.dissipation ? (
          <section className="xpage">
            <div className="xlabel">{ex()}</div>
            <h2>Dissipation analysis</h2>
            <p className="fine" style={{ marginTop: 0 }}>Every transfer out of the subject&rsquo;s Bitcoin wallets from {x.dissipation.lookbackFrom} (look-back) through today, with the key date {x.dissipation.keyDate}. Each is valued at the daily close on the day sent. Whether a transfer was dissipation is a question for the court.</p>
            <div className="totals">
              <div><div className="label">Out in look-back</div><div className="big">{usd(x.dissipation.totalLookbackUsd)}</div></div>
              <div><div className="label">Out after {x.dissipation.keyDate}</div><div className="big">{usd(x.dissipation.totalAfterUsd)}</div></div>
              <div><div className="label">Total BTC out</div><div className="big">{amt(x.dissipation.totalBtc)}</div></div>
            </div>
            <div className="table-scroll" style={{ marginTop: 14 }}>
              <table className="clue-table">
                <thead><tr><th>Date</th><th>Window</th><th style={{ textAlign: "right" }}>BTC</th><th style={{ textAlign: "right" }}>Value</th><th>Sent to</th><th>Transaction</th></tr></thead>
                <tbody>
                  {x.dissipation.outflows.map((o) => (
                    <tr key={o.txid}>
                      <td className="mono" style={{ fontSize: 12 }}>{o.date}</td>
                      <td>{o.window === "after" ? <span className="stamp stamp-none">After</span> : <span className="stamp stamp-pending">Look-back</span>}</td>
                      <td className="num">{amt(o.btc)}</td>
                      <td className="num">{o.usd !== null ? usd(o.usd) : "—"}</td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{o.to.map((a) => a.slice(0, 12) + "…").join(", ")}</td>
                      <td><a className="addr" href={`https://blockstream.info/tx/${o.txid}`}>{o.txid.slice(0, 14)}…</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {x.dissipation.outflows.length === 0 ? <p className="fine">No transfers out in this window.</p> : null}
            {x.dissipation.incomplete.length ? <p className="fine">Limits: {x.dissipation.incomplete.join(" ")}</p> : null}
            <p className="fine">Sources: {x.dissipation.source}</p>
          </section>
        ) : null}

        {x.alerts?.length ? (
          <section className="xpage">
            <div className="xlabel">{ex()}</div>
            <h2>Asset-movement alerts</h2>
            {(x.alerts as { record: { detectedAt: string; movements: { address: string; changes: { holding: string; before: number; after: number }[]; newTxs: number | null }[] }; fingerprint: { value: string } }[]).map((a) => (
              <div key={a.fingerprint.value} style={{ marginTop: 12 }}>
                <b>{a.record.detectedAt.slice(0, 16).replace("T", " ")} UTC</b>
                {a.record.movements.map((m) => (
                  <div key={m.address} className="fine"><span className="mono">{m.address}</span>: {m.changes.map((ch) => `${ch.holding} ${amt(ch.before)} → ${amt(ch.after)}`).join("; ")}{m.newTxs ? `; ${m.newTxs} new transaction(s)` : ""}</div>
                ))}
                <div className="fp">{a.fingerprint.value}</div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="xpage">
          <div className="xlabel">{ex()}</div>
          <h2>Methodology</h2>
          <ol style={{ paddingLeft: 18, display: "grid", gap: 8 }}>
            <li><b>Identification.</b> Addresses and exchange accounts were identified from documents, bank and card statements (scanned for 24 exchanges, apps and ATM operators, including the legal entity names they bill under), and hardware-wallet extended public keys, from which every used address was derived (BIP32/44/49/84, gap limit 20).</li>
            <li><b>Reading.</b> Each address was read directly from public infrastructure: Bitcoin from Blockstream Esplora; Ethereum, Base, Arbitrum, Optimism and Polygon from PublicNode RPC endpoints (native coin plus USDC and USDT at their verified contracts); Solana from the public mainnet RPC.</li>
            <li><b>Valuation date balances.</b> Bitcoin balances on the valuation date were rebuilt by reversing every confirmed transaction after 23:59:59 UTC on that date. Where a free source cannot show a historical balance (EVM and Solana), the report says so rather than estimating.</li>
            <li><b>Prices.</b> Daily closing prices (UTC) from Coinbase Exchange public candles; USDC from CoinGecko. Each figure names its source.</li>
            <li><b>Tracing.</b> Funds were followed transaction by transaction. Inputs spent together in one transaction were grouped as likely the same owner (the common-input heuristic); batches with more than 20 inputs were not grouped, as they are typical of exchange sweeps and CoinJoins. Addresses with 400 or more transactions were treated as services, where tracing stops and records must be requested.</li>
            <li><b>Integrity.</b> The complete record was serialized as canonical JSON (keys sorted) and fingerprinted with SHA-256. The fingerprint on the cover page identifies this exact record.</li>
            <li><b>Limits.</b> Public ledgers do not show exchange account balances, the identity of address owners, or off-chain transfers. Those require records from the exchange. This is a factual reading, not a legal or tax opinion.</li>
          </ol>
        </section>

        <section className="xpage">
          <div className="xlabel">{ex()}</div>
          <h2>Declaration (template)</h2>
          <pre className="letter" style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{`DECLARATION OF [NAME]

I, [name], declare:

1. I am [title] at TraceSworn. I have personal knowledge of the facts in this declaration and, if called as a witness, could and would testify competently to them.

2. At the request of [counsel / fiduciary], I identified and read the cryptocurrency addresses listed in Exhibit 1 of the attached Evidence Package for the matter of [case name and number].

3. The balances and transactions in the Evidence Package were read directly from the public blockchain sources named in the Methodology exhibit on ${r.readAt.slice(0, 10)}, and valued as of ${c.date_of_death ?? "[valuation date]"} using the daily closing prices named there.

4. The Evidence Package is a true and correct copy of the record I prepared. Its SHA-256 fingerprint is:
   ${sealed.fingerprint.value}
   Any alteration to the record would change this fingerprint.

I declare under penalty of perjury under the laws of [the United States of America / the State of ___] that the foregoing is true and correct.

Executed on [date] at [city, state].

______________________________
[Name]`}</pre>
          <p className="fine">Template only. Counsel should adapt it to the court and jurisdiction (for federal courts, 28 U.S.C. §1746).</p>
        </section>
      </div>
    </div>
  );
}
