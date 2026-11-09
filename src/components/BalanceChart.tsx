/** Step chart of an address's balance after each confirmed transaction (server-rendered SVG). */
export function BalanceChart({ series, unit = "BTC", markDate }: { series: { date: string; time: number; balance: number }[]; unit?: string; markDate?: string | null }) {
  if (series.length < 1) return <p className="fine">No confirmed transactions.</p>;
  const W = 720, H = 220, L = 64, R = 16, T = 14, B = 34;
  const t0 = series[0].time, t1 = Math.max(series[series.length - 1].time, Date.now() / 1000);
  const max = Math.max(...series.map((p) => p.balance), 1e-8);
  const x = (t: number) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (b: number) => T + (1 - b / max) * (H - T - B);
  let d = `M${x(t0)},${y(0)}`;
  for (const p of series) d += ` H${x(p.time)} V${y(p.balance)}`;
  d += ` H${x(t1)}`;
  const mark = markDate ? Date.parse(markDate + "T23:59:59Z") / 1000 : null;
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 4 });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Balance over time, peak ${fmt(max)} ${unit}`} style={{ display: "block", maxWidth: W }}>
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--line)" />
      <line x1={L} x2={W - R} y1={y(max)} y2={y(max)} stroke="var(--line)" strokeDasharray="3 4" />
      <text x={L - 8} y={y(max) + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)" fontFamily="var(--font-mono)">{fmt(max)}</text>
      <text x={L - 8} y={y(0) + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)" fontFamily="var(--font-mono)">0</text>
      <text x={L} y={H - 10} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">{series[0].date}</text>
      <text x={W - R} y={H - 10} fontSize={11} textAnchor="end" fill="var(--ink-3)" fontFamily="var(--font-mono)">{new Date(t1 * 1000).toISOString().slice(0, 10)}</text>
      {mark && mark > t0 && mark < t1 ? (
        <g>
          <line x1={x(mark)} x2={x(mark)} y1={T} y2={y(0)} stroke="var(--accent)" strokeDasharray="4 3" />
          <text x={x(mark) + 4} y={T + 10} fontSize={11} fill="var(--accent)" fontFamily="var(--font-mono)">{markDate}</text>
        </g>
      ) : null}
      <path d={d} fill="none" stroke="var(--found)" strokeWidth={2} />
    </svg>
  );
}
