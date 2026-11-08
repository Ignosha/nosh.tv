import Link from "next/link";
import { PACKAGES, ADDONS, priceLabel, payLink, COUPLE_PLAN_LINK } from "@/lib/pricing";

export function Pricing() {
  return (
    <>
    <div className="price-grid">
      {PACKAGES.map((p) => {
        const pay = payLink(p.id);
        const href = p.id === "scan" ? "/tools" : pay ?? `/?package=${p.id}#open-a-case`;
        return (
          <div key={p.id} className={`price-card${p.highlight ? " featured" : ""}`}>
            {p.highlight ? <span className="price-flag">Most chosen</span> : null}
            <h3>{p.name}</h3>
            <div className="price">
              {priceLabel(p)}
              {p.cadence === "once" ? <span> flat</span> : null}
            </div>
            <p className="muted" style={{ margin: "0 0 16px" }}>{p.tagline}</p>
            <ul>
              {p.includes.map((x) => <li key={x}>{x}</li>)}
            </ul>
            {pay ? (
              <>
                <a className={`btn ${p.highlight ? "btn-primary" : ""}`} href={href} rel="noreferrer">
                  {p.cadence === "month" ? "Subscribe" : "Book now"} <span className="arrow">→</span>
                </a>
                {p.id === "plan" ? (
                  <a className="fine" href={COUPLE_PLAN_LINK} rel="noreferrer" style={{ marginTop: 10, textAlign: "center" }}>
                    Booking for two? Couples plan, $1,100
                  </a>
                ) : null}
                <Link className="fine" href={`/?package=${p.id}#open-a-case`} style={{ marginTop: 8, textAlign: "center" }}>
                  Questions first? Talk to us
                </Link>
              </>
            ) : (
              <Link className={`btn ${p.highlight ? "btn-primary" : ""}`} href={href}>
                {p.id === "scan" ? "Use the free tools" : "Choose this"} <span className="arrow">→</span>
              </Link>
            )}
          </div>
        );
      })}
    </div>
    <div className="addons">
      <span className="label">Add-ons</span>
      {ADDONS.map((a) => (
        <div key={a.name} className="addon">
          <b>{a.name}</b> <span className="mono">{a.price}</span> <span className="faint">{a.note}</span>
        </div>
      ))}
    </div>
    </>
  );
}
