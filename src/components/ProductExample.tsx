"use client";
import { useState } from "react";
import { productExample } from "@/lib/productExample";

export function ProductExample({ today }: { today: string }) {
  const [view, setView] = useState<"overview" | "evidence" | "review">(
    "overview",
  );
  const data = productExample(today);
  const selected = data.exceptions.filter((item) =>
    view === "evidence"
      ? item.kind === "evidence"
      : view === "review"
        ? item.kind === "review"
        : ["overdue", "risk"].includes(item.kind),
  );
  return (
    <section
      className="product-example"
      aria-label="Interactive product example"
    >
      <div className="example-titlebar">
        <span>Portfolio / review register</span>
        <span className="example-badge">Fictional example</span>
      </div>
      <div className="example-content">
        <div className="example-heading">
          <h2>Outstanding items</h2>
          <span className="example-asof">As of {today}</span>
        </div>
        <dl className="example-metrics">
          <div>
            <dt>Open actions</dt>
            <dd>{data.totals.open}</dd>
          </div>
          <div>
            <dt>Overdue</dt>
            <dd>{data.totals.overdue}</dd>
          </div>
          <div>
            <dt>Awaiting review</dt>
            <dd>{data.totals.review}</dd>
          </div>
        </dl>
        <div
          className="example-switcher"
          role="group"
          aria-label="Example workspace views"
        >
          {(
            [
              ["overview", "Priorities"],
              ["evidence", "Evidence"],
              ["review", "Review"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              aria-pressed={view === id}
              key={id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="example-register-head" aria-hidden="true">
          <span>Item / saved program</span>
          <span>Requires attention</span>
          <span>Revision</span>
        </div>
        <div className="example-inbox" aria-live="polite">
          {selected.map((item) => (
            <article
              className={`example-work-item example-${item.kind}`}
              key={item.key}
            >
              <div>
                <h3>{item.title}</h3>
                <p>{item.program}</p>
              </div>
              <span className="example-item-kind">
                {item.kind === "risk"
                  ? "High risk"
                  : item.kind === "evidence"
                    ? "Stale evidence"
                    : item.kind === "review"
                      ? "Review requested"
                      : "Overdue"}
              </span>
              <span className="example-item-revision">
                <span className="sr-only">Revision </span>
                {String(item.revision).padStart(2, "0")}
              </span>
            </article>
          ))}
        </div>
        <p className="example-footnote">
          Sample records only. No customer data or approvals.
        </p>
      </div>
    </section>
  );
}
