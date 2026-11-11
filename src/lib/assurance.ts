/** Explainable planning model. Scores reflect operator inputs, not a certification or loss forecast. */
export type Evidence = {
  id: string;
  title: string;
  reference: string;
  sha256: string;
  observedAt: string;
};
export type Risk = {
  id: string;
  title: string;
  owner: string;
  likelihood: number;
  impact: number;
  controlEffectiveness: number;
  control: string;
  assessed: boolean;
  evidenceIds: string[];
};
export type ActionStatus = "open" | "in_progress" | "review" | "complete";
export type Action = {
  id: string;
  riskId: string;
  title: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
  dependsOn: string[];
  evidenceIds: string[];
  reviewer: string;
  resolution: string;
  completedAt: string | null;
  recurrenceDays: number;
  series: string;
  cycle: number;
};
export type Assurance = {
  format: "TraceSworn Assurance v1";
  name: string;
  owner: string;
  freshnessDays: number;
  evidence: Evidence[];
  risks: Risk[];
  actions: Action[];
};
export function newAssurance(): Assurance {
  return {
    format: "TraceSworn Assurance v1",
    name: "",
    owner: "",
    freshnessDays: 90,
    evidence: [],
    risks: [],
    actions: [],
  };
}
function string(v: unknown, max = 500): string {
  if (typeof v !== "string" || v.length > max)
    throw new Error(`Expected text up to ${max} characters`);
  return v.trim();
}
function integer(v: unknown, min: number, max: number): number {
  if (!Number.isInteger(v) || Number(v) < min || Number(v) > max)
    throw new Error(`Expected an integer from ${min} to ${max}`);
  return Number(v);
}
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Expected an object");
  return v as Record<string, unknown>;
}
function list(v: unknown, max = 200): unknown[] {
  if (!Array.isArray(v) || v.length > max)
    throw new Error(`Expected an array with up to ${max} entries`);
  return v;
}
function ids(v: unknown): string[] {
  const values = list(v, 200).map((x) => string(x, 120));
  if (new Set(values).size !== values.length)
    throw new Error("Duplicate references");
  return values;
}
function unique(rows: { id: string }[]) {
  if (
    rows.some((r) => !r.id) ||
    new Set(rows.map((r) => r.id)).size !== rows.length
  )
    throw new Error("Identifiers must be nonempty and unique");
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function addDays(date: string, days: number): string {
  if (!validDate(date)) throw new Error("Invalid calendar date");
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function evidenceFresh(
  e: Evidence,
  days: number,
  today: string,
): boolean {
  return (
    validDate(e.observedAt) &&
    e.observedAt <= today &&
    addDays(e.observedAt, days) >= today &&
    !!(e.reference || e.sha256)
  );
}
export function riskScore(
  risk: Risk,
  w: Assurance,
  today = new Date().toISOString().slice(0, 10),
) {
  const evidenceValid =
    risk.evidenceIds.length > 0 &&
    risk.evidenceIds.every((id) => {
      const e = w.evidence.find((e) => e.id === id);
      return e && evidenceFresh(e, w.freshnessDays, today);
    });
  const inherent = risk.likelihood * risk.impact;
  const creditedEffectiveness =
    evidenceValid && risk.assessed && risk.control.trim()
      ? risk.controlEffectiveness
      : 0;
  const residual = Math.max(
    1,
    Math.ceil((inherent * (100 - creditedEffectiveness)) / 100),
  );
  return {
    inherent,
    residual,
    creditedEffectiveness,
    evidenceValid,
    band: !risk.assessed
      ? "unassessed"
      : residual >= 20
        ? "critical"
        : residual >= 12
          ? "high"
          : residual >= 6
            ? "medium"
            : "low",
  };
}
export function topologicalActions(actions: Action[]): Action[] {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const seen = new Set<string>(),
    visiting = new Set<string>(),
    out: Action[] = [];
  function visit(id: string) {
    if (visiting.has(id)) throw new Error("Circular action dependencies");
    if (seen.has(id)) return;
    const a = byId.get(id);
    if (!a) throw new Error("Action references a missing dependency");
    visiting.add(id);
    a.dependsOn.forEach(visit);
    visiting.delete(id);
    seen.add(id);
    out.push(a);
  }
  actions.forEach((a) => visit(a.id));
  return out;
}
export function parseAssurance(input: unknown): Assurance {
  const v = object(input);
  if (v.format !== "TraceSworn Assurance v1")
    throw new Error("Unsupported assurance workspace");
  const evidence = list(v.evidence).map((x) => {
    const e = object(x);
    const reference = string(e.reference, 2000),
      sha256 = string(e.sha256, 64).toLowerCase();
    if (reference) {
      const u = new URL(reference);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Error(
          "Evidence references require HTTPS without credentials",
        );
    }
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256))
      throw new Error("Invalid evidence fingerprint");
    const observedAt = string(e.observedAt, 10);
    if (!validDate(observedAt))
      throw new Error("Evidence needs a valid observation date");
    const title = string(e.title, 200);
    if (!title || (!reference && !sha256))
      throw new Error("Evidence needs a title and a reference or fingerprint");
    return { id: string(e.id, 120), title, reference, sha256, observedAt };
  });
  unique(evidence);
  const evidenceSet = new Set(evidence.map((e) => e.id));
  const refs = (input: unknown) => {
    const values = ids(input);
    if (values.some((id) => !evidenceSet.has(id)))
      throw new Error("Missing evidence reference");
    return values;
  };
  const risks = list(v.risks).map((x) => {
    const r = object(x);
    const title = string(r.title, 200),
      owner = string(r.owner, 120);
    if (!title || !owner) throw new Error("Risk title and owner are required");
    return {
      id: string(r.id, 120),
      title,
      owner,
      likelihood: integer(r.likelihood, 1, 5),
      impact: integer(r.impact, 1, 5),
      controlEffectiveness: integer(r.controlEffectiveness, 0, 100),
      control: string(r.control, 4000),
      assessed: r.assessed === true,
      evidenceIds: refs(r.evidenceIds),
    };
  });
  unique(risks);
  const riskIds = new Set(risks.map((r) => r.id));
  const actions = list(v.actions, 500).map((x) => {
    const a = object(x);
    const dueDate = string(a.dueDate, 10);
    if (!validDate(dueDate)) throw new Error("Actions need valid due dates");
    const status = string(a.status) as ActionStatus;
    if (!["open", "in_progress", "review", "complete"].includes(status))
      throw new Error("Invalid action status");
    const riskId = string(a.riskId, 120);
    if (riskId && !riskIds.has(riskId))
      throw new Error("Action references a missing risk");
    const title = string(a.title, 200),
      owner = string(a.owner, 120);
    if (!title || !owner)
      throw new Error("Action title and owner are required");
    const completedAt =
      a.completedAt === null ? null : string(a.completedAt, 40);
    if (completedAt && !Number.isFinite(Date.parse(completedAt)))
      throw new Error("Invalid completion timestamp");
    return {
      id: string(a.id, 120),
      riskId,
      title,
      owner,
      dueDate,
      status,
      dependsOn: ids(a.dependsOn),
      evidenceIds: refs(a.evidenceIds),
      reviewer: string(a.reviewer, 120),
      resolution: string(a.resolution, 4000),
      completedAt,
      recurrenceDays: integer(a.recurrenceDays, 0, 365),
      series: string(a.series, 100),
      cycle: integer(a.cycle, 0, 100000),
    };
  });
  unique(actions);
  topologicalActions(actions);
  for (const a of actions) {
    if (
      a.status === "complete" &&
      (!a.completedAt ||
        !a.resolution ||
        !a.reviewer ||
        a.reviewer.toLowerCase() === a.owner.toLowerCase() ||
        !a.evidenceIds.length ||
        a.dependsOn.some(
          (id) => actions.find((t) => t.id === id)?.status !== "complete",
        ))
    )
      throw new Error(
        "Completed actions require evidence, resolution, a distinct reviewer and completed dependencies",
      );
    if (a.status !== "complete" && a.completedAt)
      throw new Error("Only completed actions may have a completion timestamp");
  }
  const name = string(v.name, 200),
    owner = string(v.owner, 120);
  if (!name || !owner)
    throw new Error("Workspace name and accountable owner required");
  const result: Assurance = {
    format: "TraceSworn Assurance v1",
    name,
    owner,
    freshnessDays: integer(v.freshnessDays, 1, 3650),
    evidence,
    risks,
    actions,
  };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 600000)
    throw new Error(
      "Workspace exceeds 600 KB; reduce detail or split programs",
    );
  return result;
}
export function transitionAction(
  input: Assurance,
  id: string,
  to: ActionStatus,
  reviewer = "",
  resolution = "",
  now = new Date(),
): Assurance {
  const w = parseAssurance(input);
  const action = w.actions.find((a) => a.id === id);
  if (!action) throw new Error("Action not found");
  const allowed: Record<ActionStatus, ActionStatus[]> = {
    open: ["in_progress"],
    in_progress: ["review", "open"],
    review: ["complete", "in_progress"],
    complete: ["in_progress"],
  };
  if (!allowed[action.status].includes(to))
    throw new Error("Invalid workflow transition");
  if (
    action.status === "complete" &&
    w.actions.some((a) => a.status === "complete" && a.dependsOn.includes(id))
  )
    throw new Error("Reopen completed dependent actions first");
  if (to === "complete") {
    if (
      !reviewer.trim() ||
      reviewer.trim().toLowerCase() === action.owner.toLowerCase() ||
      !resolution.trim() ||
      !action.evidenceIds.length
    )
      throw new Error(
        "Closure requires a distinct reviewer, resolution and evidence",
      );
    if (
      action.dependsOn.some(
        (id) => w.actions.find((a) => a.id === id)?.status !== "complete",
      )
    )
      throw new Error("Complete dependencies before closing this action");
    const today = now.toISOString().slice(0, 10);
    if (
      action.evidenceIds.some(
        (id) =>
          !evidenceFresh(
            w.evidence.find((e) => e.id === id)!,
            w.freshnessDays,
            today,
          ),
      )
    )
      throw new Error("Closure evidence is stale or future-dated");
    action.reviewer = reviewer.trim();
    action.resolution = resolution.trim();
    action.completedAt = now.toISOString();
    if (action.recurrenceDays) {
      const series = action.series || action.id;
      if (series.length > 100)
        throw new Error("Recurring action series identifier is too long");
      const nextId = `${series}:r${action.cycle + 1}`;
      if (!w.actions.some((a) => a.id === nextId))
        w.actions.push({
          ...action,
          id: nextId,
          series,
          cycle: action.cycle + 1,
          dueDate: addDays(action.dueDate, action.recurrenceDays),
          status: "open",
          dependsOn: [action.id],
          evidenceIds: [],
          reviewer: "",
          resolution: "",
          completedAt: null,
        });
    }
  } else {
    action.reviewer = "";
    action.resolution = "";
    action.completedAt = null;
  }
  action.status = to;
  return parseAssurance(w);
}
export function portfolio(
  w: Assurance,
  today = new Date().toISOString().slice(0, 10),
) {
  const risks = w.risks
    .map((r) => ({ ...r, ...riskScore(r, w, today) }))
    .sort((a, b) => b.residual - a.residual);
  const overdue = w.actions.filter(
    (a) => a.status !== "complete" && a.dueDate < today,
  );
  const blocked = w.actions.filter(
    (a) =>
      a.status !== "complete" &&
      a.dependsOn.some(
        (id) => w.actions.find((d) => d.id === id)?.status !== "complete",
      ),
  );
  return {
    risks,
    overdue,
    blocked,
    staleEvidence: w.evidence.filter(
      (e) => !evidenceFresh(e, w.freshnessDays, today),
    ),
    critical: risks.filter((r) => r.band === "critical").length,
    awaitingReview: w.actions.filter((a) => a.status === "review").length,
    complete: w.actions.filter((a) => a.status === "complete").length,
  };
}
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function exportActionsCsv(w: Assurance): string {
  return [
    [
      "ID",
      "Action",
      "Owner",
      "Due date",
      "Status",
      "Risk",
      "Dependencies",
      "Reviewer",
      "Resolution",
    ],
    ...w.actions.map((a) => [
      a.id,
      a.title,
      a.owner,
      a.dueDate,
      a.status,
      a.riskId,
      a.dependsOn.join(";"),
      a.reviewer,
      a.resolution,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function ownerWorkload(
  w: Assurance,
  today = new Date().toISOString().slice(0, 10),
) {
  const summary = portfolio(w, today);
  const owners = [
    ...new Set([
      ...w.risks.map((r) => r.owner),
      ...w.actions.map((a) => a.owner),
    ]),
  ].sort();
  return owners.map((owner) => ({
    owner,
    risks: w.risks.filter((r) => r.owner === owner).length,
    open: w.actions.filter((a) => a.owner === owner && a.status !== "complete")
      .length,
    overdue: summary.overdue.filter((a) => a.owner === owner).length,
    blocked: summary.blocked.filter((a) => a.owner === owner).length,
    review: w.actions.filter((a) => a.owner === owner && a.status === "review")
      .length,
  }));
}
export const POLICY_PACKS = [
  {
    id: "crypto-matter",
    name: "Crypto matter screening",
    freshnessDays: 30,
    risks: [
      "Relevant wallets or exchange records may be missing",
      "Asset attribution and valuation lack corroborating evidence",
      "Material tracing exceptions remain unresolved",
    ],
    tasks: [
      "Collect matter scope, key dates and supplied wallet or exchange records",
      "Review sourced balances, attribution limitations and tracing exceptions",
      "Resolve exceptions and prepare the independently reviewed evidence pack",
    ],
    recurrence: 30,
  },
  {
    id: "access-review",
    name: "Quarterly access review",
    freshnessDays: 90,
    risks: [
      "System access inventory is incomplete",
      "Privileged access lacks an accountable review",
      "Departed or reassigned users retain unnecessary access",
    ],
    tasks: [
      "Collect current system, membership and privileged-access inventories",
      "Review access against current responsibilities with a separate approver",
      "Record revocations, resolve exceptions and preserve review evidence",
    ],
    recurrence: 90,
  },
  {
    id: "incident-evidence",
    name: "Incident evidence response",
    freshnessDays: 7,
    risks: [
      "Relevant incident records may be lost or altered",
      "Incident scope and timeline lack corroborating sources",
      "Corrective actions lack verified closure",
    ],
    tasks: [
      "Preserve relevant source records and record their provenance",
      "Review the incident timeline, source integrity and unresolved questions",
      "Document corrective actions and obtain independent closure review",
    ],
    recurrence: 30,
  },
  {
    id: "vendor-oversight",
    name: "Vendor oversight",
    freshnessDays: 90,
    risks: [
      "Supplier evidence is incomplete",
      "Supplier control claims lack review",
      "Supplier exceptions remain unresolved",
    ],
    tasks: [
      "Collect supplier evidence",
      "Review supplier control evidence",
      "Resolve supplier exceptions",
    ],
    recurrence: 90,
  },
  {
    id: "financial-review",
    name: "Financial review",
    freshnessDays: 30,
    risks: [
      "Source records are incomplete",
      "Reconciliation findings lack review",
      "Financial exceptions remain unresolved",
    ],
    tasks: [
      "Collect source records",
      "Review reconciliation evidence",
      "Resolve financial exceptions",
    ],
    recurrence: 30,
  },
] as const;
export function applyPolicyPack(
  input: Assurance,
  packId: string,
  startDate: string,
): Assurance {
  const w = parseAssurance(input),
    pack = POLICY_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error("Unknown policy pack");
  if (!validDate(startDate))
    throw new Error("Choose a valid policy start date");
  if (w.risks.some((r) => r.id.startsWith(pack.id + ":")))
    throw new Error("This policy pack is already applied");
  // A new playbook must not silently loosen an existing evidence window.
  w.freshnessDays = Math.min(w.freshnessDays, pack.freshnessDays);
  pack.risks.forEach((title, i) =>
    w.risks.push({
      id: `${pack.id}:risk:${i}`,
      title,
      owner: w.owner,
      likelihood: 3,
      impact: 3,
      assessed: false,
      control: "",
      controlEffectiveness: 0,
      evidenceIds: [],
    }),
  );
  pack.tasks.forEach((title, i) =>
    w.actions.push({
      id: `${pack.id}:action:${i}`,
      riskId: `${pack.id}:risk:${i}`,
      title,
      owner: w.owner,
      dueDate: addDays(startDate, i * 7),
      status: "open",
      dependsOn: i ? [`${pack.id}:action:${i - 1}`] : [],
      evidenceIds: [],
      reviewer: "",
      resolution: "",
      completedAt: null,
      recurrenceDays: i === 1 ? pack.recurrence : 0,
      series: "",
      cycle: 0,
    }),
  );
  return parseAssurance(w);
}
