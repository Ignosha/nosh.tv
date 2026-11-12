import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCompanyPortfolio } from "@/lib/enterprise/portfolio";
import { PORTFOLIO_PAGE_SIZE, portfolioPage } from "@/lib/companyPortfolio";
import { PrintButton } from "@/components/PrintButton";

export default async function ManagementBrief({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ org }, search] = await Promise.all([params, searchParams]);
  const page = portfolioPage(search.page),
    { organization, result, totalPrograms } = await loadCompanyPortfolio(
      org,
      page,
    );
  if (page > Math.max(1, Math.ceil(totalPrograms / PORTFOLIO_PAGE_SIZE)))
    notFound();
  return (
    <article className="company-management-brief">
      <div className="studio-toolbar no-print">
        <Link className="btn" href={`/workspace/${org}/portfolio?page=${page}`}>
          ← Command center
        </Link>
        <PrintButton />
      </div>
      <p className="kicker">TraceSworn · management brief</p>
      <h1>{organization.name}</h1>
      <p>
        Evaluated {result.evaluatedOn} UTC · page {page} ·{" "}
        {result.programs.length} of {totalPrograms} saved programs.
      </p>
      <h2>Decisions needing attention</h2>
      <p>
        {result.totals.overdue} overdue actions · {result.totals.review}{" "}
        awaiting independent review · {result.totals.critical} critical residual
        risks · {result.totals.unassessed} unassessed risks.
      </p>
      <h2>Saved revision register</h2>
      {result.programs.map((program) => (
        <section className="assurance-action" key={program.id}>
          <h3>{program.name}</h3>
          <p>
            Revision {program.revision} · saved {program.updatedAt} · program{" "}
            {program.id}
          </p>
          <p>
            {program.open} open actions; {program.overdue} overdue;{" "}
            {program.review} awaiting review; {program.evidenceGaps} stale
            evidence records.
          </p>
        </section>
      ))}
      <h2>Priority exceptions</h2>
      <p>
        {result.exceptions.length} of {result.exceptionCount} exceptions on this
        page are included, highest priority first.
      </p>
      {!result.exceptions.length ? (
        <p>No exceptions were detected in these saved programs.</p>
      ) : (
        result.exceptions.map((item) => (
          <section className="assurance-action" key={item.key}>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
            <p>
              {item.program} · revision {item.revision} · {item.ownerLabel}
              {item.dueDate ? ` · due ${item.dueDate} UTC` : ""}
            </p>
          </section>
        ))
      )}
      <p className="fine">
        This is a management snapshot of saved revisions, not a separate
        approval record. Scores reflect supplied facts and judgments. Metrics
        cover this page; a clear queue does not establish compliance. Source
        integrity does not establish factual accuracy.
      </p>
    </article>
  );
}
