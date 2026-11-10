import Link from "next/link";
import { SOFTWARE_PLANS } from "@/lib/softwarePlans";
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
        {SOFTWARE_PLANS.map((plan) => (
          <article className="form-card" key={plan.id}>
            <h3>{plan.name}</h3>
            <p>
              <strong>
                ${plan.monthlyUsd.toLocaleString("en-US")}/month proposed
              </strong>
            </p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        ))}
        <p>
          Company Assurance preview supports up to 200 risks, 200 evidence
          references and 500 action instances in one workspace. Hosted programs
          are managed by the existing administrator, not separate company
          logins. Proposals require a written scope and deployment acceptance.
        </p>
        <Link className="btn" href="/assurance">
          Try the assurance workspace
        </Link>{" "}
        <Link className="btn" href="/report-compare">
          Compare issued reports
        </Link>
        <p>
          These are proposed pilot prices, not active subscriptions. The browser
          preview is free and unmetered. Hosted archives require database setup.
          Enterprise SSO, separate user accounts, seat billing, authenticated
          reviewer signatures, organization isolation and automatic client
          delivery are not included in this preview. There is no advertised
          uptime SLA, backup recovery commitment, regulatory certification or
          automatic external evidence verification.
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
