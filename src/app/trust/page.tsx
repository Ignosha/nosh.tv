import type { Metadata } from "next";
import Link from "next/link";
import { SECURITY_OVERVIEW } from "@/lib/securityOverview";
import { ProductIcon } from "@/components/ProductIcon";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Security and operating scope · TraceSworn",
  description:
    "Review TraceSworn's software access, review, revision and portability controls and the operating arrangements to agree before onboarding.",
};
export default function Trust() {
  return (
    <div className="experience-page">
      <section className="product-page-intro wrap">
        <p className="product-eyebrow">Security and operating scope</p>
        <h1>Access, records and operating terms.</h1>
        <p className="product-lede">
          Understand the software boundaries and the deployment arrangements to
          confirm before your company starts using the service.
        </p>
        <div className="product-actions">
          <a className="btn btn-primary" href="/trust/record">
            Download security overview
            <ProductIcon name="arrow" />
          </a>
          <Link className="btn" href="/plans#scope">
            Scope a company rollout
          </Link>
        </div>
      </section>
      <section className="product-section wrap">
        <div className="trust-control-grid">
          {SECURITY_OVERVIEW.controls.map((control, index) => (
            <article className="product-feature-card" key={control.title}>
              <span className="product-feature-icon">
                <ProductIcon
                  name={
                    index === 1
                      ? "review"
                      : index === 3
                        ? "change"
                        : index === 4
                          ? "proof"
                          : "shield"
                  }
                />
              </span>
              <h2>{control.title}</h2>
              <p>{control.detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="product-section wrap">
        <div className="product-story-panel trust-arrangements">
          <div>
            <p className="product-eyebrow">Before onboarding</p>
            <h2>What to agree before onboarding.</h2>
            <p>{SECURITY_OVERVIEW.scope}</p>
          </div>
          <ol>
            {SECURITY_OVERVIEW.arrangements.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
        <p className="trust-limitations">{SECURITY_OVERVIEW.limitations}</p>
      </section>
    </div>
  );
}
