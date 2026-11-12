import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCompanyPortfolio } from "@/lib/enterprise/portfolio";
import { PORTFOLIO_PAGE_SIZE, portfolioPage } from "@/lib/companyPortfolio";
import { PortfolioQueue } from "@/components/PortfolioQueue";
import { PortfolioPulse } from "@/components/PortfolioPulse";

export default async function Portfolio({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ org }, search] = await Promise.all([params, searchParams]);
  const page = portfolioPage(search.page);
  const { organization, result, totalPrograms, members } =
    await loadCompanyPortfolio(org, page);
  const pages = Math.max(1, Math.ceil(totalPrograms / PORTFOLIO_PAGE_SIZE));
  if (page > pages) notFound();
  const base = `/workspace/${org}/portfolio`;
  return (
    <>
      <Link href={`/workspace/${org}`}>← Company workspace</Link>
      <p className="kicker">{organization.name}</p>
      <h1>Portfolio command center</h1>
      <p className="lede">
        Know which work needs attention, who owns it and what is waiting for
        review.
      </p>
      <div className="studio-toolbar no-print">
        <Link className="btn btn-primary" href={`${base}/brief?page=${page}`}>
          Open management brief
        </Link>
        <a className="btn" href={`${base}/export?page=${page}&format=csv`}>
          Export evidence request CSV
        </a>
        <a className="btn" href={`${base}/export?page=${page}&format=json`}>
          Export sealed brief
        </a>
        <a className="btn" href={`${base}/export?page=${page}&format=ics`}>
          Export deadline calendar
        </a>
      </div>
      <PortfolioPulse result={result} />
      <p className="fine">
        Saved programs on page {page} of {pages} · {result.programs.length} of{" "}
        {totalPrograms} programs · evaluated {result.evaluatedOn} UTC. Metrics
        and exports cover this page. Downloads re-read saved revisions.
      </p>
      <div className="assurance-metrics company-dashboard-metrics">
        {[
          ["Open actions", result.totals.open],
          ["Overdue actions", result.totals.overdue],
          ["Awaiting review", result.totals.review],
          ["Critical risks", result.totals.critical],
          ["Assessments needed", result.totals.unassessed],
          ["Stale evidence", result.totals.evidenceGaps],
        ].map(([label, value]) => (
          <section className="form-card" key={label}>
            <strong>{value}</strong>
            <p>{label}</p>
          </section>
        ))}
      </div>
      <section className="form-card">
        <h2>Contract capacity</h2>
        <p>
          {totalPrograms} / {organization.max_programs} programs ·{" "}
          {members.filter((member) => member.active).length} /{" "}
          {organization.max_members} active seats.
        </p>
        <p>
          <Link href="/plans">Plan a larger rollout</Link> · Access through{" "}
          {new Date(organization.access_until).toISOString().slice(0, 10)} UTC ·{" "}
          {organization.entitlement}.
        </p>
      </section>
      <PortfolioQueue
        org={org}
        exceptions={result.exceptions}
        total={result.exceptionCount}
      />
      <section className="form-card">
        <h2>Program health</h2>
        {!result.programs.length ? (
          <p>
            No saved programs yet.{" "}
            <Link href={`/workspace/${org}#playbooks`}>
              Start with a playbook.
            </Link>
          </p>
        ) : (
          <div className="company-table-scroll">
            <table className="company-table">
              <caption>Saved revisions on this page</caption>
              <thead>
                <tr>
                  <th scope="col">Program</th>
                  <th scope="col">Revision</th>
                  <th scope="col">Open</th>
                  <th scope="col">Overdue</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {result.programs.map((program) => (
                  <tr key={program.id}>
                    <th scope="row">
                      <Link href={`/workspace/${org}/programs/${program.id}`}>
                        {program.name}
                      </Link>
                    </th>
                    <td>{program.revision}</td>
                    <td>{program.open}</td>
                    <td>{program.overdue}</td>
                    <td>{program.review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <nav className="studio-toolbar" aria-label="Portfolio pages">
        {page > 1 ? (
          <Link className="btn" href={`${base}?page=${page - 1}`}>
            Previous programs
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="btn" href={`${base}?page=${page + 1}`}>
            Next programs
          </Link>
        ) : null}
      </nav>
      <p className="fine">
        Risk scores use supplied facts and judgments. A clear inbox does not
        establish compliance or prove that all risks are known. Calendar exports
        are one-time snapshots of open-action deadlines on this page. Use a
        dedicated calendar; re-import behaviour varies by app.
      </p>
    </>
  );
}
