import type { Trace, TraceNode } from "@/lib/trace";

const W = 230;
const H = 46;
const COL = 300;
const ROW = 62;

const COLORS: Record<TraceNode["kind"], { fill: string; stroke: string; label: string }> = {
  seed: { fill: "var(--accent-soft)", stroke: "var(--accent)", label: "Known address" },
  "same-owner": { fill: "var(--sage)", stroke: "var(--found)", label: "Same owner (spent together)" },
  destination: { fill: "var(--card)", stroke: "var(--ink-3)", label: "Funds sent here" },
  service: { fill: "var(--clay)", stroke: "var(--pending)", label: "Exchange or custodian (stop)" },
};

const short = (a: string) => a.slice(0, 10) + "…" + a.slice(-6);
const btc = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 3 });

/** Follow-the-money diagram: one column per hop, edges are real transactions with BTC totals. */
export function TraceMap({ trace }: { trace: Trace }) {
  const cols = new Map<number, TraceNode[]>();
  for (const n of trace.nodes) {
    const c = n.kind === "same-owner" ? n.hop : n.hop;
    cols.set(c, [...(cols.get(c) ?? []), n]);
  }
  // Within a column: seeds, then same-owner, then destinations, then services.
  const order = { seed: 0, "same-owner": 1, destination: 2, service: 3 } as const;
  const pos = new Map<string, { x: number; y: number }>();
  let maxRows = 1;
  for (const [c, list] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => order[a.kind] - order[b.kind]);
    maxRows = Math.max(maxRows, list.length);
    list.forEach((n, i) => pos.set(n.address, { x: 20 + c * COL, y: 34 + i * ROW }));
  }
  const width = 20 + (Math.max(...cols.keys(), 0) + 1) * COL - (COL - W) + 20;
  const height = 34 + maxRows * ROW + 10;
  const maxBtc = Math.max(...trace.edges.map((e) => e.btc), 1e-8);

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "0 0 10px" }}>
        {Object.values(COLORS).map((c) => (
          <span key={c.label} className="fine" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: c.fill, border: `1.5px solid ${c.stroke}`, display: "inline-block" }} />
            {c.label}
          </span>
        ))}
      </div>
      <div className="table-scroll" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--paper)" }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tracing map of ${trace.nodes.length} addresses and ${trace.edges.length} transfers`} style={{ display: "block" }}>
          <text x={20} y={20} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">
            {[...cols.keys()].sort().map((c) => `Hop ${c}`).join("   ·   ")}
          </text>
          {trace.edges.map((e) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2;
            const mx = (x1 + x2) / 2;
            const sw = 1 + 4 * Math.sqrt(e.btc / maxBtc);
            return (
              <g key={e.from + e.to}>
                <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="var(--accent)" strokeOpacity={0.55} strokeWidth={sw}>
                  <title>{`${btc(e.btc)} BTC in ${e.txs} transaction(s), ${e.first}${e.last !== e.first ? " to " + e.last : ""}. Example: ${e.sample}`}</title>
                </path>
                <text x={x2 - 8} y={y2 - 6} fontSize={10.5} textAnchor="end" fill="var(--ink-2)" fontFamily="var(--font-mono)" style={{ paintOrder: "stroke", stroke: "var(--paper)", strokeWidth: 3 }}>
                  {btc(e.btc)} BTC
                </text>
              </g>
            );
          })}
          {trace.nodes.map((n) => {
            const p = pos.get(n.address)!;
            const c = COLORS[n.kind];
            return (
              <a key={n.address} href={`https://blockstream.info/address/${n.address}`} target="_blank" rel="noreferrer">
                <rect x={p.x} y={p.y} width={W} height={H} rx={9} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
                <text x={p.x + 10} y={p.y + 18} fontSize={12} fill="var(--ink)" fontFamily="var(--font-mono)">{short(n.address)}</text>
                <text x={p.x + 10} y={p.y + 35} fontSize={10.5} fill="var(--ink-3)" fontFamily="var(--font-sans)">
                  {n.balance !== null ? `${btc(n.balance)} BTC now` : "not read"}
                  {n.txCount !== null ? ` · ${n.txCount.toLocaleString("en-US")} tx` : ""}
                </text>
                <title>{`${n.address}\n${c.label}${n.note ? "\n" + n.note : ""}`}</title>
              </a>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function TraceTable({ trace }: { trace: Trace }) {
  return (
    <div className="table-scroll">
      <table className="clue-table">
        <thead><tr><th>From</th><th>To</th><th style={{ textAlign: "right" }}>BTC</th><th>Dates</th><th>Example transaction</th></tr></thead>
        <tbody>
          {trace.edges.map((e) => (
            <tr key={e.from + e.to}>
              <td className="mono" style={{ fontSize: 12 }}>{short(e.from)}</td>
              <td className="mono" style={{ fontSize: 12 }}>{short(e.to)}</td>
              <td className="num">{btc(e.btc)}<div className="snippet">{e.txs} tx</div></td>
              <td className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{e.first}{e.last !== e.first ? ` → ${e.last}` : ""}</td>
              <td><a className="addr" href={`https://blockstream.info/tx/${e.sample}`} target="_blank" rel="noreferrer">{e.sample.slice(0, 16)}…</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
