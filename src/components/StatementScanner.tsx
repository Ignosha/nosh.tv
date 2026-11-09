"use client";

import { useRef, useState } from "react";
import { scanStatement, summarize, type StatementHit } from "@/lib/statements";
import { readFile, ACCEPT } from "@/lib/readFile";
import { downloadSealed } from "@/lib/download";

const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function StatementScanner() {
  const [hits, setHits] = useState<StatementHit[]>([]);
  const [files, setFiles] = useState<{ name: string; lines: number; error?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    if (!list) return;
    setBusy(true);
    setFingerprint("");
    const found: StatementHit[] = [];
    const meta: { name: string; lines: number; error?: string }[] = [];
    for (const f of Array.from(list)) {
      try {
        const text = await readFile(f);
        found.push(...scanStatement(f.name, text));
        meta.push({ name: f.name, lines: text.split(/\n/).length });
      } catch {
        meta.push({ name: f.name, lines: 0, error: "could not read" });
      }
    }
    setHits((h) => [...h, ...found]);
    setFiles((x) => [...x, ...meta]);
    setBusy(false);
  }

  const summary = summarize(hits);
  const totalTo = summary.reduce((s, v) => s + v.toExchange, 0);
  const totalFrom = summary.reduce((s, v) => s + v.fromExchange, 0);

  async function download() {
    const fp = await downloadSealed(
      { generatedBy: "TraceSworn statement scan", readAt: new Date().toISOString(), files: files.map((f) => f.name), summary, transactions: hits },
      `tracesworn-statement-scan-${new Date().toISOString().slice(0, 10)}.json`,
    );
    setFingerprint(fp);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="instrument">
        <div>
          <div className="pane-head"><span>Statements</span><span>Read on this device</span></div>
          <h3 className="pane-title">Follow the money to the exchanges.</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Drop bank or card statements (CSV exports or PDFs). Every line that pays or receives money from a crypto exchange,
            app or Bitcoin ATM is flagged with its date and amount. Nothing is uploaded.
          </p>
          <div className="dropzone" role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
            <span className="serif" style={{ fontSize: 20 }}>{busy ? "Reading…" : "Drop statements here"}</span>
            <span className="faint" style={{ fontSize: 13 }}>CSV, PDF or text exports from any bank or card</span>
          </div>
          <input ref={input} type="file" multiple hidden accept={ACCEPT} onChange={(e) => add(e.target.files)} />
          {files.length ? <p className="fine">Read: {files.map((f) => f.name + (f.error ? ` (${f.error})` : "")).join(", ")}</p> : null}
          <p className="fine">Recognises 24 exchanges, apps and ATM operators by the names they bill under, e.g. Kraken as &ldquo;Payward&rdquo;, Binance.US as &ldquo;BAM Trading&rdquo;, Crypto.com as &ldquo;Foris DAX&rdquo;.</p>
        </div>
        <div>
          <div className="pane-head"><span>What the statements show</span><span>{hits.length} line{hits.length === 1 ? "" : "s"} flagged</span></div>
          {summary.length === 0 ? (
            <p className="muted">No statements read yet. Results appear here.</p>
          ) : (
            <>
              <div className="record-rows">
                <div><span>Sent to exchanges</span><span>{usd(totalTo)}</span></div>
                <div><span>Received from exchanges</span><span>{usd(totalFrom)}</span></div>
                <div><span>Net into crypto</span><span>{usd(totalTo - totalFrom)}</span></div>
              </div>
              <div className="table-scroll" style={{ marginTop: 14 }}>
                <table className="clue-table" style={{ color: "inherit" }}>
                  <thead><tr><th>Exchange</th><th style={{ textAlign: "right" }}>Sent</th><th style={{ textAlign: "right" }}>Received</th><th>Dates</th></tr></thead>
                  <tbody>
                    {summary.map((v) => (
                      <tr key={v.venue}>
                        <td><b>{v.venue}</b><div className="snippet" style={{ color: "inherit", opacity: 0.75 }}>{v.count} line{v.count === 1 ? "" : "s"}{v.unknown ? ` · ${usd(v.unknown)} direction unclear` : ""}</div></td>
                        <td className="num">{usd(v.toExchange)}</td>
                        <td className="num">{usd(v.fromExchange)}</td>
                        <td className="mono" style={{ fontSize: 12.5 }}>{v.first ?? "—"}{v.last && v.last !== v.first ? ` → ${v.last}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="integrity">
                <button type="button" className="btn btn-small" onClick={download}>Download sealed record <span className="arrow">↓</span></button>
                {fingerprint ? <p className="fine" style={{ marginTop: 10, wordBreak: "break-all" }}>Sealed. Fingerprint (SHA-256): <span className="mono">{fingerprint}</span>. Anyone can check it at <a href="/verify">/verify</a>.</p> : null}
                <p className="fine">Each line is a lead to confirm against the original statement. An exchange account found here can be subpoenaed or claimed; its balance isn&rsquo;t visible on a public ledger.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {hits.length ? (
        <div className="form-card">
          <h3>Every flagged line</h3>
          <div className="table-scroll">
            <table className="clue-table">
              <thead><tr><th>Date</th><th>Exchange</th><th>Direction</th><th style={{ textAlign: "right" }}>Amount</th><th>Statement line</th></tr></thead>
              <tbody>
                {hits.map((h, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>{h.date ?? "—"}</td>
                    <td>{h.venue}</td>
                    <td>{h.direction === "to-exchange" ? "Sent →" : h.direction === "from-exchange" ? "← Received" : "Unclear"}</td>
                    <td className="num">{h.amount === null ? "—" : usd(h.amount)}</td>
                    <td><div className="snippet">{h.file}, line {h.line}: {h.text}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
