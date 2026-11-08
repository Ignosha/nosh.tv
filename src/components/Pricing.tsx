import Link from "next/link";
import { PACKAGES, priceLabel, payLink } from "@/lib/pricing";

export function Pricing() {
  return (
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
              <a className={`btn ${p.highlight ? "btn-primary" : ""}`} href={href} rel="noreferrer">
                Get started <span className="arrow">→</span>
              </a>
            ) : (
              <Link className={`btn ${p.highlight ? "btn-primary" : ""}`} href={href}>
                {p.id === "scan" ? "Use the free tools" : "Choose this"} <span className="arrow">→</span>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
