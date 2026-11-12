import type { CompanyPortfolio } from "@/lib/companyPortfolio";
export function PortfolioPulse({ result }: { result: CompanyPortfolio }) {
  const total = result.totals.open + result.totals.complete,
    percent = total ? Math.round((result.totals.complete / total) * 100) : 0;
  const owners = new Map<string, number>();
  for (const request of result.requests)
    owners.set(request.owner, (owners.get(request.owner) ?? 0) + 1);
  const workload = [...owners].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const stages = [
    {
      name: "Open / in progress",
      count: result.totals.open - result.totals.review,
      tone: "mint",
    },
    { name: "Awaiting review", count: result.totals.review, tone: "blue" },
    { name: "Completed", count: result.totals.complete, tone: "coral" },
  ];
  return (
    <div className="portfolio-pulse-grid">
      <section className="form-card portfolio-pulse">
        <div>
          <p className="product-eyebrow">Work distribution</p>
          <h2>Action status</h2>
          <p className="fine">Saved actions on this portfolio page.</p>
        </div>
        <div className="pulse-content">
          <div
            className="pulse-ring"
            role="img"
            aria-label={
              total
                ? `${percent}% of ${total} saved actions are complete`
                : "No saved actions on this page"
            }
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="49" pathLength="100" />
              <circle
                cx="60"
                cy="60"
                r="49"
                pathLength="100"
                style={{
                  strokeDasharray: `${percent} ${100 - percent}`,
                  opacity: percent ? 1 : 0,
                }}
              />
            </svg>
            <div>
              <strong>{total ? `${percent}%` : "—"}</strong>
              <span>{total ? "complete" : "no actions"}</span>
            </div>
          </div>
          <ul className="pulse-stage-list">
            {stages.map((stage) => (
              <li key={stage.name}>
                <span className={`pulse-dot tone-${stage.tone}`} />
                <span>{stage.name}</span>
                <strong>{stage.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="form-card owner-workload">
        <p className="product-eyebrow">Who owns the next step</p>
        <h2>Team workload</h2>
        {workload.length ? (
          <ul>
            {workload.map(([owner, count]) => (
              <li key={owner}>
                <div>
                  <span>{owner}</span>
                  <strong>{count} open</strong>
                </div>
                <span className="workload-track">
                  <i
                    style={{
                      width: `${Math.max(2, (count / result.totals.open) * 100)}%`,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No open actions on this page.</p>
        )}
        <p className="fine">
          Up to five owners, ranked by open actions on this page.
        </p>
      </section>
    </div>
  );
}
