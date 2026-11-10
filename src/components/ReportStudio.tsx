"use client";
import { useRef, useState } from "react";
import {
  newDocument,
  parseDocument,
  publicationIssues,
  REPORT_TEMPLATES,
  sealDocument,
  type ReportDocument,
} from "@/lib/reportStudio";
import { verifySealed } from "@/lib/fingerprint";
import { ReportPreview } from "./ReportPreview";

type Issued = Awaited<ReturnType<typeof sealDocument>>;
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ReportStudio() {
  const [doc, setDoc] = useState<ReportDocument>(newDocument);
  const [issued, setIssued] = useState<Issued[]>([]);
  const [active, setActive] = useState<Issued | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nextRevision, setNextRevision] = useState(1);
  const counter = useRef(0);
  const editVersion = useRef(0);
  const id = (prefix: string) => `${prefix}-${Date.now()}-${++counter.current}`;
  function change(
    patch:
      | Partial<ReportDocument>
      | ((current: ReportDocument) => Partial<ReportDocument>),
    review = false,
  ) {
    editVersion.current++;
    setDoc((d) => ({
      ...d,
      ...(typeof patch === "function" ? patch(d) : patch),
      ...(review
        ? {}
        : {
            checks: { sources: false, limitations: false, conclusions: false },
          }),
    }));
    setActive(null);
    setError("");
  }
  async function importDraft(file: File) {
    setError("");
    if (file.size > 5_000_000) {
      setError("Import a JSON file smaller than 5 MB");
      return;
    }
    try {
      const value = JSON.parse(await file.text());
      if (value?.record && value?.fingerprint) {
        const checked = await verifySealed(value);
        if (!checked.ok)
          throw new Error("Issued record fingerprint does not match");
      }
      const input = value?.record?.document ?? value?.document ?? value;
      const parsed = parseDocument(input);
      change({
        ...parsed,
        checks: { sources: false, limitations: false, conclusions: false },
      });
      const revision = Number(value?.record?.revision);
      if (Number.isSafeInteger(revision) && revision > 0 && revision < 100000)
        setNextRevision((n) => Math.max(n, revision + 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import report");
    }
  }
  async function hashFile(file: File, sourceId: string) {
    if (file.size > 25_000_000) {
      setError("Hash files up to 25 MB; the file stays in this browser");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer(),
      );
      const sha256 = [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      change((current) => ({
        sources: current.sources.map((s) =>
          s.id === sourceId
            ? {
                ...s,
                sha256,
                title: s.title || file.name,
                note: `${s.note}${s.note ? "\n" : ""}File fingerprint computed locally for ${file.name}; contents were not uploaded.`,
              }
            : s,
        ),
      }));
    } catch {
      setError("File fingerprint could not be computed");
    } finally {
      setBusy(false);
    }
  }
  async function issue() {
    setBusy(true);
    setError("");
    try {
      const editingAtIssue = editVersion.current;
      const record = await sealDocument(doc, nextRevision);
      setIssued((v) => [record, ...v]);
      if (editingAtIssue === editVersion.current) setActive(record);
      setNextRevision((n) => n + 1);
      download(record, `report-issued-v${record.record.revision}.json`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue report");
    } finally {
      setBusy(false);
    }
  }
  const issues = publicationIssues(doc);
  return (
    <div className="studio">
      <div className="no-print studio-editor">
        <div className="notice">
          Documents and report content stay in this browser. Nothing is saved
          automatically. Download your draft before closing or refreshing.
          Issued history lasts for this session; archive downloaded records
          securely.
        </div>
        <div className="studio-toolbar">
          <button
            className="btn"
            onClick={() =>
              download(
                { format: "TraceSworn Report Studio draft v1", document: doc },
                "report-draft.json",
              )
            }
          >
            Download draft
          </button>
          <label className="btn">
            Import draft or issued JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importDraft(f);
                e.target.value = "";
              }}
              style={{ maxWidth: 220 }}
            />
          </label>
          <button className="btn" onClick={() => window.print()}>
            Print / save PDF
          </button>
        </div>
        <section className="form-card">
          <h2>1. Template &amp; branding</h2>
          <div className="form-grid">
            <label>
              Template
              <select
                value={doc.template}
                onChange={(e) => {
                  const t = REPORT_TEMPLATES.find(
                    (t) => t.id === e.target.value,
                  )!;
                  change({ template: t.id, title: t.title });
                }}
              >
                {REPORT_TEMPLATES.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accent color
              <input
                type="color"
                value={doc.accent}
                onChange={(e) => change({ accent: e.target.value })}
              />
            </label>
            {(
              [
                ["organization", "Organization"],
                ["title", "Report title"],
                ["matterReference", "Matter reference"],
                ["preparedFor", "Prepared for"],
                ["author", "Author"],
                ["reviewer", "Reviewer"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={doc[key]}
                  maxLength={key === "title" ? 200 : 120}
                  onChange={(e) => change({ [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="fine">
            {REPORT_TEMPLATES.find((t) => t.id === doc.template)?.guidance}{" "}
            Reusing a downloaded draft preserves your branding and structure.
          </p>
        </section>
        <section className="form-card">
          <h2>2. Source register</h2>
          <p>
            Add source links or fingerprint original files locally. This records
            references and file integrity, not source authenticity or custody
            history.
          </p>
          {doc.sources.map((s) => (
            <fieldset key={s.id}>
              <legend>{s.id}</legend>
              <label>
                Source title
                <input
                  value={s.title}
                  maxLength={200}
                  onChange={(e) =>
                    change({
                      sources: doc.sources.map((x) =>
                        x.id === s.id ? { ...x, title: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Source URL (HTTPS)
                <input
                  type="url"
                  value={s.reference}
                  maxLength={2000}
                  onChange={(e) =>
                    change({
                      sources: doc.sources.map((x) =>
                        x.id === s.id ? { ...x, reference: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Observed date
                <input
                  type="date"
                  value={s.observedAt}
                  onChange={(e) =>
                    change({
                      sources: doc.sources.map((x) =>
                        x.id === s.id
                          ? { ...x, observedAt: e.target.value }
                          : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Hash an original file (up to 25 MB; never uploaded)
                <input
                  type="file"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void hashFile(f, s.id);
                    e.target.value = "";
                  }}
                />
              </label>
              {s.sha256 ? (
                <p className="mono" style={{ overflowWrap: "anywhere" }}>
                  {s.sha256}
                </p>
              ) : null}
              <label>
                Source notes
                <textarea
                  value={s.note}
                  maxLength={2000}
                  onChange={(e) =>
                    change({
                      sources: doc.sources.map((x) =>
                        x.id === s.id ? { ...x, note: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <button
                className="btn btn-small"
                onClick={() =>
                  change({
                    sources: doc.sources.filter((x) => x.id !== s.id),
                    findings: doc.findings.map((f) => ({
                      ...f,
                      sourceIds: f.sourceIds.filter((id) => id !== s.id),
                    })),
                  })
                }
              >
                Remove source
              </button>
            </fieldset>
          ))}
          <button
            className="btn"
            disabled={doc.sources.length >= 100}
            onClick={() =>
              change({
                sources: [
                  ...doc.sources,
                  {
                    id: id("S"),
                    title: "",
                    reference: "",
                    observedAt: "",
                    sha256: "",
                    note: "",
                  },
                ],
              })
            }
          >
            Add source
          </button>
        </section>
        <section className="form-card">
          <h2>3. Findings &amp; citations</h2>
          {doc.findings.map((f, i) => (
            <fieldset key={f.id}>
              <legend>Finding {i + 1}</legend>
              <label>
                Event date (optional)
                <input
                  type="date"
                  value={f.date}
                  onChange={(e) =>
                    change({
                      findings: doc.findings.map((x) =>
                        x.id === f.id ? { ...x, date: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Observation
                <textarea
                  value={f.observation}
                  maxLength={6000}
                  onChange={(e) =>
                    change({
                      findings: doc.findings.map((x) =>
                        x.id === f.id
                          ? { ...x, observation: e.target.value }
                          : x,
                      ),
                    })
                  }
                />
              </label>
              <p>Supporting sources:</p>
              {doc.sources.map((s) => (
                <label className="studio-check" key={s.id}>
                  <input
                    type="checkbox"
                    checked={f.sourceIds.includes(s.id)}
                    onChange={(e) =>
                      change({
                        findings: doc.findings.map((x) =>
                          x.id === f.id
                            ? {
                                ...x,
                                sourceIds: e.target.checked
                                  ? [...x.sourceIds, s.id]
                                  : x.sourceIds.filter((id) => id !== s.id),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  {s.title || s.id}
                </label>
              ))}
              <button
                className="btn btn-small"
                onClick={() =>
                  change({
                    findings: doc.findings.filter((x) => x.id !== f.id),
                  })
                }
              >
                Remove finding
              </button>
            </fieldset>
          ))}
          <button
            className="btn"
            disabled={doc.findings.length >= 200}
            onClick={() =>
              change({
                findings: [
                  ...doc.findings,
                  { id: id("F"), date: "", observation: "", sourceIds: [] },
                ],
              })
            }
          >
            Add finding
          </button>
          {(["scope", "methodology", "limitations", "conclusion"] as const).map(
            (key) => (
              <div key={key}>
                <label
                  htmlFor={`studio-${key}`}
                  style={{ textTransform: "capitalize" }}
                >
                  {key}
                </label>
                <textarea
                  id={`studio-${key}`}
                  maxLength={8000}
                  value={doc[key]}
                  onChange={(e) => change({ [key]: e.target.value })}
                />
              </div>
            ),
          )}
        </section>
        <section className="form-card">
          <h2>4. Review &amp; issue</h2>
          <p>
            A distinct reviewer name is required. Names and checks are operator
            declarations; this version does not authenticate separate reviewer
            accounts.
          </p>
          {(
            [
              ["sources", "Source references and figures checked"],
              ["limitations", "Coverage and limitations reviewed"],
              ["conclusions", "Conclusions supported by cited findings"],
            ] as const
          ).map(([key, label]) => (
            <label className="studio-check" key={key}>
              <input
                type="checkbox"
                checked={doc.checks[key]}
                onChange={(e) =>
                  change(
                    { checks: { ...doc.checks, [key]: e.target.checked } },
                    true,
                  )
                }
              />
              {label}
            </label>
          ))}
          <p className="fine">
            Editing content clears the review checks and returns the preview to
            draft.
          </p>
          {issues.length ? (
            <details>
              <summary>{issues.length} items before issue</summary>
              <ul>
                {issues.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </details>
          ) : (
            <p>Ready to issue a sealed record.</p>
          )}
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void issue()}
          >
            {busy ? "Working…" : `Issue & download revision ${nextRevision}`}
          </button>
        </section>
        {error ? (
          <p className="notice err" role="alert">
            {error}
          </p>
        ) : null}
        {issued.length ? (
          <section className="form-card">
            <h2>Issued versions this session</h2>
            {issued.map((v) => (
              <p key={v.fingerprint.value}>
                Revision {v.record.revision} · {v.record.issuedAt.slice(0, 16)}{" "}
                <button
                  className="btn btn-small"
                  onClick={() => {
                    setActive(v);
                  }}
                >
                  Preview
                </button>{" "}
                <button
                  className="btn btn-small"
                  onClick={() =>
                    download(v, `report-issued-v${v.record.revision}.json`)
                  }
                >
                  Download
                </button>
              </p>
            ))}
          </section>
        ) : null}
      </div>
      <div className="studio-output">
        <ReportPreview
          document={active?.record.document ?? doc}
          fingerprint={active?.fingerprint.value}
          revision={active?.record.revision}
        />
      </div>
    </div>
  );
}
