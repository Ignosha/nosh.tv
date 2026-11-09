"use client";

import { useState } from "react";
import { verifySealed } from "@/lib/fingerprint";

// Checks a TraceSworn sealed record in the browser: recomputes its SHA-256 fingerprint and compares.
export function Verifier() {
  const [result, setResult] = useState<{ ok: boolean; expected?: string; actual?: string; reason?: string; name?: string } | null>(null);

  async function check(file: File | undefined) {
    if (!file) return;
    try {
      const r = await verifySealed(JSON.parse(await file.text()));
      setResult({ ...r, name: file.name });
    } catch {
      setResult({ ok: false, reason: "That file isn't valid JSON.", name: file.name });
    }
  }

  return (
    <div className="form-card">
      <h3>Check a sealed record</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Choose a TraceSworn <span className="mono">.json</span> record. It is checked in your browser; nothing is uploaded.
      </p>
      <label className="dropzone" style={{ display: "grid" }}>
        <span className="serif" style={{ fontSize: 20 }}>Choose a record file</span>
        <input type="file" accept=".json,application/json" hidden onChange={(e) => check(e.target.files?.[0])} />
      </label>
      {result ? (
        <div className={`notice ${result.ok ? "" : "err"}`} style={{ marginTop: 16, wordBreak: "break-all" }}>
          <b>{result.ok ? "✓ Unchanged." : "✗ Does not match."}</b> {result.name}
          {result.reason ? <div>{result.reason}</div> : null}
          {result.expected ? <div className="mono" style={{ fontSize: 12.5, marginTop: 6 }}>Sealed fingerprint: {result.expected}</div> : null}
          {result.actual ? <div className="mono" style={{ fontSize: 12.5 }}>Recomputed now: {result.actual}</div> : null}
          {result.ok ? <div style={{ marginTop: 6 }}>Every figure, address and source in this record is exactly as it was when it was sealed.</div> : result.expected ? <div style={{ marginTop: 6 }}>The contents were edited after sealing, so this record should not be relied on.</div> : null}
        </div>
      ) : null}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>How to check it without this website</summary>
        <p className="muted">
          Take the <span className="mono">record</span> object, write it as JSON with its keys sorted alphabetically at every level and no spaces,
          and compute its SHA-256 hash with any standard tool. It must equal <span className="mono">fingerprint.value</span>.
        </p>
      </details>
    </div>
  );
}
