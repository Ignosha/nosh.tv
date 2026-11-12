import {
  parseAssurance,
  portfolio,
  validDate,
  type Assurance,
} from "./assurance";
import { canonical } from "./fingerprint";

export type ChangedField = { name: string; before: unknown; after: unknown };
export type EntityChange = {
  kind: "evidence" | "risk" | "action";
  id: string;
  title: string;
  change: "added" | "removed" | "changed";
  fields: ChangedField[];
};
const summary = (workspace: Assurance, today: string) => {
  const p = portfolio(workspace, today);
  return {
    risks: workspace.risks.length,
    unassessed: workspace.risks.filter((risk) => !risk.assessed).length,
    critical: p.critical,
    overdue: p.overdue.length,
    blocked: p.blocked.length,
    review: p.awaitingReview,
    staleEvidence: p.staleEvidence.length,
    complete: p.complete,
  };
};

/** Stable IDs preserve additions/deletions without confusing reordered arrays with edits. */
export function comparePrograms(
  beforeInput: unknown,
  afterInput: unknown,
  today: string,
) {
  if (!validDate(today)) throw new Error("Invalid comparison date");
  const before = parseAssurance(beforeInput),
    after = parseAssurance(afterInput);
  const changes: EntityChange[] = [];
  const settings = (["name", "owner", "freshnessDays"] as const)
    .filter((name) => before[name] !== after[name])
    .map((name) => ({ name, before: before[name], after: after[name] }));
  for (const [kind, oldRows, newRows] of [
    ["evidence", before.evidence, after.evidence],
    ["risk", before.risks, after.risks],
    ["action", before.actions, after.actions],
  ] as const) {
    const oldById = new Map<string, Record<string, unknown>>(
      oldRows.map((row) => [row.id, { ...row }]),
    );
    const newById = new Map<string, Record<string, unknown>>(
      newRows.map((row) => [row.id, { ...row }]),
    );
    for (const id of [
      ...new Set([...oldById.keys(), ...newById.keys()]),
    ].sort()) {
      const oldRow = oldById.get(id),
        newRow = newById.get(id);
      if (!oldRow || !newRow) {
        const row = newRow ?? oldRow!;
        changes.push({
          kind,
          id,
          title: String(row.title),
          change: newRow ? "added" : "removed",
          fields: Object.keys(row)
            .filter((name) => name !== "id")
            .sort()
            .map((name) => ({
              name,
              before: oldRow?.[name] ?? null,
              after: newRow?.[name] ?? null,
            })),
        });
      } else {
        const fields = Object.keys(newRow)
          .filter(
            (name) =>
              name !== "id" &&
              canonical(oldRow[name]) !== canonical(newRow[name]),
          )
          .sort()
          .map((name) => ({ name, before: oldRow[name], after: newRow[name] }));
        if (fields.length)
          changes.push({
            kind,
            id,
            title: String(newRow.title),
            change: "changed",
            fields,
          });
      }
    }
  }
  return {
    evaluatedOn: today,
    settings,
    changes,
    added: changes.filter((row) => row.change === "added").length,
    removed: changes.filter((row) => row.change === "removed").length,
    changed: changes.filter((row) => row.change === "changed").length,
    before: summary(before, today),
    after: summary(after, today),
  };
}

export function revisionNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !/^[1-9]\d{0,9}$/.test(value))
    throw new Error("Invalid revision");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 2147483647)
    throw new Error("Invalid revision");
  return number;
}
