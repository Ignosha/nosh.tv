"use client";
import Link from "next/link";
import { useState } from "react";
import type { PortfolioException, ExceptionKind } from "@/lib/companyPortfolio";

const kinds: { id: ExceptionKind; label: string }[] = [
  { id: "overdue", label: "Overdue actions" },
  { id: "blocked", label: "Blocked work" },
  { id: "review", label: "Awaiting review" },
  { id: "evidence", label: "Stale evidence" },
  { id: "risk", label: "High or critical risks" },
  { id: "assessment", label: "Assessments needed" },
  { id: "owner", label: "Unavailable owners" },
];
export function PortfolioQueue({
  org,
  exceptions,
  total,
}: {
  org: string;
  exceptions: PortfolioException[];
  total: number;
}) {
  const [kind, setKind] = useState("all"),
    [query, setQuery] = useState(""),
    [mine, setMine] = useState("all"),
    [limit, setLimit] = useState(30);
  const owners = [
    ...new Map(
      exceptions.map((item) => [item.owner, item.ownerLabel]),
    ).entries(),
  ];
  const needle = query.trim().toLocaleLowerCase();
  const filtered = exceptions.filter(
    (item) =>
      (kind === "all" || item.kind === kind) &&
      (mine === "all" || item.owner === mine) &&
      (!needle ||
        `${item.title} ${item.program} ${item.ownerLabel}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
  return (
    <section className="form-card">
      <h2>Exception inbox</h2>
      <p>
        Open the program to inspect evidence, change assignments or complete
        independent review.
      </p>
      <div className="company-filter-grid no-print">
        <label>
          Exception type
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              setLimit(30);
            }}
          >
            <option value="all">All types</option>
            {kinds.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select
            value={mine}
            onChange={(event) => {
              setMine(event.target.value);
              setLimit(30);
            }}
          >
            <option value="all">All owners</option>
            {owners.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find work
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(30);
            }}
            placeholder="Program, task or owner"
          />
        </label>
      </div>
      <p className="fine" role="status">
        {filtered.length} matching exceptions · {exceptions.length} loaded
        {total > exceptions.length
          ? ` of ${total}; the highest-priority ${exceptions.length} are included`
          : ""}
        .
      </p>
      {!filtered.length ? (
        <p>No matching exceptions in this page of saved programs.</p>
      ) : (
        <ol className="company-exception-list">
          {filtered.slice(0, limit).map((item) => (
            <li key={item.key}>
              <span className="company-status">
                {kinds.find((kind) => kind.id === item.kind)?.label}
              </span>
              <h3>
                <Link href={`/workspace/${org}/programs/${item.programId}`}>
                  {item.title}
                </Link>
              </h3>
              <p>{item.detail}</p>
              <p className="fine">
                {item.program} · revision {item.revision} · {item.ownerLabel}
                {item.dueDate ? ` · due ${item.dueDate} UTC` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
      {filtered.length > limit ? (
        <button
          className="btn no-print"
          type="button"
          onClick={() => setLimit((value) => value + 30)}
        >
          Show 30 more
        </button>
      ) : null}
    </section>
  );
}
