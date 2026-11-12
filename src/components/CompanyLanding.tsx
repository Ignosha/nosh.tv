import Link from "next/link";
import { COMPANY_PLANS } from "@/lib/softwarePlans";
import { ProductExample } from "./ProductExample";
import { ProductIcon } from "./ProductIcon";

const features = [
  {
    icon: "grid",
    title: "Start with a repeatable process",
    copy: "Five playbooks turn a blank workspace into linked risks, staged tasks and accountable owners.",
    link: "/product#playbooks",
    label: "Explore the workflow",
    tone: "mint",
  },
  {
    icon: "change",
    title: "See exactly what changed",
    copy: "Compare saved revisions to find edits to source records, control judgments and action status.",
    link: "/product#changes",
    label: "See revision comparisons",
    tone: "blue",
  },
  {
    icon: "clock",
    title: "Keep deadlines within reach",
    copy: "Find overdue work and export open deadlines to your team's calendar, without sharing a public feed.",
    link: "/product#calendar",
    label: "Explore calendar handoffs",
    tone: "coral",
  },
] as const;
export function CompanyLanding() {
  return (
    <div className="experience-page">
      <section className="product-hero wrap">
        <div className="product-hero-copy">
          <p className="product-eyebrow">
            <span className="product-status-dot" /> Evidence operations for
            company teams
          </p>
          <h1>
            Move the work.
            <br />
            <em>Keep the proof.</em>
          </h1>
          <p className="product-lede">
            Bring evidence, accountable owners and independent review into one
            clear workflow—from the first request to the management pack.
          </p>
          <div className="product-actions">
            <Link className="btn btn-primary" href="/product">
              Explore the product <ProductIcon name="arrow" />
            </Link>
            <Link className="btn" href="/plans">
              Plan your rollout
            </Link>
          </div>
          <div className="product-proofline">
            <span>
              <ProductIcon name="shield" />
              MFA and company permissions
            </span>
            <span>
              <ProductIcon name="review" />
              Independent review
            </span>
          </div>
        </div>
        <div className="product-hero-visual">
          <div className="product-orbit product-orbit-one" aria-hidden="true" />
          <div className="product-orbit product-orbit-two" aria-hidden="true" />
          <ProductExample
            today={new Date().toISOString().slice(0, 10)}
            compact
          />
          <div className="product-floating-note">
            <ProductIcon name="proof" />
            <div>
              <strong>From source to decision</strong>
              <span>Saved revisions. Visible ownership.</span>
            </div>
          </div>
        </div>
      </section>
      <section
        className="product-capability-strip wrap"
        aria-label="Product capabilities"
      >
        <span>One connected process</span>
        {[
          "Evidence requests",
          "Accountable owners",
          "Revision history",
          "Reviewed closure",
          "Management briefs",
        ].map((label) => (
          <strong key={label}>{label}</strong>
        ))}
      </section>
      <section className="product-section wrap">
        <div className="product-section-heading">
          <div>
            <p className="product-eyebrow">Built for the handoffs</p>
            <h2>
              Less searching.
              <br />
              More work moving forward.
            </h2>
          </div>
          <p>
            Give every person a clear next step, and keep the record behind each
            decision close at hand.
          </p>
        </div>
        <div className="product-feature-grid">
          {features.map((feature) => (
            <article
              className={`product-feature-card tone-${feature.tone}`}
              key={feature.title}
            >
              <span className="product-feature-icon">
                <ProductIcon name={feature.icon} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
              <Link href={feature.link}>
                {feature.label}
                <ProductIcon name="arrow" />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="product-section wrap">
        <div className="product-story-panel">
          <div>
            <p className="product-eyebrow">A record management can use</p>
            <h2>The brief should not be another project.</h2>
            <p>
              Work from saved revisions, focus on exceptions and prepare a
              management pack with clear source references. Export a printable
              brief, spreadsheet-safe request list or fingerprinted snapshot.
            </p>
            <Link className="btn" href="/product#briefs">
              Explore management packs
              <ProductIcon name="arrow" />
            </Link>
          </div>
          <div
            className="product-brief-visual"
            aria-label="Management brief illustration"
          >
            <div className="brief-paper">
              <span>TRACESWORN / MANAGEMENT BRIEF</span>
              <h3>
                The work.
                <br />
                The decisions.
                <br />
                The record.
              </h3>
              <div className="brief-sample-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <p>Illustration · source revisions and explicit scope</p>
            </div>
            <span className="brief-seal">
              <ProductIcon name="proof" />
              Sealed exports
            </span>
          </div>
        </div>
      </section>
      <section className="product-section wrap">
        <div className="product-section-heading">
          <div>
            <p className="product-eyebrow">Capacity that fits</p>
            <h2>Start focused. Expand with the work.</h2>
          </div>
          <p>
            Company controls are included across the proposals. Choose a team
            and program capacity that fits your rollout.
          </p>
        </div>
        <div className="product-price-grid">
          {COMPANY_PLANS.map((plan) => (
            <article
              className={`product-price-card ${plan.id === "portfolio" ? "product-price-featured" : ""}`}
              key={plan.id}
            >
              <p className="product-eyebrow">{plan.name}</p>
              <h3>
                ${plan.monthlyUsd.toLocaleString("en-US")}
                <span>/month proposed</span>
              </h3>
              <p>{plan.description}</p>
              <div className="product-plan-capacity">
                <strong>
                  {plan.seats}
                  <span>active seats</span>
                </strong>
                <strong>
                  {plan.programs}
                  <span>saved programs</span>
                </strong>
              </div>
              <Link className="btn" href="/plans#scope">
                Scope this rollout
                <ProductIcon name="arrow" />
              </Link>
            </article>
          ))}
        </div>
        <p className="fine">
          Proposed prices in USD, excluding applicable taxes and separately
          scoped services. A signed scope sets access, support and retention;
          there is no automatic purchase here.
        </p>
      </section>
      <section className="product-final-cta wrap">
        <div>
          <p className="product-eyebrow">A clearer way to operate</p>
          <h2>Make the next handoff a better one.</h2>
          <p>
            Explore a working example, compare capacity or open your company
            workspace.
          </p>
        </div>
        <div className="product-actions">
          <Link className="btn btn-primary" href="/workspace">
            Open workspace
            <ProductIcon name="arrow" />
          </Link>
          <Link className="btn" href="/trust">
            Review security controls
          </Link>
        </div>
      </section>
    </div>
  );
}
