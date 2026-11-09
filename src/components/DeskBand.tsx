// The Evidence Desk band: a live line from the public ledger, in the NOSHASHI Ledger Desk manner.
export function DeskBand({ height, btc }: { height: number | null; btc: number | null }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="wrap">
      <div className="desk-band" aria-label="Live ledger reading">
        <span>
          ◎ <b>The Evidence Desk</b>
        </span>
        <span className="mid">
          Ledger connection / {height === null ? "UNAVAILABLE" : <span className="ok">LIVE</span>}
          {height !== null ? ` · block ${height.toLocaleString("en-US")}` : ""}
        </span>
        <span className="end">
          {btc !== null ? `BTC $${btc.toLocaleString("en-US", { maximumFractionDigits: 0 })} · ` : ""}
          {today}
        </span>
      </div>
    </div>
  );
}
