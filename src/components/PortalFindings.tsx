"use client";

import { useRef, useState } from "react";
import { extractClues, detectChain, type Clue } from "@/lib/extract";
import { readFile, ACCEPT } from "@/lib/readFile";
import { scanStatement } from "@/lib/statements";

// Runs the document scan on the client's device, then sends ONLY the findings (no documents, no phrases).
export function PortalFindings({ token }: { token: string }) {
  const [clues, setClues] = useState<Clue[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [xpub, setXpub] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    if (!list) return;
    setBusy(true);
    const found: Clue[] = [];
    const names: string[] = [];
    for (const f of Array.from(list)) {
      try {
        const text = await readFile(f);
        found.push(...extractClues(f.name, text));
        // Statement lines that pay or receive money from an exchange are exchange clues too.
        for (const h of scanStatement(f.name, text)) found.push({ kind: "exchange", name: h.venue, file: f.name, line: h.line, snippet: h.text });
        names.push(f.name);
      } catch {
        names.push(`${f.name} (could not read)`);
      }
    }
    setClues((c) => [...c, ...found]);
    setFiles((x) => [...x, ...names]);
    setBusy(false);
    setDone(null);
  }

  const addresses = [
    ...clues.filter((c): c is Extract<Clue, { kind: "address" }> => c.kind === "address").map((c) => ({ address: c.address, source: `${c.file}, line ${c.line}` })),
    ...manual.split(/[\s,;]+/).filter((a) => a && detectChain(a)).map((address) => ({ address, source: "Entered by hand" })),
  ];
  const sources = clues.filter((c): c is Extract<Clue, { kind: "exchange" | "wallet" }> => c.kind === "exchange" || c.kind === "wallet").map((c) => ({ kind: c.kind, name: c.name }));
  const uniqueSources = [...new Map(sources.map((s) => [s.name, s])).values()];
  const phraseFlags = clues.filter((c) => c.kind === "phrase").length;
  const xpubs = xpub.split(/\s+/).filter((x) => /^[xyz]pub/.test(x));
  const nothing = addresses.length + uniqueSources.length + xpubs.length === 0;

  async function send() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/case/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, addresses, sources: uniqueSources, phraseFlags, files: files.length, xpubs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setDone(data.total);
      setClues([]);
      setFiles([]);
      setManual("");
      setXpub("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-card">
      <h3>Send us what the records show</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Add bank or card statements, exported emails or notes. They are read <b>on this device</b> and never uploaded. Only the exchange
        names and wallet addresses found are sent to your case.
      </p>
      <div className="dropzone" role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
        <span className="serif" style={{ fontSize: 20 }}>{busy ? "Reading…" : "Drop files here or tap to choose"}</span>
        <span className="faint" style={{ fontSize: 13 }}>PDF statements, email exports, notes, CSV</span>
      </div>
      <input ref={input} type="file" multiple hidden accept={ACCEPT} onChange={(e) => add(e.target.files)} />
      {files.length ? <p className="fine">Read: {files.join(", ")}</p> : null}

      <div className="form-grid" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="pm">Wallet addresses you already know (optional)</label>
          <textarea id="pm" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="One per line" style={{ minHeight: 80 }} />
        </div>
        <div className="field">
          <label htmlFor="px">Hardware wallet public key, xpub/zpub (optional)</label>
          <textarea id="px" value={xpub} onChange={(e) => setXpub(e.target.value)} placeholder="Never a recovery phrase or private key" style={{ minHeight: 80 }} />
        </div>
      </div>

      {phraseFlags ? (
        <div className="notice warn" style={{ marginTop: 14 }}>
          A possible recovery phrase was found in your documents. It has <b>not</b> been sent. Keep that document safe and
          offline, and tell us about it on our call.
        </div>
      ) : null}

      {!nothing ? (
        <p className="muted" style={{ marginTop: 14 }}>
          Ready to send: <b>{addresses.length}</b> address{addresses.length === 1 ? "" : "es"}, <b>{uniqueSources.length}</b> exchange/wallet clue
          {uniqueSources.length === 1 ? "" : "s"}
          {xpubs.length ? <>, <b>{xpubs.length}</b> wallet key{xpubs.length === 1 ? "" : "s"}</> : null}.
          {uniqueSources.length ? ` (${uniqueSources.map((s) => s.name).join(", ")})` : ""}
        </p>
      ) : null}
      {error ? <div className="notice err" style={{ marginTop: 12 }}>{error}</div> : null}
      {done !== null ? <div className="notice" style={{ marginTop: 12 }}>Sent. Your case now has {done} address{done === 1 ? "" : "es"}. We'll take it from here.</div> : null}
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={send} disabled={busy || nothing}>
        Send findings to my case <span className="arrow">→</span>
      </button>
    </div>
  );
}
