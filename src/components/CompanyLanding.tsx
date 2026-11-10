import Link from "next/link";
import { SOFTWARE_PLANS } from "@/lib/softwarePlans";
export function CompanyLanding() {
  return (
    <div className="wrap" style={{ padding: "70px 0" }}>
      <p className="kicker">TraceSworn · company assurance</p>
      <h1>Evidence, decisions and follow-through in one workspace.</h1>
      <p className="lede">
        Assess risks, assign accountable owners, review remediation and preserve
        who approved each change.
      </p>
      <div className="studio-toolbar">
        <Link className="btn btn-primary" href="/auth/sign-in">
          Company sign in
        </Link>
        <Link className="btn" href="/assurance">
          Try a local workspace
        </Link>
        <Link className="btn" href="/report-builder">
          Build a report
        </Link>
      </div>
      <section className="section">
        <h2>Company controls</h2>
        <ul>
          <li>
            Organization-scoped access with mandatory MFA and role permissions.
          </li>
          <li>
            Independent authenticated review for action closure and report
            publication.
          </li>
          <li>
            Preserved revisions, evidence freshness and recurring obligations.
          </li>
          <li>Portable exports and read-only access after contract expiry.</li>
        </ul>
      </section>
      <section className="form-card">
        <h2>Software pilot proposals</h2>
        {SOFTWARE_PLANS.map((p) => (
          <p key={p.id}>
            {p.name}: ${p.monthlyUsd.toLocaleString("en-US")}/month proposed
          </p>
        ))}
        <p>
          Company access is provisioned under a signed scope and contract.
          Prices are proposals, not an active self-service checkout.
          Identity-provider configuration and deployment acceptance must be
          completed before paid onboarding.
        </p>
      </section>
      <p>
        Need help? Contact your organization owner or assigned account team.
        Local previews do not save automatically; export before closing.
      </p>
    </div>
  );
}
