import Link from "next/link";
import { loadProgramChanges } from "@/lib/enterprise/changes";
import { PrintButton } from "@/components/PrintButton";

const value = (input: unknown) => {
  const text =
    input == null
      ? "Not present"
      : typeof input === "string"
        ? input || "Empty"
        : (JSON.stringify(input) ?? "Not present");
  return text.length > 260 ? text.slice(0, 260) + "…" : text;
};
export default async function Changes({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const [{ org, id }, search] = await Promise.all([params, searchParams]);
  const report = await loadProgramChanges(org, id, search.from, search.to),
    diff = report.comparison;
  const base = `/workspace/${org}/programs/${id}/changes`;
  return (
    <article className="revision-digest">
      <div className="studio-toolbar no-print">
        <Link className="btn" href={`/workspace/${org}/programs/${id}`}>
          ← Program
        </Link>
        <PrintButton />
        <a
          className="btn"
          href={`${base}/export?from=${report.from}&to=${report.to}`}
        >
          Download sealed change report
        </a>
      </div>
      <p className="kicker">Preserved revision comparison</p>
      <h1>What changed in {report.program.name}</h1>
      <p className="lede">
        Compare the work, evidence and judgments behind two saved revisions.
      </p>
      <form className="revision-selector no-print" method="get">
        <label>
          From revision
          <input
            name="from"
            type="number"
            min={1}
            max={report.program.revision}
            defaultValue={report.from}
            required
          />
        </label>
        <label>
          To revision
          <input
            name="to"
            type="number"
            min={1}
            max={report.program.revision}
            defaultValue={report.to}
            required
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Compare revisions
        </button>
      </form>
      {report.from === report.to ? (
        <p className="company-notice">
          Choose two different preserved revisions to see changes. The first
          save establishes the baseline.
        </p>
      ) : null}
      <div className="revision-scorecards">
        {[
          ["Added", diff.added],
          ["Changed", diff.changed],
          ["Removed", diff.removed],
          ["Settings", diff.settings.length],
        ].map(([label, count]) => (
          <section key={label} className="form-card">
            <strong>{count}</strong>
            <span>{label}</span>
          </section>
        ))}
      </div>
      <div className="revision-source-grid">
        {[
          ["Before", report.before],
          ["After", report.after],
        ].map(([label, source]) => {
          const entry = source as typeof report.before;
          return (
            <section className="form-card" key={label as string}>
              <p className="kicker">{label as string}</p>
              <h2>Revision {entry.revision}</h2>
              <p>{entry.reason}</p>
              <p className="fine">
                Saved {entry.recordedAt}
                <br />
                Authenticated actor: {entry.actorId}
              </p>
            </section>
          );
        })}
      </div>
      <section className="form-card">
        <h2>Effect on the work queue</h2>
        <div className="company-table-scroll">
          <table className="company-table">
            <caption>Both revisions evaluated {diff.evaluatedOn} UTC</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Overdue actions", "overdue"],
                  ["Awaiting review", "review"],
                  ["Critical risks", "critical"],
                  ["Unassessed risks", "unassessed"],
                  ["Stale evidence", "staleEvidence"],
                  ["Completed actions", "complete"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{diff.before[key]}</td>
                  <td>{diff.after[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {diff.settings.length ? (
        <section className="form-card">
          <h2>Program settings</h2>
          {diff.settings.map((field) => (
            <div className="revision-field" key={field.name}>
              <strong>{field.name}</strong>
              <span>Before: {value(field.before)}</span>
              <span>After: {value(field.after)}</span>
            </div>
          ))}
        </section>
      ) : null}
      <section className="form-card">
        <h2>Evidence and work changes</h2>
        {!diff.changes.length ? (
          <p>
            No evidence, risk or action changes between these saved revisions.
          </p>
        ) : (
          diff.changes.slice(0, 50).map((change) => (
            <section
              className="revision-entry"
              key={`${change.kind}:${change.id}`}
            >
              <div className="revision-entry-label">
                <span className={`change-tag change-${change.change}`}>
                  {change.change}
                </span>
                <span>
                  {change.kind} · {change.id}
                </span>
              </div>
              <h3>{change.title}</h3>
              {change.fields.map((field) => (
                <div className="revision-field" key={field.name}>
                  <strong>{field.name}</strong>
                  <span>Before: {value(field.before)}</span>
                  <span>After: {value(field.after)}</span>
                </div>
              ))}
            </section>
          ))
        )}
        <p className="fine">
          Showing up to 50 changed records. The sealed download includes all
          changes and full field values. Long values are shortened here. These
          are stored changes, not a new approval or a compliance determination.
        </p>
      </section>
    </article>
  );
}
