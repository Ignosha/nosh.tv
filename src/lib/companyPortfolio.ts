import {
  csvCell,
  evidenceFresh,
  parseAssurance,
  portfolio,
  validDate,
} from "./assurance";

export const PORTFOLIO_PAGE_SIZE = 20;
export const MAX_PORTFOLIO_EXCEPTIONS = 500;
export type PortfolioMember = { id: string; label: string; active: boolean };
export type PortfolioProgram = {
  id: string;
  revision: number;
  workspace: unknown;
  updated_at: string;
};
export type ExceptionKind =
  | "overdue"
  | "blocked"
  | "review"
  | "evidence"
  | "risk"
  | "assessment"
  | "owner";
export type PortfolioException = {
  key: string;
  programId: string;
  program: string;
  revision: number;
  kind: ExceptionKind;
  title: string;
  detail: string;
  owner: string;
  ownerLabel: string;
  dueDate: string | null;
  priority: number;
};
export type PortfolioSummary = {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
  risks: number;
  unassessed: number;
  critical: number;
  open: number;
  overdue: number;
  blocked: number;
  review: number;
  evidenceGaps: number;
  complete: number;
};
export type EvidenceRequest = {
  programId: string;
  program: string;
  revision: number;
  actionId: string;
  action: string;
  owner: string;
  dueDate: string;
  status: string;
  dependencies: string;
  sourceCount: number;
};
export type CompanyPortfolio = {
  evaluatedOn: string;
  programs: PortfolioSummary[];
  exceptions: PortfolioException[];
  exceptionCount: number;
  requests: EvidenceRequest[];
  totals: {
    programs: number;
    risks: number;
    unassessed: number;
    critical: number;
    open: number;
    overdue: number;
    blocked: number;
    review: number;
    evidenceGaps: number;
    complete: number;
  };
};

export function portfolioPage(value: unknown): number {
  const page =
    typeof value === "string" && /^[1-9]\d{0,3}$/.test(value)
      ? Number(value)
      : 1;
  return Math.min(page, 500);
}

/** Evaluates saved revisions only; no cross-company state or inferred approvals. */
export function companyPortfolio(
  rows: PortfolioProgram[],
  members: PortfolioMember[],
  today: string,
): CompanyPortfolio {
  if (!validDate(today) || rows.length > PORTFOLIO_PAGE_SIZE)
    throw new Error("Invalid portfolio scope");
  const identities = new Map(members.map((member) => [member.id, member]));
  const exceptions: PortfolioException[] = [],
    requests: EvidenceRequest[] = [];
  const programs = rows.map((row) => {
    const w = parseAssurance(row.workspace),
      p = portfolio(w, today);
    if (
      !Number.isSafeInteger(row.revision) ||
      row.revision < 1 ||
      !Number.isFinite(Date.parse(row.updated_at))
    )
      throw new Error("Invalid saved revision");
    const add = (
      kind: ExceptionKind,
      id: string,
      title: string,
      owner: string,
      priority: number,
      detail: string,
      dueDate: string | null = null,
    ) => {
      const identity = identities.get(owner);
      exceptions.push({
        key: `${row.id}:${kind}:${id}`,
        programId: row.id,
        program: w.name,
        revision: row.revision,
        kind,
        title,
        detail,
        owner,
        ownerLabel: identity
          ? identity.label + (identity.active ? "" : " (inactive)")
          : "Member unavailable",
        priority,
        dueDate,
      });
    };
    const inactive = new Set<string>();
    const checkOwner = (owner: string) => {
      if (!identities.get(owner)?.active && !inactive.has(owner)) {
        inactive.add(owner);
        add(
          "owner",
          owner,
          "Reassign work from an unavailable owner",
          owner,
          4,
          "The saved owner is no longer an active member. Assign an active member before relying on the work queue.",
        );
      }
    };
    checkOwner(w.owner);
    for (const risk of p.risks) {
      checkOwner(risk.owner);
      if (!risk.assessed)
        add(
          "assessment",
          risk.id,
          risk.title,
          risk.owner,
          2,
          "Record the assessment and current evidence before relying on this risk's control score.",
        );
      else if (["critical", "high"].includes(risk.band))
        add(
          "risk",
          risk.id,
          risk.title,
          risk.owner,
          risk.band === "critical" ? 5 : 4,
          `${risk.band} residual score ${risk.residual}/25, based on supplied judgments and current evidence.`,
        );
    }
    for (const action of w.actions) {
      if (action.status === "complete") continue;
      checkOwner(action.owner);
      const blocked = action.dependsOn.filter(
        (id) => w.actions.find((item) => item.id === id)?.status !== "complete",
      );
      if (action.dueDate < today)
        add(
          "overdue",
          action.id,
          action.title,
          action.owner,
          5,
          "The saved due date has passed and the action is not complete.",
          action.dueDate,
        );
      if (blocked.length)
        add(
          "blocked",
          action.id,
          action.title,
          action.owner,
          3,
          `${blocked.length} prerequisite action(s) still need completion.`,
          action.dueDate,
        );
      if (action.status === "review")
        add(
          "review",
          action.id,
          action.title,
          action.owner,
          4,
          "A different authorized reviewer must inspect the evidence and approve closure in the program.",
          action.dueDate,
        );
      requests.push({
        programId: row.id,
        program: w.name,
        revision: row.revision,
        actionId: action.id,
        action: action.title,
        owner: identities.get(action.owner)?.label ?? "Member unavailable",
        dueDate: action.dueDate,
        status: action.status,
        dependencies: blocked.join("; "),
        sourceCount: action.evidenceIds.length,
      });
    }
    for (const evidence of w.evidence) {
      if (!evidenceFresh(evidence, w.freshnessDays, today))
        add(
          "evidence",
          evidence.id,
          evidence.title,
          w.owner,
          3,
          evidence.observedAt > today
            ? "The observation is future-dated and cannot support current evidence credit."
            : `Evidence is outside the ${w.freshnessDays}-day freshness window.`,
        );
    }
    return {
      id: row.id,
      name: w.name,
      revision: row.revision,
      updatedAt: row.updated_at,
      risks: w.risks.length,
      unassessed: w.risks.filter((risk) => !risk.assessed).length,
      critical: p.critical,
      open: w.actions.length - p.complete,
      overdue: p.overdue.length,
      blocked: p.blocked.length,
      review: p.awaitingReview,
      evidenceGaps: p.staleEvidence.length,
      complete: p.complete,
    };
  });
  exceptions.sort(
    (a, b) =>
      b.priority - a.priority ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      a.key.localeCompare(b.key),
  );
  requests.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      a.programId.localeCompare(b.programId) ||
      a.actionId.localeCompare(b.actionId),
  );
  const totals = {
    programs: programs.length,
    risks: 0,
    unassessed: 0,
    critical: 0,
    open: 0,
    overdue: 0,
    blocked: 0,
    review: 0,
    evidenceGaps: 0,
    complete: 0,
  };
  for (const program of programs)
    for (const key of [
      "risks",
      "unassessed",
      "critical",
      "open",
      "overdue",
      "blocked",
      "review",
      "evidenceGaps",
      "complete",
    ] as const)
      totals[key] += program[key];
  return {
    evaluatedOn: today,
    programs,
    exceptions: exceptions.slice(0, MAX_PORTFOLIO_EXCEPTIONS),
    exceptionCount: exceptions.length,
    requests,
    totals,
  };
}

export function* evidenceRequestCsvLines(
  requests: EvidenceRequest[],
): Generator<string> {
  yield [
    "Program",
    "Program ID",
    "Saved revision",
    "Action",
    "Action ID",
    "Owner",
    "Due date UTC",
    "Status",
    "Incomplete prerequisites",
    "Linked sources",
  ]
    .map(csvCell)
    .join(",") + "\r\n";
  for (const row of requests)
    yield [
      row.program,
      row.programId,
      row.revision,
      row.action,
      row.actionId,
      row.owner,
      row.dueDate,
      row.status,
      row.dependencies,
      row.sourceCount,
    ]
      .map(csvCell)
      .join(",") + "\r\n";
}
export function evidenceRequestsCsv(requests: EvidenceRequest[]): string {
  return Array.from(evidenceRequestCsvLines(requests)).join("");
}
