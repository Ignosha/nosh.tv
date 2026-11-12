"use client";
import { useState } from "react";
import { validateIssuedRecord, type sealDocument } from "@/lib/reportStudio";
import { compareReports } from "@/lib/reportDiff";
type Issued = Awaited<ReturnType<typeof sealDocument>>;
export function ReportComparison() {
  const [before, setBefore] = useState<Issued | null>(null),
    [after, setAfter] = useState<Issued | null>(null),
    [error, setError] = useState("");
  async function read(file: File, side: "before" | "after") {
    setError("");
    if (side === "before") setBefore(null);
    else setAfter(null);
    try {
      if (file.size > 900000)
        throw new Error("Choose an issued JSON record below 900 KB");
      const record = await validateIssuedRecord(JSON.parse(await file.text()));
      if (side === "before") setBefore(record);
      else setAfter(record);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify report");
    }
  }
  const changes =
    before && after
      ? compareReports(before.record.document, after.record.document)
      : [];
  return (
    <div>
      <div className="form-grid no-print">
        {(["before", "after"] as const).map((side) => (
          <label key={side}>
            {side === "before"
              ? "Earlier issued report"
              : "Later issued report"}
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void read(f, side);
                e.target.value = "";
              }}
            />
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="notice err">
          {error}
        </p>
      ) : null}
      {before && after ? (
        <>
          <p>
            Earlier revision {before.record.revision} · Later revision{" "}
            {after.record.revision} · {changes.length} content changes
          </p>
          {before.record.document.matterReference !==
          after.record.document.matterReference ? (
            <p className="notice warn">
              These reports have different matter references. Confirm this is an
              intentional comparison.
            </p>
          ) : null}
          <p className="fine">
            Both fingerprints verified. Changes compare report fields, evidence
            sources and findings by stable identifiers. Reordered arrays with
            unchanged identifiers do not create additions. Issuance timestamps
            and revision numbers are shown separately.
          </p>
          {changes.length ? (
            changes.map((c, i) => (
              <article className="form-card" key={i}>
                <h2>
                  {c.section} · {c.id} · {c.kind}
                </h2>
                <div className="form-grid">
                  <div>
                    <h3>Before</h3>
                    <pre className="assurance-diff">
                      {JSON.stringify(c.before, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3>After</h3>
                    <pre className="assurance-diff">
                      {JSON.stringify(c.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p>No report content changed.</p>
          )}
          <p className="mono" style={{ overflowWrap: "anywhere" }}>
            Earlier: {before.fingerprint.value}
            <br />
            Later: {after.fingerprint.value}
          </p>
          <button className="btn no-print" onClick={() => window.print()}>
            Print comparison
          </button>
        </>
      ) : (
        <p>
          Load two issued records. Files are verified and compared in this
          browser; nothing is uploaded.
        </p>
      )}
    </div>
  );
}
