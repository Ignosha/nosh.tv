import type { Metadata } from "next";
import Link from "next/link";
import { ProductExample } from "@/components/ProductExample";
import { ProductIcon } from "@/components/ProductIcon";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Explore evidence operations · TraceSworn",
  description:
    "See how playbooks, independent reviews, change reports and calendar handoffs connect the work behind a management brief.",
};
const capabilities = [
  {
    id: "playbooks",
    number: "01",
    icon: "grid",
    title: "Begin with the next steps already mapped.",
    text: "Choose a playbook for crypto matter screening, supplier oversight, access review, financial review or incident response. It creates linked risks, dependent tasks and a recurring review with you as the initial accountable owner.",
    bullets: [
      "Start unassessed, with no invented evidence",
      "Assign colleagues and collect source references",
      "Preserve the stricter evidence freshness window",
    ],
  },
  {
    id: "changes",
    number: "02",
    icon: "change",
    title: "Know what changed before the next decision.",
    text: "Compare two preserved program revisions to see added, changed and removed evidence, risks and actions. Inspect the saved actors, reasons and the effect on the work queue.",
    bullets: [
      "Stable record IDs keep reordering separate from edits",
      "Evaluate both revisions on the same UTC date",
      "Print or export the full sealed change report",
    ],
  },
  {
    id: "calendar",
    number: "03",
    icon: "clock",
    title: "Bring deadlines into the way your team works.",
    text: "Export open-action due dates from the selected portfolio page as an iCalendar file. Keep the program link close to each deadline so the current evidence and review status are easy to find.",
    bullets: [
      "One-time calendar snapshot, not a public subscription",
      "No invitations or automatic email messages",
      "Use a dedicated calendar and refresh imports as work changes",
    ],
  },
  {
    id: "briefs",
    number: "04",
    icon: "proof",
    title: "Finish with a management record people can follow.",
    text: "Use the portfolio inbox to focus on exceptions, then create a printable brief, sealed snapshot or spreadsheet-safe evidence request list from saved revisions.",
    bullets: [
      "Explicit program, revision and pagination scope",
      "Independent authenticated review stays in the program",
      "Authorized exports remain available after contract expiry",
    ],
  },
] as const;
export default function Product() {
  return (
    <div className="experience-page">
      <section className="product-page-intro wrap">
        <p className="product-eyebrow">Explore the product</p>
        <h1>
          A connected process.
          <br />
          <em>A clearer record.</em>
        </h1>
        <p className="product-lede">
          Move from scattered requests to visible ownership, reviewed work and
          management-ready evidence.
        </p>
        <div className="product-actions">
          <Link className="btn btn-primary" href="/workspace">
            Open workspace
            <ProductIcon name="arrow" />
          </Link>
          <Link className="btn" href="/plans">
            Compare company capacity
          </Link>
        </div>
      </section>
      <div className="product-demo-stage wrap">
        <ProductExample today={new Date().toISOString().slice(0, 10)} />
      </div>
      <section className="product-section wrap">
        {capabilities.map((item) => (
          <article
            id={item.id}
            className="product-capability-row"
            key={item.id}
          >
            <div className="product-capability-number">
              {item.number}
              <ProductIcon name={item.icon} />
            </div>
            <div>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </div>
            <ul>
              {item.bullets.map((bullet) => (
                <li key={bullet}>
                  <ProductIcon name="review" />
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className="product-final-cta wrap">
        <div>
          <p className="product-eyebrow">Ready to evaluate fit?</p>
          <h2>Scope the team, the work and the terms.</h2>
        </div>
        <div className="product-actions">
          <Link className="btn btn-primary" href="/plans#scope">
            Build a proposal
            <ProductIcon name="arrow" />
          </Link>
          <Link className="btn" href="/trust">
            Review security overview
          </Link>
        </div>
      </section>
    </div>
  );
}
