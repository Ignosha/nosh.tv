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
          Company Assurance supports up to 200 risks, 200 evidence references
          and 500 action instances per workspace. The company deployment path
          adds individual sign-in, mandatory MFA, organization roles and
          authenticated independent review. Deployment configuration and
          acceptance are required before customer access.
        </p>
        <Link className="btn" href="/assurance">
          Try the assurance workspace
        </Link>{" "}
        <Link className="btn" href="/report-compare">
          Compare issued reports
        </Link>
        <p>
          These are proposed pilot prices, not active self-service
          subscriptions. Local previews remain free and unmetered. Company
          access is provisioned under a signed contract with enforced seats,
          programs and expiry. SSO requires a configured identity provider. No
          uptime SLA, compliance certification, automated client delivery or
          verified production backup recovery is claimed by this preview.
        </p>
        <Link
          className="btn"
          href={
            process.env.ENTERPRISE_MODE === "1"
              ? "/auth/sign-in"
              : "/#open-a-case"
          }
        >
          Discuss access with your account team
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
