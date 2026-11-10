import Link from "next/link";
export const metadata = {
  title: "Report Studio — professional report software pilot",
};
export default function Plans() {
  return (
    <div className="wrap" style={{ padding: "60px 0", maxWidth: 1000 }}>
      <p className="kicker">Report Studio · software pilot</p>
      <h1>Spend less time assembling reports.</h1>
      <p className="lede">
        Turn sourced observations into branded, reviewable reports. You supply
        the expertise; the software organizes the document.
      </p>
      <Link className="btn btn-primary" href="/report-builder">
        Try the browser preview
      </Link>
      <section className="section">
        <h2>Features that support a professional workflow</h2>
        <ul>
          <li>
            Your organization, cover details and accent color on printed
            reports.
          </li>
          <li>
            Three reusable starting templates: asset reviews, financial evidence
            and investigation chronologies.
          </li>
          <li>
            Source register with HTTPS references, observation dates and local
            original-file fingerprints.
          </li>
          <li>
            Finding-by-finding citations and explicit scope, methodology and
            limitations.
          </li>
          <li>
            Review checklist and distinct declared author/reviewer names before
            issuing.
          </li>
          <li>
            Issued JSON records with verifiable fingerprints, printable layouts
            and preserved revisions.
          </li>
        </ul>
      </section>
      <section className="form-card">
        <h2>Pilot pricing to validate</h2>
        <p>
          <strong>Individual: $199/month proposed.</strong> Branded report
          preparation, reusable drafts, citations, review checks and local
          exports.
        </p>
        <p>
          <strong>Practice: $499/month proposed.</strong> Adds case-linked
          issued-version archives through the existing administrator workspace.
        </p>
        <p>
          These are proposed pilot prices, not active subscriptions. The browser
          preview is free and unmetered. Hosted archives require database setup.
          Separate user accounts, seat billing, authenticated reviewer
          signatures, organization isolation and automatic client delivery are
          not included in this preview.
        </p>
        <Link className="btn" href="/#open-a-case">
          Request a software pilot
        </Link>
        <p className="fine">
          Mention “Report Studio” in your message. This is software, separate
          from the fixed-fee investigation services.
        </p>
      </section>
      <p>
        Fingerprints establish file integrity, not authenticity or legal
        admissibility. Local drafts are not saved automatically; download them
        before closing your browser.
      </p>
    </div>
  );
}
