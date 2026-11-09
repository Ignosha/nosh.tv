import Link from "next/link";
import { Guilloche } from "./Guilloche";

const usd = (n: number | null) => (n === null ? "unavailable" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 }));

/** The hero as a certificate: framed, centered, numbered by the live Bitcoin block it was read at. */
export function HeroCertificate({ height, hash, btc, eth, readAt }: { height: number | null; hash: string | null; btc: number | null; eth: number | null; readAt: string }) {
  return (
    <section className="cert-hero">
      <div className="wrap">
        <div className="cert">
          <span className="cert-corner tl" aria-hidden="true" />
          <span className="cert-corner tr" aria-hidden="true" />
          <span className="cert-corner bl" aria-hidden="true" />
          <span className="cert-corner br" aria-hidden="true" />

          <div className="cert-top">
            <span>Certificate of reading</span>
            <span className="cert-serial">{height !== null ? <>Nº {height.toLocaleString("en-US")}</> : "Ledger unavailable"}</span>
            <span>Estates · Divorce · Bankruptcy</span>
          </div>

          <div className="cert-body">
            <Guilloche className="cert-rosette" />
            <h1>
              Crypto leaves a trail. <em>We swear to it.</em>
            </h1>
            <p className="lede">
              TraceSworn finds the crypto in an estate, a divorce or a bankruptcy, values it on the date that matters, and seals
              every figure in a record that opposing counsel can verify for themselves.
            </p>
            <div className="hero-actions">
              <Link href="#open-a-case" className="btn btn-primary">
                Open a matter <span className="arrow">↗</span>
              </Link>
              <Link href="/tools" className="btn">
                Try the free tools
              </Link>
            </div>
            <ul className="seal-row">
              <li><b>Fixed</b>fees, never a percentage</li>
              <li><b>Sealed</b>every figure verifiable</li>
              <li><b>Read-only</b>we never hold keys</li>
            </ul>
          </div>

          <div className="cert-foot">
            <span title={hash ?? undefined}>
              {hash ? <>Read at block hash <span className="mono">…{hash.slice(-16)}</span></> : "Block hash unavailable"}
            </span>
            <span>
              BTC {usd(btc)} · ETH {usd(eth)} · {readAt.slice(11, 16)} UTC
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
