import Link from "next/link";
import { PACKAGES, ADDONS, priceLabel, payLink } from "@/lib/pricing";

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
              {p.cadence === "month" ? "$" + p.price.toLocaleString("en-US") : priceLabel(p)}
              {p.cadence === "once" ? <span> flat</span> : p.cadence === "month" ? <span>/mo</span> : null}
            </div>
            <p className="muted" style={{ margin: "0 0 16px" }}>{p.tagline}</p>
            <ul>
              {p.includes.map((x) => <li key={x}>{x}</li>)}
            </ul>
            {pay ? (
              <>
                <a className={`btn ${p.highlight ? "btn-primary" : ""}`} href={href} rel="noreferrer">
                  {p.cadence === "month" ? "Subscribe" : "Engage now"} <span className="arrow">→</span>
                </a>
                <Link className="fine" href={`/?package=${p.id}#open-a-case`} style={{ marginTop: 8, textAlign: "center" }}>
                  Questions first? Open a matter
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
          {a.link ? <> <a href={a.link} rel="noreferrer" className="fine">Add →</a></> : null}
        </div>
      ))}
    </div>
    </>
  );
}
