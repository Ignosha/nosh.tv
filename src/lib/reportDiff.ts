import type { ReportDocument } from "./reportStudio";
import { canonical } from "./fingerprint";
export type ReportChange = {
  section: string;
  id: string;
  kind: "added" | "removed" | "changed";
  before: unknown;
  after: unknown;
};
export function compareReports(
  before: ReportDocument,
  after: ReportDocument,
): ReportChange[] {
  const changes: ReportChange[] = [];
  for (const key of [
    "template",
    "title",
    "organization",
    "accent",
    "matterReference",
    "preparedFor",
    "author",
    "reviewer",
    "scope",
    "methodology",
    "limitations",
    "conclusion",
    "checks",
  ] as const) {
    if (canonical(before[key]) !== canonical(after[key]))
      changes.push({
        section: "Report",
        id: key,
        kind: "changed",
        before: before[key],
        after: after[key],
      });
  }
  for (const section of ["sources", "findings"] as const) {
    const oldRows = new Map(before[section].map((row) => [row.id, row]));
    const newRows = new Map(after[section].map((row) => [row.id, row]));
    for (const id of new Set([...oldRows.keys(), ...newRows.keys()])) {
      const old = oldRows.get(id),
        next = newRows.get(id);
      if (canonical(old ?? null) !== canonical(next ?? null))
        changes.push({
          section,
          id,
          kind: old ? (next ? "changed" : "removed") : "added",
          before: old ?? null,
          after: next ?? null,
        });
    }
  }
  return changes;
}
