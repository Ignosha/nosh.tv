import Link from "next/link";
export const metadata = {
  title: "Crypto evidence for litigation and insolvency counsel — TraceSworn",
  description:
    "Start with one fixed-fee matter. Source-linked crypto findings, transparent coverage limits and a private matter portal.",
};
export default function ForFirms() {
  return (
    <main className="wrap" style={{ padding: "70px 20px", maxWidth: 1000 }}>
      <p className="kicker">For litigation and insolvency counsel</p>
      <h1>Turn crypto clues into a documented next step.</h1>
      <p className="lede">
        Bank statements mention an exchange. A disclosure lists a wallet. Your
        team needs to know what can be checked, what is missing, and which
        records to request next.
      </p>
      <Link className="btn btn-primary" href="/?package=report#open-a-case">
        Scope one matter — Discovery Report $2,500
      </Link>{" "}
      <Link className="btn" href="/tools/statements">
        Try the private statement scan
      </Link>
      <section className="section">
        <h2>Start with a defined deliverable</h2>
        <p>
          Discovery Report: one person, one valuation date, up to 10 supplied
          public addresses and one revision. Source-linked current balances,
          available historical values, exchange clues, a limitations statement
          and a sealed record. Account discovery is limited to the materials and
          addresses provided. Historical EVM balances may require additional
          data.
        </p>
        <p>
          Evidence Package: $6,500 for the agreed investigation plus numbered
          exhibits, methodology and records-request drafts. Expert testimony,
          recovery, litigation strategy and complex tracing are separately
          scoped.
        </p>
        <p>
          No recovery guarantees. We never take custody of keys or assets. A
          record fingerprint establishes file integrity; it does not
          independently establish accuracy or admissibility.
        </p>
      </section>
      <section className="form-card">
        <h2>For a recurring caseload: Firm Premier</h2>
        <p>
          $10,000/month. Includes 4 defined investigations, monthly screening of
          up to 50 newly submitted matters, 25 specialist hours total, and one
          revision per investigation. Private firm portal, native Ethereum
          tracing with available token-transfer evidence, and daily asset alerts
          with no per-address fee.
        </p>
        <p>
          A named lead reviews findings. Initial findings or a documented
          limitations report are due the same week after complete intake and
          scope confirmation. Third-party records, court processes and recovery
          are outside that turnaround. Additional matters or specialist hours
          require a separate written quote. Monthly capacity does not roll over.
        </p>
        <Link className="btn" href="/?package=premier#open-a-case">
          Discuss a scoped Premier pilot
        </Link>
      </section>
      <section className="section">
        <h2>Work asynchronously</h2>
        <ol>
          <li>
            Open a matter and describe your authority, known addresses and key
            date.
          </li>
          <li>
            Use the portal scan: documents stay in your browser; only findings
            are submitted.
          </li>
          <li>
            The system prepares readings and draft findings. The case lead
            reviews limitations and publishes the approved result.
          </li>
        </ol>
        <p>
          We start with paid individual matters to establish fit. A retainer
          makes sense only when your recurring caseload supports it.
        </p>
      </section>
    </main>
  );
}
