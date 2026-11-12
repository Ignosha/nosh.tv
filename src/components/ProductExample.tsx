"use client";
import { useState } from "react";
import { productExample } from "@/lib/productExample";
import { ProductIcon } from "./ProductIcon";

export function ProductExample({
  today,
  compact = false,
}: {
  today: string;
  compact?: boolean;
}) {
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
      className={`product-example ${compact ? "product-example-compact" : ""}`}
      aria-label="Interactive product example"
    >
      <div className="example-titlebar">
        <span className="example-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>TraceSworn / workspace</span>
        <span className="example-badge">Fictional example</span>
      </div>
      <div className="example-content">
        <div className="example-heading">
          <div>
            <p className="product-eyebrow">The work, in focus</p>
            <h2>A clearer morning review.</h2>
          </div>
          <span className="example-avatar" aria-hidden="true">
            EX
          </span>
        </div>
        <div className="example-metrics">
          <div>
            <strong>{data.totals.open}</strong>
            <span>Open actions</span>
          </div>
          <div>
            <strong>{data.totals.overdue}</strong>
            <span>Overdue</span>
          </div>
          <div>
            <strong>{data.totals.review}</strong>
            <span>For review</span>
          </div>
        </div>
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
        <div className="example-inbox" aria-live="polite">
          {selected.map((item) => (
            <article
              className={`example-work-item example-${item.kind}`}
              key={item.key}
            >
              <span className="example-item-icon">
                <ProductIcon
                  name={
                    item.kind === "review"
                      ? "review"
                      : item.kind === "evidence"
                        ? "proof"
                        : "clock"
                  }
                />
              </span>
              <div>
                <span className="example-item-kind">
                  {item.kind === "risk"
                    ? "High priority"
                    : item.kind === "evidence"
                      ? "Evidence freshness"
                      : item.kind === "review"
                        ? "Independent review"
                        : "Deadline passed"}
                </span>
                <h3>{item.title}</h3>
                <p>
                  {item.program} · revision {item.revision}
                </p>
              </div>
              <ProductIcon name="arrow" />
            </article>
          ))}
        </div>
        <div className="example-flow" aria-label="Workflow stages">
          {["Scope", "Evidence", "Review", "Brief"].map((stage, index) => (
            <span key={stage}>
              <i>{index + 1}</i>
              {stage}
            </span>
          ))}
        </div>
        <p className="example-footnote">
          Interactive illustration · fictional records evaluated {today}. No
          customer data or approvals.
        </p>
      </div>
    </section>
  );
}
