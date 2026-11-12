import Link from "next/link";
import { COMPANY_PLANS } from "@/lib/softwarePlans";
import { ProductExample } from "./ProductExample";

const work = [
  {
    number: "01",
    title: "Collect the source material",
    copy: "Start a review from one of five playbooks. Assign evidence requests, set due dates and keep source references with the work.",
    href: "/product#playbooks",
    label: "Playbooks and requests",
  },
  {
    number: "02",
    title: "Record the review",
    copy: "Track open questions and send completed work to a different authorized reviewer. Each save keeps the actor, reason and previous revision.",
    href: "/product#changes",
    label: "Review and revision history",
  },
  {
    number: "03",
    title: "Prepare the management brief",
    copy: "See overdue actions across programs. Export a brief, compare revisions or take the outstanding deadlines into your calendar.",
    href: "/product#briefs",
    label: "Briefs and exports",
  },
];
export function CompanyLanding() {
  return (
    <div className="experience-page ledger-home">
      <section className="ledger-intro wrap">
        <div className="ledger-caption">
          <span>TraceSworn / Company software</span>
          <span>Evidence · Review · Record</span>
        </div>
        <div className="ledger-intro-grid">
          <div>
            <h1>
              Company reviews,
              <br />
              with the evidence attached.
            </h1>
            <p className="ledger-intro-copy">
              A workspace for the sources, people and decisions behind your
              firm’s reviews. Keep requests, approvals and saved revisions
              together.
            </p>
            <div className="product-actions">
              <Link className="btn btn-primary" href="/workspace">
                Open your workspace <span aria-hidden="true">→</span>
              </Link>
              <Link className="ledger-text-link" href="/product">
                See how it works <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <aside className="ledger-scope">
            <p className="ledger-label">Use it for</p>
            <ul>
              <li>Crypto matter screening</li>
              <li>Supplier oversight</li>
              <li>Access reviews</li>
              <li>Financial reviews</li>
              <li>Incident evidence</li>
            </ul>
            <Link href="/trust">
              Access & security <span aria-hidden="true">→</span>
            </Link>
          </aside>
        </div>
      </section>
      <section
        className="ledger-demonstration wrap"
        aria-labelledby="workspace-example-title"
      >
        <div className="ledger-section-heading">
          <div>
            <p className="ledger-label">Inside the workspace</p>
            <h2 id="workspace-example-title">
              The outstanding work, in one view.
            </h2>
          </div>
          <p>
            Switch between priorities, evidence and reviews.{" "}
            <br />
            The records below are fictional.
          </p>
        </div>
        <ProductExample today={new Date().toISOString().slice(0, 10)} />
      </section>
      <section className="ledger-process wrap" aria-labelledby="process-title">
        <div className="ledger-section-heading">
          <div>
            <p className="ledger-label">The process</p>
            <h2 id="process-title">From request to reviewed record.</h2>
          </div>
          <Link className="ledger-text-link" href="/product">
            Product details <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div>
          {work.map((item) => (
            <article className="ledger-work-row" key={item.number}>
              <span className="ledger-row-number">{item.number}</span>
              <h3>{item.title}</h3>
              <div>
                <p>{item.copy}</p>
                <Link className="ledger-text-link" href={item.href}>
                  {item.label} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="ledger-record-section">
        <div className="wrap ledger-record-grid">
          <div>
            <p className="ledger-label">The record you keep</p>
            <h2>Compare two saved revisions.</h2>
          </div>
          <div>
            <p>
              Compare two saved versions of a program before the next review.
              Inspect the evidence, risk assessments and actions that changed,
              alongside the recorded author and reason.
            </p>
            <p>
              Download the full change report or a management brief with its
              source revisions. Fingerprints let recipients check whether an
              exported file has changed.
            </p>
            <Link className="ledger-text-link" href="/product#changes">
              About revision comparisons <span aria-hidden="true">→</span>
            </Link>
            <p className="ledger-record-note">
              A file fingerprint checks integrity. It does not verify the
              underlying facts or grant approval.
            </p>
          </div>
        </div>
      </section>
      <section className="ledger-pricing wrap" aria-labelledby="pricing-title">
        <div className="ledger-section-heading">
          <div>
            <p className="ledger-label">Company plans</p>
            <h2 id="pricing-title">Choose the capacity you need.</h2>
          </div>
          <p>
            The same company controls at each level.{" "}
            <br />
            Team and program limits set the proposed fee.
          </p>
        </div>
        <div className="ledger-plan-register">
          {COMPANY_PLANS.map((plan) => (
            <article className="ledger-plan-row" key={plan.id}>
              <div>
                <h3>
                  <Link href="/plans#scope">
                    {plan.name} <span aria-hidden="true">→</span>
                  </Link>
                </h3>
                <p>{plan.description}</p>
              </div>
              <p className="ledger-plan-capacity">
                {plan.seats} active seats
                <br />
                {plan.programs} saved programs
              </p>
              <p className="ledger-plan-price">
                ${plan.monthlyUsd.toLocaleString("en-US")}
                <span>per month, proposed</span>
              </p>
            </article>
          ))}
        </div>
        <p className="fine">
          USD, excluding applicable taxes and separately scoped services. Final
          access, support and retention are agreed in a signed scope.
        </p>
        <Link className="ledger-text-link" href="/plans#scope">
          Build a scoped proposal <span aria-hidden="true">→</span>
        </Link>
      </section>
      <section className="ledger-close wrap">
        <div>
          <p className="ledger-label">Already have an account?</p>
          <h2>Your company workspace is ready for you.</h2>
        </div>
        <Link className="btn btn-primary" href="/workspace">
          Sign in <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
