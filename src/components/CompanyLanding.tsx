import Link from "next/link";
import { COMPANY_PLANS } from "@/lib/softwarePlans";
export function CompanyLanding() {
  return (
    <div className="wrap" style={{ padding: "70px 0" }}>
      <p className="kicker">TraceSworn · company assurance</p>
      <h1>Turn scattered evidence into work your company can finish.</h1>
      <p className="lede">
        Start with repeatable playbooks, give every task an owner and bring
        overdue work, stale evidence and pending decisions into one management
        view.
      </p>
      <div className="studio-toolbar">
        <Link className="btn btn-primary" href="/auth/sign-in">
          Company sign in
        </Link>
        <Link className="btn" href="/plans">
          Explore company plans
        </Link>
        <Link className="btn" href="/assurance">
          Try a local workspace
        </Link>
        <Link className="btn" href="/report-builder">
          Build a report
        </Link>
      </div>
      <section className="section">
        <div className="company-plan-grid">
          <article>
            <p className="kicker">Start faster</p>
            <h2>Reusable operating playbooks</h2>
            <p>
              Crypto matter screening, vendor diligence, access reviews,
              financial reviews and incident response begin with linked risks,
              staged tasks and recurring reviews.
            </p>
          </article>
          <article>
            <p className="kicker">Chase less</p>
            <h2>A portfolio exception inbox</h2>
            <p>
              Find overdue work, blocked prerequisites, stale sources and review
              requests across saved programs. Filter by owner and open the work
              that needs attention.
            </p>
          </article>
          <article>
            <p className="kicker">Report clearly</p>
            <h2>Management packs from saved revisions</h2>
            <p>
              Prepare printable briefs, export evidence request lists and
              preserve a fingerprinted snapshot with its program revisions and
              scope.
            </p>
          </article>
        </div>
      </section>
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
        <h2>Company pilot proposals</h2>
        {COMPANY_PLANS.map((p) => (
          <p key={p.id}>
            {p.name}: ${p.monthlyUsd.toLocaleString("en-US")}/month proposed ·{" "}
            {p.seats} seats · {p.programs} programs
          </p>
        ))}
        <p>
          Company access is provisioned under a signed scope and contract.
          Prices are proposals, not an active self-service checkout.
          Identity-provider configuration and deployment acceptance must be
          completed before paid onboarding.
        </p>
        <Link href="/plans#scope" className="btn">
          Build a scoped proposal
        </Link>
      </section>
      <p>
        Need help? Contact your organization owner or assigned account team.
        Local previews do not save automatically; export before closing.
      </p>
    </div>
  );
}
