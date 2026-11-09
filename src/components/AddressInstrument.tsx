"use client";

import { downloadSealed } from "@/lib/download";

import { useRef, useState } from "react";
import { detectChain } from "@/lib/extract";
import type { AddressReport, Price } from "@/lib/chains";

type Reply = {
  readAt: string;
  dateOfDeath: string | null;
  reports: AddressReport[];
  prices: Record<string, { now: Price; atDate: Price | null }>;
};

const CHAIN_LABEL = { bitcoin: "Bitcoin", ethereum: "Ethereum", solana: "Solana" } as const;
const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 8 });

export function AddressInstrument() {
  const [fingerprint, setFingerprint] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [state, setState] = useState<"idle" | "reading" | "read" | "failed">("idle");
  const [error, setError] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const pending = useRef<AbortController | null>(null);

  const chain = detectChain(address.trim());

  function reset(next: string) {
    // Changing the subject clears the previous record and cancels any read in flight.
    pending.current?.abort();
    setAddress(next);
    setReply(null);
    setError("");
    setState("idle");
  }

  async function read(e: React.FormEvent) {
    e.preventDefault();
    if (!chain) {
      setError("That is not a Bitcoin, Ethereum or Solana address.");
      return;
    }
    pending.current?.abort();
    const ctrl = new AbortController();
    pending.current = ctrl;
    setState("reading");
    setError("");
    setReply(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: [{ address: address.trim() }], dateOfDeath: date || undefined }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The read failed.");
      const r = (data as Reply).reports[0];
      if (!r || !r.ok) throw new Error(r?.error ? `The public source did not answer: ${r.error}` : "The read failed.");
      setReply(data as Reply);
      setState("read");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : "The read failed.");
      setState("failed");
    }
  }

  async function download() {
    if (!reply) return;
    const fp = await downloadSealed({ generatedBy: "TraceSworn address check", ...reply }, `tracesworn-record-${reply.readAt.slice(0, 10)}.json`);
    setFingerprint(fp);
  }

  const report = reply?.reports[0];
  const stampText = state === "read" ? "✓ Read live" : state === "failed" ? "Couldn’t read" : state === "reading" ? "Reading…" : "Waiting";

  return (
    <div className="instrument">
      <form onSubmit={read}>
        <div className="pane-head">
          <span>Step 1 · Paste an address</span>
          <span>Read-only</span>
        </div>
        <h3 className="pane-title">
          Start with one
          <br />
          address you found.
        </h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Paste a Bitcoin, Ethereum or Solana address from a statement or note. Ethereum addresses are also read on Base, Arbitrum, Optimism and Polygon. The answer comes from the public ledger,
          not from anyone&rsquo;s say-so.
        </p>
        <label className="label" htmlFor="inst-addr" style={{ display: "block", margin: "22px 0 8px", letterSpacing: 0, textTransform: "none", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-2)" }}>
          Public address {chain ? <span className="faint">· {CHAIN_LABEL[chain]}</span> : null}
        </label>
        <input
          id="inst-addr"
          className="boxed-input"
          value={address}
          onChange={(e) => reset(e.target.value)}
          placeholder="bc1q…  ·  0x…  ·  Solana address"
          spellCheck={false}
          autoComplete="off"
        />
        <label htmlFor="inst-date" style={{ display: "block", margin: "16px 0 8px", fontSize: 14, color: "var(--ink-2)" }}>
          Valuation date <span className="faint">(optional: death, separation or petition)</span>
        </label>
        <input
          id="inst-date"
          className="boxed-input"
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => {
            setDate(e.target.value);
            setReply(null);
            setState("idle");
          }}
        />
        <button className="btn btn-solid" type="submit" style={{ marginTop: 18 }} disabled={!address.trim() || state === "reading"}>
          {state === "reading" ? "Reading the ledger…" : "Read the ledger"} <span className="arrow">→</span>
        </button>
        <p className="fine" style={{ marginTop: 16 }}>
          A public address only. Never enter a password or recovery phrase here, or anywhere online.
        </p>
        <div className="steps4">
          <div className="done"><span>01</span>Paste an address</div>
          <div className={state !== "idle" ? "done" : ""}><span>02</span>Read the ledger</div>
          <div className={state === "read" && reply?.dateOfDeath ? "done" : ""}><span>03</span>Value on the date</div>
          <div className={state === "read" ? "done" : ""}><span>04</span>Keep the record</div>
        </div>
      </form>

      <div aria-live="polite">
        <div className="pane-head">
          <span>Step 2 · What the ledger says</span>
          <span>{reply ? `Read ${reply.readAt.slice(11, 19)} UTC` : state === "reading" ? "Reading" : "Awaiting an address"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div>
                        <h3 className="pane-title" style={{ marginBottom: 8 }}>Holdings</h3>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {state === "idle" && "Press “Read the ledger” to retrieve a live reading."}
              {state === "reading" && "Asking public nodes and price sources…"}
              {state === "failed" && error}
              {state === "read" && report && (
                <>
                  {CHAIN_LABEL[report.chain]}
                  {report.txCount !== undefined ? ` · ${report.txCount.toLocaleString()} transactions` : ""}
                  {report.lastSeen ? ` · last active ${report.lastSeen.slice(0, 10)}` : ""}
                </>
              )}
            </p>
            {state === "idle" && error ? <p style={{ color: "var(--none)", fontSize: 14 }}>{error}</p> : null}
          </div>
          <div className={`round-stamp${state === "read" ? " read" : state === "failed" ? " failed" : ""}`}>{stampText}</div>
        </div>

        <div className="record-rows" style={{ marginTop: 22 }}>
          {report?.ok ? (
            report.holdings.map((h) => {
              const p = reply!.prices[h.asset];
              const vNow = p?.now.usd != null ? h.balanceNow * p.now.usd : null;
              const vAt = p?.atDate?.usd != null && h.balanceAtDate !== null ? h.balanceAtDate * p.atDate.usd : null;
              return (
                <div key={h.asset + h.network} style={{ flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <span>{h.asset} on {h.network}</span>
                    <span className="mono">
                      {amt(h.balanceNow)} · {vNow === null ? "price unavailable" : usd(vNow)}
                    </span>
                  </div>
                  {reply!.dateOfDeath ? (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <span className="muted">On {reply!.dateOfDeath}</span>
                      <span className="mono">
                        {h.balanceAtDate === null ? "not available" : `${amt(h.balanceAtDate)} · ${vAt === null ? "price unavailable" : usd(vAt)}`}
                      </span>
                    </div>
                  ) : null}
                  {reply!.dateOfDeath && h.atDateNote ? <span className="fine">{h.atDateNote}</span> : null}
                </div>
              );
            })
          ) : (
            <>
              <div><span>Network</span><span>—</span></div>
              <div><span>Balance now</span><span>Not read</span></div>
              <div><span>Value on valuation date</span><span>Not read</span></div>
            </>
          )}
        </div>

        {report?.unreadNetworks ? (
          <p className="fine" style={{ marginTop: 10 }}>Not read right now (public node did not answer): {report.unreadNetworks.join(", ")}. Their balances are unknown, not zero.</p>
        ) : null}
        <div className="integrity">
          <div className="label" style={{ marginBottom: 8 }}>Sources</div>
          {reply && report ? (
            <>
              <p className="fine" style={{ margin: "0 0 14px" }}>
                {Object.entries(reply.prices)
                  .map(([a, p]) => `${a}: ${p.now.source}${p.atDate ? `; ${p.atDate.source}` : ""}`)
                  .join(" · ")}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-small" onClick={download}>
                  Download sealed record <span className="arrow">↓</span>
                </button>
                <a className="btn btn-small" href={report.explorer} target="_blank" rel="noreferrer">
                  Open in explorer <span className="arrow">↗</span>
                </a>
              </div>
              {fingerprint ? <p className="fine" style={{ marginTop: 10, wordBreak: "break-all" }}>Sealed. Fingerprint (SHA-256): <span className="mono">{fingerprint}</span>. Anyone can check it at <a href="/verify">/verify</a>.</p> : null}
            </>
          ) : (
            <p className="fine" style={{ margin: 0 }}>
              No record until a complete reply is received. If a source does not answer, the record stays empty. It is
              never filled with an estimate.
            </p>
          )}
          <p className="fine" style={{ marginTop: 16 }}>
            A reading of what this address holds on the public ledger. It does not include exchange accounts and is not
            a legal or tax valuation.
          </p>
        </div>
      </div>
    </div>
  );
}
