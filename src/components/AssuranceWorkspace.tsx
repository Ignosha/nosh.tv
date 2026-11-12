"use client";
import {
  useRef,
  useState,
  useEffect,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  newAssurance,
  parseAssurance,
  portfolio,
  ownerWorkload,
  POLICY_PACKS,
  applyPolicyPack,
  transitionAction,
  exportActionsCsv,
  type Assurance,
  type ActionStatus,
} from "@/lib/assurance";
import { seal, verifySealed } from "@/lib/fingerprint";
import { validateIssuedRecord } from "@/lib/reportStudio";
import type { SaveResult } from "@/lib/assuranceStore";
function LazySection({
  title,
  children,
}: {
  title: string;
  children: () => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="no-print"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{title}</summary>
      {open ? children() : null}
    </details>
  );
}
type Identity = { id: string; label: string; active: boolean };
function OwnerField({
  identities,
  name,
  value,
  initial,
  onChange,
  disabled = false,
}: {
  identities?: Identity[];
  name?: string;
  value?: string;
  initial?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const binding =
    value === undefined ? { defaultValue: initial ?? "" } : { value };
  if (!identities)
    return (
      <input
        name={name}
        {...binding}
        onChange={(e) => onChange?.(e.target.value)}
        required
        disabled={disabled}
        maxLength={120}
      />
    );
  const current = value ?? initial ?? "";
  return (
    <select
      name={name}
      {...binding}
      required
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">Choose an active member</option>
      {current && !identities.some((i) => i.id === current && i.active) ? (
        <option value={current} disabled>
          Reassign inactive / unrecognized owner
        </option>
      ) : null}
      {identities
        .filter((i) => i.active)
        .map((i) => (
          <option key={i.id} value={i.id}>
            {i.label}
          </option>
        ))}
    </select>
  );
}
type Props = {
  initial?: Assurance;
  identities?: Identity[];
  verifiedActor?: string;
  allowLocalCompletion?: boolean;
  workspaceBase?: string;
  initialRevision?: number;
  programId?: string;
  readOnly?: boolean;
  evaluationDate?: string;
  persist?: (
    id: string | null,
    revision: number,
    workspace: unknown,
    actor: string,
    reason: string,
  ) => Promise<SaveResult>;
};
function download(value: string, name: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const value = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const selected = (f: FormData, key: string) => f.getAll(key).map(String);
export function AssuranceWorkspace({
  initial,
  identities,
  verifiedActor,
  allowLocalCompletion = true,
  workspaceBase = "/admin/assurance",
  initialRevision = 0,
  programId,
  readOnly = false,
  evaluationDate,
  persist,
}: Props) {
  const [w, setW] = useState<Assurance>(initial ?? newAssurance);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(initialRevision);
  const [id, setId] = useState(programId ?? null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [importGeneration, setImportGeneration] = useState(0);
  const epoch = useRef(0);
  const router = useRouter();
  const today = evaluationDate ?? new Date().toISOString().slice(0, 10);
  const summary = portfolio(w, today);
  const newId = () => crypto.randomUUID();
  const ownerLabel = (id: string) =>
    identities?.find((i) => i.id === id)?.label ?? id;
  useEffect(() => {
    if (initial && initialRevision > revision) {
      if (dirty)
        setError(
          "The server has a newer revision. Export your local draft and reload before reconciling.",
        );
      else {
        setW(initial);
        setRevision(initialRevision);
      }
    }
  }, [initial, initialRevision, revision, dirty]);
  function edit(next: Assurance) {
    if (readOnly) return;
    epoch.current++;
    setW(next);
    setDirty(true);
    setError("");
    setNotice("");
  }
  function apply(next: Assurance) {
    try {
      edit(parseAssurance(next));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid workspace");
      return false;
    }
  }
  function addEvidence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (
      apply({
        ...w,
        evidence: [
          ...w.evidence,
          {
            id: newId(),
            title: value(f, "title"),
            reference: value(f, "reference"),
            sha256: value(f, "sha256"),
            observedAt: value(f, "observedAt"),
          },
        ],
      })
    )
      form.reset();
  }
  function addRisk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    if (
      apply({
        ...w,
        risks: [
          ...w.risks,
          {
            id: newId(),
            title: value(f, "title"),
            owner: value(f, "owner"),
            likelihood: Number(f.get("likelihood")),
            impact: Number(f.get("impact")),
            controlEffectiveness: Number(f.get("effectiveness")),
            control: value(f, "control"),
            assessed: true,
            evidenceIds: selected(f, "evidence"),
          },
        ],
      })
    )
      form.reset();
  }
  function addAction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    if (
      apply({
        ...w,
        actions: [
          ...w.actions,
          {
            id: newId(),
            riskId: value(f, "riskId"),
            title: value(f, "title"),
            owner: value(f, "owner"),
            dueDate: value(f, "dueDate"),
            status: "open",
            dependsOn: selected(f, "dependsOn"),
            evidenceIds: selected(f, "evidence"),
            reviewer: "",
            resolution: "",
            completedAt: null,
            recurrenceDays: Number(f.get("recurrenceDays")),
            series: "",
            cycle: 0,
          },
        ],
      })
    )
      form.reset();
  }
  async function exportWorkspace() {
    setError("");
    try {
      const checked = parseAssurance(w);
      const record = await seal({
        format: "TraceSworn Assurance export v1",
        generatedAt: new Date().toISOString(),
        evaluationDate: today,
        revision,
        workspace: checked,
        model:
          "Operator-scored planning model; not a compliance certification or loss forecast. Actor and reviewer identities are declared.",
      });
      download(JSON.stringify(record), "assurance-workspace.json");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export");
    }
  }
  async function importFile(file: File, report = false) {
    setError("");
    if (file.size > 700000) {
      setError("Import JSON below 700 KB");
      return;
    }
    try {
      const input = JSON.parse(await file.text());
      if (report) {
        const issued = await validateIssuedRecord(input),
          d = issued.record.document,
          prefix = issued.fingerprint.value.slice(0, 12);
        const sources = d.sources.map((s) => ({
          id: `${prefix}:${s.id}`,
          title: s.title,
          reference: s.reference,
          sha256: s.sha256,
          observedAt: s.observedAt.slice(0, 10),
        }));
        const evidence = [
          ...w.evidence,
          ...sources.filter((s) => !w.evidence.some((e) => e.id === s.id)),
        ];
        const risks = d.findings.map((f) => ({
          id: `${prefix}:${f.id}`,
          title: f.observation.slice(0, 200),
          owner: identities ? w.owner : d.author,
          likelihood: 3,
          impact: 3,
          controlEffectiveness: 0,
          control: "",
          assessed: false,
          evidenceIds: f.sourceIds.map((s) => `${prefix}:${s}`),
        }));
        if (
          apply({
            ...w,
            name: w.name || d.title,
            owner: w.owner || d.author,
            evidence,
            risks: [
              ...w.risks,
              ...risks.filter(
                (r) => !w.risks.some((existing) => existing.id === r.id),
              ),
            ],
          })
        ) {
          setImportGeneration((n) => n + 1);
          setNotice(
            "Verified report imported. Imported risks remain unassessed until a reviewer updates the ratings.",
          );
        }
      } else {
        if (input?.record) {
          const checked = await verifySealed(input);
          if (!checked.ok)
            throw new Error("Workspace fingerprint does not match");
        }
        if (
          apply(
            parseAssurance(
              input?.record?.workspace ?? input?.workspace ?? input,
            ),
          )
        )
          setImportGeneration((n) => n + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import");
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!persist) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      atSave = epoch.current;
    try {
      const result = await persist(
        id,
        revision,
        parseAssurance(w),
        value(f, "actor"),
        value(f, "reason"),
      );
      if (result.error) throw new Error(result.error);
      setRevision(result.revision!);
      setId(result.id!);
      if (atSave === epoch.current) setDirty(false);
      setNotice(
        `Hosted revision ${result.revision} saved with an audit snapshot.`,
      );
      if (!id) router.push(`${workspaceBase}/${result.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  const evidenceOptions = w.evidence.map((e) => (
    <option key={e.id} value={e.id}>
      {e.title} · {e.observedAt}
    </option>
  ));
  return (
    <div className="assurance-workspace" key={importGeneration}>
      <div className="no-print notice">
        {readOnly
          ? "Preserved snapshot: editing is disabled. Export and inspect without changing history."
          : persist
            ? "Hosted changes are saved only when you select Save audited revision. Export drafts before resolving a revision conflict."
            : "Local preview: no automatic storage or uploads. Export your workspace before closing or refreshing."}{" "}
        Scores are explained below; they do not certify compliance.
      </div>
      <div className="no-print studio-toolbar">
        <button className="btn" onClick={() => void exportWorkspace()}>
          Export sealed workspace
        </button>
        <button
          className="btn"
          onClick={() =>
            download(exportActionsCsv(w), "remediation-actions.csv", "text/csv")
          }
        >
          Export action CSV
        </button>
        <button className="btn" onClick={() => window.print()}>
          Print portfolio brief
        </button>
        {!readOnly ? (
          <>
            <label className="btn">
              Import workspace
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="btn">
              Import issued report
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f, true);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="notice err" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
      <section className="form-card assurance-settings">
        <h2>Program settings</h2>
        <div className="form-grid">
          <label>
            Program name
            <input
              disabled={readOnly}
              value={w.name}
              maxLength={200}
              onChange={(e) => edit({ ...w, name: e.target.value })}
            />
          </label>
          <label>
            Accountable owner
            <OwnerField
              identities={identities}
              disabled={readOnly}
              value={w.owner}
              onChange={(owner) => edit({ ...w, owner })}
            />
          </label>
          <label>
            Evidence freshness window (days)
            <input
              disabled={readOnly}
              type="number"
              min={1}
              max={3650}
              value={w.freshnessDays}
              onChange={(e) =>
                edit({
                  ...w,
                  freshnessDays: Math.max(
                    1,
                    Math.min(3650, Number(e.target.value) || 90),
                  ),
                })
              }
            />
          </label>
        </div>
        <p>
          Hosted revision {revision} ·{" "}
          {dirty ? "Uncommitted changes" : "No local changes"} · Evaluated{" "}
          {today} UTC
        </p>
      </section>
      <section className="assurance-metrics">
        <article className="form-card">
          <strong>{w.risks.filter((r) => !r.assessed).length}</strong>
          <p>Risks awaiting assessment</p>
        </article>
        <article className="form-card">
          <strong>{summary.critical}</strong>
          <p>Critical residual risks</p>
        </article>
        <article className="form-card">
          <strong>{summary.overdue.length}</strong>
          <p>Overdue actions</p>
        </article>
        <article className="form-card">
          <strong>{summary.blocked.length}</strong>
          <p>Blocked actions</p>
        </article>
        <article className="form-card">
          <strong>{summary.staleEvidence.length}</strong>
          <p>Stale / future-dated evidence</p>
        </article>
        <article className="form-card">
          <strong>{summary.awaitingReview}</strong>
          <p>Awaiting review</p>
        </article>
      </section>
      {!readOnly ? (
        <details className="form-card no-print">
          <summary>Apply an operational policy starter</summary>
          <p>
            Creates unassessed risks and dependent obligations. These are
            workflow starters, not complete regulatory frameworks. Existing
            freshness settings are preserved; the starter suggests a window for
            your review.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const pack = POLICY_PACKS.find(
                  (p) => p.id === value(f, "pack"),
                )!;
                if (apply(applyPolicyPack(w, pack.id, value(f, "start"))))
                  setNotice(
                    `Policy starter applied. Suggested evidence freshness: ${pack.freshnessDays} days; review program settings and assess every risk.`,
                  );
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Could not apply policy",
                );
              }
            }}
          >
            <label>
              Policy starter
              <select name="pack">
                {POLICY_PACKS.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              First obligation date
              <input type="date" name="start" defaultValue={today} required />
            </label>
            <button className="btn">Apply policy starter</button>
          </form>
        </details>
      ) : null}
      <section className="form-card">
        <h2>Accountability overview</h2>
        <div className="table-scroll">
          <table className="clue-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Risks</th>
                <th>Open</th>
                <th>Overdue</th>
                <th>Blocked</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {ownerWorkload(w, today).map((o) => (
                <tr key={o.owner}>
                  <td>{ownerLabel(o.owner)}</td>
                  <td>{o.risks}</td>
                  <td>{o.open}</td>
                  <td>{o.overdue}</td>
                  <td>{o.blocked}</td>
                  <td>{o.review}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="form-card">
        <h2>Risk register</h2>
        <p className="fine">
          Inherent score = likelihood × impact (1–25). Residual =
          ceiling(inherent × (1 − credited effectiveness)), minimum 1. Controls
          receive credit only with a description and fresh referenced evidence.
          Ratings and effectiveness are operator judgments. Bands: low 1–5,
          medium 6–11, high 12–19, critical 20–25.
        </p>
        {summary.risks.length ? (
          <div className="table-scroll">
            <table className="clue-table">
              <thead>
                <tr>
                  <th>Risk / owner</th>
                  <th>Inherent</th>
                  <th>Residual</th>
                  <th>Control credit</th>
                </tr>
              </thead>
              <tbody>
                {summary.risks.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.title}
                      <div className="fine">{ownerLabel(r.owner)}</div>
                    </td>
                    <td>{r.inherent}</td>
                    <td>
                      {r.assessed ? r.residual : "Pending assessment"} ·{" "}
                      {r.band}
                    </td>
                    <td>
                      {r.creditedEffectiveness}%
                      <div className="fine">
                        {!r.evidenceValid
                          ? "Missing, stale or future evidence"
                          : !r.control
                            ? "No control description"
                            : "Evidence current"}{" "}
                        · {r.control || "No control recorded"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No risks entered.</p>
        )}
      </section>
      {!readOnly ? (
        <div className="form-card">
          <LazySection title="Add a risk or revise a control">
            {() => (
              <>
                <form onSubmit={addRisk}>
                  <label>
                    Risk title
                    <input name="title" required maxLength={200} />
                  </label>
                  <label>
                    Risk owner
                    <OwnerField
                      identities={identities}
                      name="owner"
                      initial={w.owner}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Likelihood (1–5)
                      <input
                        type="number"
                        name="likelihood"
                        defaultValue={3}
                        min={1}
                        max={5}
                        required
                      />
                    </label>
                    <label>
                      Impact (1–5)
                      <input
                        type="number"
                        name="impact"
                        defaultValue={3}
                        min={1}
                        max={5}
                        required
                      />
                    </label>
                    <label>
                      Control effectiveness (%)
                      <input
                        type="number"
                        name="effectiveness"
                        defaultValue={0}
                        min={0}
                        max={100}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Control description
                    <textarea name="control" maxLength={4000} />
                  </label>
                  <label>
                    Supporting evidence
                    <select multiple name="evidence">
                      {evidenceOptions}
                    </select>
                  </label>
                  <button className="btn">Add risk</button>
                </form>
                {w.risks.map((r) => (
                  <form
                    key={r.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      apply({
                        ...w,
                        risks: w.risks.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                owner: value(f, "owner"),
                                control: value(f, "control"),
                                controlEffectiveness: Number(
                                  f.get("effectiveness"),
                                ),
                                assessed: true,
                                evidenceIds: selected(f, "evidence"),
                                likelihood: Number(f.get("likelihood")),
                                impact: Number(f.get("impact")),
                              }
                            : x,
                        ),
                      });
                    }}
                  >
                    <h3>{r.title}</h3>
                    <label>
                      Risk owner
                      <OwnerField
                        identities={identities}
                        name="owner"
                        initial={r.owner}
                      />
                    </label>
                    <label>
                      Likelihood
                      <input
                        type="number"
                        name="likelihood"
                        min={1}
                        max={5}
                        defaultValue={r.likelihood}
                        required
                      />
                    </label>
                    <label>
                      Impact
                      <input
                        type="number"
                        name="impact"
                        min={1}
                        max={5}
                        defaultValue={r.impact}
                        required
                      />
                    </label>
                    <label>
                      Control effectiveness (%)
                      <input
                        type="number"
                        name="effectiveness"
                        min={0}
                        max={100}
                        defaultValue={r.controlEffectiveness}
                        required
                      />
                    </label>
                    <label>
                      Control description
                      <textarea
                        name="control"
                        defaultValue={r.control}
                        maxLength={4000}
                      />
                    </label>
                    <label>
                      Supporting evidence
                      <select
                        name="evidence"
                        multiple
                        defaultValue={r.evidenceIds}
                      >
                        {evidenceOptions}
                      </select>
                    </label>
                    <label>
                      <input type="checkbox" required />I have assessed the
                      likelihood, impact and control claims
                    </label>
                    <button className="btn">Update control</button>
                  </form>
                ))}
              </>
            )}
          </LazySection>
        </div>
      ) : null}
      <section className="form-card">
        <h2>Evidence register</h2>
        {w.evidence.map((e) => (
          <p key={e.id}>
            {e.title} · observed {e.observedAt} ·{" "}
            {summary.staleEvidence.some((s) => s.id === e.id)
              ? "Refresh needed"
              : "Within freshness window"}
            {e.reference ? (
              <>
                {" "}
                ·{" "}
                <a href={e.reference} rel="noreferrer">
                  Source
                </a>
              </>
            ) : null}
            {e.sha256 ? (
              <span
                className="mono"
                style={{ display: "block", overflowWrap: "anywhere" }}
              >
                SHA-256 {e.sha256}
              </span>
            ) : null}
          </p>
        ))}
        {!w.evidence.length ? <p>No evidence recorded.</p> : null}
      </section>
      {!readOnly ? (
        <details className="form-card no-print">
          <summary>Add evidence</summary>
          <form onSubmit={addEvidence}>
            <label>
              Evidence title
              <input name="title" required maxLength={200} />
            </label>
            <label>
              HTTPS source URL
              <input type="url" name="reference" maxLength={2000} />
            </label>
            <label>
              Original file SHA-256 (optional)
              <input name="sha256" maxLength={64} />
            </label>
            <label>
              Observed date
              <input type="date" name="observedAt" required />
            </label>
            <button className="btn">Add evidence</button>
          </form>
        </details>
      ) : null}
      <section className="form-card">
        <h2>Remediation &amp; recurring obligations</h2>
        {!allowLocalCompletion ? (
          <p className="notice">
            Save actions in review, then use the authenticated review queue
            below. A different authorized user must approve.
          </p>
        ) : null}
        <p>
          Open → in progress → review → complete. Closure requires current
          evidence, a resolution and a reviewer distinct from the owner.
          Recurring follow-ups are anchored to the original due date, so late
          completion does not silently move the schedule.
        </p>
        {w.actions.map((a) => (
          <article className="assurance-action" key={a.id}>
            <h3>{a.title}</h3>
            <p>
              {ownerLabel(a.owner)} · Due {a.dueDate} · {a.status}
              {summary.overdue.some((x) => x.id === a.id) ? " · OVERDUE" : ""}
              {summary.blocked.some((x) => x.id === a.id) ? " · BLOCKED" : ""} ·
              Recurrence{" "}
              {a.recurrenceDays ? `${a.recurrenceDays} days` : "none"}
            </p>
            <p className="fine">
              Dependencies:{" "}
              {a.dependsOn
                .map((id) => w.actions.find((d) => d.id === id)?.title ?? id)
                .join(", ") || "None"}{" "}
              · {a.evidenceIds.length} evidence references
            </p>
            {a.status === "complete" ? (
              <p>
                Declared reviewer: {a.reviewer} · {a.completedAt} ·{" "}
                {a.resolution}
              </p>
            ) : null}
            {!readOnly && a.status !== "complete" ? (
              <LazySection title="Edit / review action">
                {() => (
                  <form
                    className="no-print"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget),
                        to = (
                          (e.nativeEvent as SubmitEvent)
                            .submitter as HTMLButtonElement
                        )?.value;
                      const next = {
                        ...w,
                        actions: w.actions.map((x) =>
                          x.id === a.id
                            ? {
                                ...x,
                                owner: value(f, "owner"),
                                dueDate: value(f, "dueDate"),
                                dependsOn: selected(f, "dependsOn"),
                                evidenceIds: selected(f, "evidence"),
                              }
                            : x,
                        ),
                      };
                      try {
                        apply(
                          to
                            ? transitionAction(
                                next,
                                a.id,
                                to as ActionStatus,
                                value(f, "reviewer"),
                                value(f, "resolution"),
                              )
                            : next,
                        );
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Transition failed",
                        );
                      }
                    }}
                  >
                    <label>
                      Action owner
                      <OwnerField
                        identities={identities}
                        name="owner"
                        initial={a.owner}
                      />
                    </label>
                    <label>
                      Due date
                      <input
                        type="date"
                        name="dueDate"
                        defaultValue={a.dueDate}
                        required
                      />
                    </label>
                    <label>
                      Dependencies
                      <select
                        multiple
                        name="dependsOn"
                        defaultValue={a.dependsOn}
                      >
                        {w.actions
                          .filter((x) => x.id !== a.id)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Closure evidence
                      <select
                        multiple
                        name="evidence"
                        defaultValue={a.evidenceIds}
                      >
                        {evidenceOptions}
                      </select>
                    </label>
                    <label>
                      Declared reviewer
                      <input name="reviewer" maxLength={120} />
                    </label>
                    <label>
                      Resolution
                      <textarea name="resolution" maxLength={4000} />
                    </label>
                    <div className="studio-toolbar">
                      <button className="btn" value="">
                        Save action details
                      </button>
                      {(a.status === "open"
                        ? ["in_progress"]
                        : a.status === "in_progress"
                          ? ["review", "open"]
                          : allowLocalCompletion
                            ? ["complete", "in_progress"]
                            : ["in_progress"]
                      ).map((to) => (
                        <button className="btn" value={to} key={to}>
                          Move to {to.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </form>
                )}
              </LazySection>
            ) : null}
            {!readOnly && a.status === "complete" ? (
              <button
                className="btn no-print"
                onClick={() => {
                  try {
                    apply(transitionAction(w, a.id, "in_progress"));
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Cannot reopen");
                  }
                }}
              >
                Reopen action
              </button>
            ) : null}
          </article>
        ))}
      </section>
      {!readOnly ? (
        <details className="form-card no-print">
          <summary>Add an action or recurring obligation</summary>
          <form onSubmit={addAction}>
            <label>
              Action title
              <input name="title" required maxLength={200} />
            </label>
            <label>
              Action owner
              <OwnerField
                identities={identities}
                name="owner"
                initial={w.owner}
              />
            </label>
            <label>
              Due date
              <input type="date" name="dueDate" required />
            </label>
            <label>
              Linked risk
              <select name="riskId">
                <option value="">None</option>
                {w.risks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dependencies
              <select name="dependsOn" multiple>
                {w.actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Initial evidence
              <select name="evidence" multiple>
                {evidenceOptions}
              </select>
            </label>
            <label>
              Repeat every N days (0 = once)
              <input
                type="number"
                name="recurrenceDays"
                min={0}
                max={365}
                defaultValue={0}
                required
              />
            </label>
            <button className="btn">Add action</button>
          </form>
        </details>
      ) : null}
      {persist && !readOnly ? (
        <form className="form-card no-print" onSubmit={save}>
          <h2>Commit an audited revision</h2>
          <label>
            {verifiedActor ? "Authenticated operator" : "Declared operator"}
            <input
              name="actor"
              required
              maxLength={254}
              readOnly={!!verifiedActor}
              value={verifiedActor}
            />
          </label>
          <label>
            Change reason
            <textarea name="reason" required maxLength={2000} />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save audited revision"}
          </button>
        </form>
      ) : null}
      <p className="fine">
        Workspace data is portable through sealed JSON and CSV. Scores are based
        on supplied facts and operator judgments.{" "}
        {verifiedActor
          ? "Company saves record the authenticated user. Final closure uses the separate authenticated review queue; draft labels do not grant approval."
          : "Owners and reviewers are declared names, not authenticated approvals."}{" "}
        UTC dates; recurrence uses calendar days, not holiday calendars. No
        automated external verification, notifications or compliance
        certification is implied.
      </p>
    </div>
  );
}
