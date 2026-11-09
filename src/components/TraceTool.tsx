"use client";
import { useState } from "react";
import type { Trace } from "@/lib/trace";
import { TraceMap, TraceTable } from "./TraceMap";
import { downloadSealed } from "@/lib/download";

export function TraceTool() {
  const [text, setText] = useState("");
  const [since, setSince] = useState("");
  const [state, setState] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const [error, setError] = useState("");
  const [trace, setTrace] = useState<Trace | null>(null);
  const [fp, setFp] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setState("reading");
    setError("");
    setFp("");
    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: text.split(/[\s,]+/).filter(Boolean), since: since || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Trace failed");
      setTrace(j as Trace);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trace failed");
      setState("failed");
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <form className="form-card" onSubmit={run}>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="trace-addr">Bitcoin address(es), up to 3</label>
            <textarea id="trace-addr" value={text} onChange={(e) => setText(e.target.value)} placeholder="bc1q… or 1… or 3…" style={{ minHeight: 70 }} required />
          </div>
          <div className="field">
            <label htmlFor="trace-since">Only transfers on or after (optional)</label>
            <input id="trace-since" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" type="submit" disabled={state === "reading"}>{state === "reading" ? "Reading the ledger…" : "Follow the money"}</button>
          <span className="fine">Read live from Blockstream. Nothing is stored.</span>
        </div>
      </form>
      {state === "failed" ? <div className="notice err">{error}</div> : null}
      {trace ? (
        <div className="form-card" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{trace.nodes.length} addresses · {trace.edges.length} transfers</h3>
            <button className="btn btn-small" type="button" onClick={async () => setFp(await downloadSealed({ generatedBy: "TraceSworn tracing preview", ...trace }, `tracesworn-trace-${trace.readAt.slice(0, 10)}.json`))}>Download sealed record</button>
          </div>
          {fp ? <p className="fine" style={{ margin: 0, wordBreak: "break-all" }}>Sealed. Fingerprint (SHA-256): <span className="mono">{fp}</span>. Check it at <a href="/verify">/verify</a>.</p> : null}
          <TraceMap trace={trace} />
          <TraceTable trace={trace} />
          {trace.limits.length ? <div className="notice warn">{trace.limits.join(" ")}</div> : null}
          <p className="fine" style={{ margin: 0 }}>
            This preview follows one hop. A Complex Matter follows three hops, groups every wallet the subject controls, and names the exchanges where funds landed, so counsel knows whom to subpoena.
          </p>
        </div>
      ) : null}
    </div>
  );
}
