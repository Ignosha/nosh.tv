"use client";

import { useRef, useState } from "react";
import type { XpubScan } from "@/lib/xpub";
import type { Price } from "@/lib/chains";

type Reply = {
  readAt: string;
  dateOfDeath: string | null;
  scan: XpubScan;
  balanceAtDate: number | null;
  atDateNote?: string;
  price: { now: Price; atDate: Price | null };
};

const KIND: Record<string, string> = {
  legacy: "Legacy (1…)",
  "nested-segwit": "Nested SegWit (3…)",
  "native-segwit": "Native SegWit (bc1q…)",
  taproot: "Taproot (bc1p…)",
};
const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const btcAmt = (sats: number) => (sats / 1e8).toLocaleString("en-US", { maximumFractionDigits: 8 });

export function XpubScanner() {
  const [key, setKey] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    setError("");
    setReply(null);
    try {
      const res = await fetch("/api/xpub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xpub: key.trim(), dateOfDeath: date || undefined }),
        signal: c.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      setReply(data as Reply);
    } catch (err) {
      if (!c.signal.aborted) setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }

  function download() {
    if (!reply) return;
    const blob = new Blob([JSON.stringify({ generatedBy: "Kinledger wallet key scan", ...reply }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kinledger-wallet-scan-${reply.readAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const s = reply?.scan;
  const nowUsd = reply?.price.now.usd;
  const atUsd = reply?.price.atDate?.usd;

  return (
    <div className="instrument">
      <form onSubmit={run}>
        <div className="pane-head">
          <span>Hardware wallet key</span>
          <span>Read-only</span>
        </div>
        <h3 className="pane-title">Scan a whole wallet from its public key.</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Ledger Live, Trezor Suite, Sparrow and Electrum can show an <b>extended public key</b> (xpub, ypub or zpub). It
          lets us find every address the wallet has used. It cannot move funds.
        </p>
        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="xpub">Extended public key</label>
          <textarea id="xpub" className="boxed-input" style={{ minHeight: 90 }} value={key} onChange={(e) => { setKey(e.target.value); setReply(null); }} placeholder="xpub6… / ypub6… / zpub6…" spellCheck={false} />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="xdod">Date of death (optional)</label>
          <input id="xdod" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setReply(null); }} />
        </div>
        <button className="btn btn-primary" type="submit" style={{ marginTop: 18 }} disabled={busy || !key.trim()}>
          {busy ? "Scanning addresses…" : "Scan the wallet"} <span className="arrow">→</span>
        </button>
        <p className="fine" style={{ marginTop: 14 }}>
          Never paste a recovery phrase or a private key (xprv/zprv). Only the public key. Scanning checks up to 20 unused
          addresses in a row on each chain, read live from Blockstream.
        </p>
      </form>

      <div aria-live="polite">
        <div className="pane-head">
          <span>What the ledger says</span>
          <span>{reply ? `Read ${reply.readAt.slice(11, 19)} UTC` : busy ? "Scanning" : "Waiting"}</span>
        </div>
        {error ? <div className="notice err">{error}</div> : null}
        {!s && !error ? <p className="muted">Paste a key and press “Scan the wallet”. Results come only from the live ledger.</p> : null}
        {s ? (
          <>
            <div className="record-rows">
              <div><span>Addresses checked</span><span>{s.scanned}</span></div>
              <div><span>Addresses with history</span><span>{s.used.length}</span></div>
              <div><span>Address types in use</span><span>{s.kindsWithActivity.length ? s.kindsWithActivity.map((k) => KIND[k]).join(", ") : "none found"}</span></div>
              <div><span>Balance now</span><span>{btcAmt(s.totalSats)} BTC{nowUsd != null ? ` · ${usd((s.totalSats / 1e8) * nowUsd)}` : " · price unavailable"}</span></div>
              {reply!.dateOfDeath ? (
                <div>
                  <span>On {reply!.dateOfDeath}</span>
                  <span>
                    {reply!.balanceAtDate === null ? "not available" : `${reply!.balanceAtDate.toLocaleString("en-US", { maximumFractionDigits: 8 })} BTC · ${atUsd != null ? usd(reply!.balanceAtDate * atUsd) : "price unavailable"}`}
                  </span>
                </div>
              ) : null}
            </div>
            {reply!.atDateNote ? <p className="fine">{reply!.atDateNote}</p> : null}
            {s.used.length > 0 ? (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>Show {s.used.length} used address{s.used.length === 1 ? "" : "es"}</summary>
                <div className="table-scroll" style={{ marginTop: 10 }}>
                  <table className="clue-table" style={{ color: "inherit" }}>
                    <tbody>
                      {s.used.map((a) => (
                        <tr key={a.address}>
                          <td>
                            <a className="addr" href={`https://blockstream.info/address/${a.address}`} target="_blank" rel="noreferrer">{a.address}</a>
                            <div className="snippet" style={{ color: "inherit", opacity: 0.75 }}>{KIND[a.kind]} · path …/{a.path} · {a.txCount} tx</div>
                          </td>
                          <td className="num">{btcAmt(a.sats)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
            <div className="integrity">
              <p className="fine" style={{ margin: "0 0 12px" }}>
                Balances: Blockstream Esplora. Prices: {reply!.price.now.source}
                {reply!.price.atDate ? `; ${reply!.price.atDate.source}` : ""}.
              </p>
              <button type="button" className="btn btn-small" onClick={download}>Download the record <span className="arrow">↓</span></button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
