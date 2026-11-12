import type { ReportDocument } from "@/lib/reportStudio";
export function ReportPreview({
  document: d,
  fingerprint,
  revision,
}: {
  document: ReportDocument;
  fingerprint?: string;
  revision?: number;
}) {
  return (
    <article
      className="studio-preview"
      style={{ borderTop: `6px solid ${d.accent}` }}
    >
      <p className="label">
        {d.organization || "Your organization"} ·{" "}
        {fingerprint ? `Issued revision ${revision}` : "Draft — not issued"}
      </p>
      <h1>{d.title || "Untitled report"}</h1>
      <p>
        Reference: {d.matterReference || "—"} · Prepared for:{" "}
        {d.preparedFor || "—"}
      </p>
      <p>
        Author: {d.author || "—"} · Declared reviewer: {d.reviewer || "—"}
      </p>
      <h2>Scope</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{d.scope || "Not provided"}</p>
      <h2>Methodology</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>
        {d.methodology || "Not provided"}
      </p>
      <h2>Findings</h2>
      {d.findings.map((f, i) => (
        <section key={f.id}>
          <h3>
            {i + 1}. {f.date || "Undated observation"}
          </h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{f.observation}</p>
          <p className="fine">
            Sources: {f.sourceIds.join(", ") || "No citation"}
          </p>
        </section>
      ))}
      <h2>Limitations</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>
        {d.limitations || "Not provided"}
      </p>
      <h2>Conclusion</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{d.conclusion || "Not provided"}</p>
      <h2>Source register</h2>
      {d.sources.map((s) => (
        <section key={s.id}>
          <h3>
            {s.id}: {s.title}
          </h3>
          {/^https:\/\//i.test(s.reference) ? (
            <p>
              <a href={s.reference} rel="noreferrer">
                {s.reference}
              </a>
            </p>
          ) : null}
          <p className="fine">Observed: {s.observedAt || "Not recorded"}</p>
          {s.sha256 ? (
            <p className="mono" style={{ overflowWrap: "anywhere" }}>
              Original file SHA-256: {s.sha256}
            </p>
          ) : null}
          <p style={{ whiteSpace: "pre-wrap" }}>{s.note}</p>
        </section>
      ))}
      <h2>Review record</h2>
      <p>
        Source references: {d.checks.sources ? "checked" : "pending"} ·
        Limitations: {d.checks.limitations ? "checked" : "pending"} ·
        Conclusions: {d.checks.conclusions ? "checked" : "pending"}
      </p>
      {fingerprint ? (
        <p className="mono" style={{ overflowWrap: "anywhere" }}>
          Record SHA-256: {fingerprint}
        </p>
      ) : null}
      <p className="fine">
        Names are declared by the operator, not authenticated signatures. A
        fingerprint checks file integrity; it does not establish source
        authenticity, accuracy or admissibility.
      </p>
    </article>
  );
}
