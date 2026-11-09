"use client";

import { downloadSealed } from "@/lib/download";

import { useMemo, useRef, useState } from "react";
import { extractClues, detectChain, type Clue, type Chain } from "@/lib/extract";
import type { AddressReport, Price } from "@/lib/chains";
import { readFile } from "@/lib/readFile";

type FileEntry = { name: string; chars: number; error?: string };
type AiClue = { type: string; name: string; evidence: string; file: string };
type Lookup = {
  readAt: string;
  dateOfDeath: string | null;
  reports: AddressReport[];
  prices: Record<string, { now: Price; atDate: Price | null }>;
  skipped: number;
};

const CHAIN_LABEL: Record<Chain, string> = { bitcoin: "Bitcoin", ethereum: "Ethereum", solana: "Solana" };

const fmtUsd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtAmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 8 });

export function ScanDesk() {
  const [fingerprint, setFingerprint] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [aiClues, setAiClues] = useState<AiClue[]>([]);
  const [manual, setManual] = useState("");
  const [paste, setPaste] = useState("");
  const [date, setDate] = useState("");
  const [tab, setTab] = useState<"findings" | "report" | "next">("findings");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [over, setOver] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const texts = useRef<{ name: string; text: string }[]>([]);
  const input = useRef<HTMLInputElement>(null);

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy("Reading documents on this device…");
    const entries: FileEntry[] = [];
    const found: Clue[] = [];
    for (const file of Array.from(list)) {
      try {
        const text = await readFile(file);
        texts.current.push({ name: file.name, text });
        found.push(...extractClues(file.name, text));
        entries.push({ name: file.name, chars: text.length });
      } catch (e) {
        entries.push({ name: file.name, chars: 0, error: e instanceof Error ? e.message : "Could not read" });
      }
    }
    setFiles((f) => [...f, ...entries]);
    setClues((c) => [...c, ...found]);
    setBusy(null);
    setTab("findings");
  }

  function scanPaste() {
    if (!paste.trim()) return;
    const name = `Pasted text ${texts.current.filter((t) => t.name.startsWith("Pasted")).length + 1}`;
    texts.current.push({ name, text: paste });
    setClues((c) => [...c, ...extractClues(name, paste)]);
    setFiles((f) => [...f, { name, chars: paste.length }]);
    setPaste("");
    setTab("findings");
  }

  function clearAll() {
    texts.current = [];
    setFiles([]);
    setClues([]);
    setAiClues([]);
    setLookup(null);
    setError("");
  }

  const addresses = useMemo(() => {
    const map = new Map<string, { chain: Chain; address: string; source: string }>();
    for (const c of clues) {
      if (c.kind !== "address") continue;
      const key = c.chain + ":" + (c.chain === "ethereum" ? c.address.toLowerCase() : c.address);
      if (!map.has(key)) map.set(key, { chain: c.chain, address: c.address, source: `${c.file}, line ${c.line}` });
    }
    for (const raw of manual.split(/[\s,;]+/)) {
      const a = raw.trim();
      const chain = a ? detectChain(a) : null;
      if (!chain) continue;
      const key = chain + ":" + (chain === "ethereum" ? a.toLowerCase() : a);
      if (!map.has(key)) map.set(key, { chain, address: a, source: "Entered by hand" });
    }
    return [...map.values()];
  }, [clues, manual]);

  const sources = clues.filter((c): c is Extract<Clue, { kind: "exchange" | "wallet" }> => c.kind === "exchange" || c.kind === "wallet");
  const phrases = clues.filter((c): c is Extract<Clue, { kind: "phrase" }> => c.kind === "phrase");
  const exchangeNames = [...new Set(sources.filter((s) => s.kind === "exchange").map((s) => s.name))];
  const walletNames = [...new Set(sources.filter((s) => s.kind === "wallet").map((s) => s.name))];

  async function runLookup() {
    if (addresses.length === 0) return;
    setBusy("Reading addresses on the public ledger…");
    setError("");
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: addresses.map(({ chain, address }) => ({ chain, address })), dateOfDeath: date || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setLookup(data as Lookup);
      setTab("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(null);
    }
  }

  async function runLocalAi() {
    if (texts.current.length === 0) return;
    setBusy("Asking your local AI model…");
    setError("");
    const found: AiClue[] = [];
    try {
      for (const { name, text } of texts.current) {
        for (let i = 0; i < Math.min(text.length, 36000); i += 12000) {
          const chunk = text.slice(i, i + 12000);
          const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: ollamaModel,
              stream: false,
              format: "json",
              messages: [
                {
                  role: "system",
                  content:
                    'You help an estate representative find cryptocurrency a deceased person may have owned. From the document, list every clue: exchanges, wallet apps, hardware wallets, crypto custodians or funds, crypto purchases or transfers, devices or notes that may hold keys. Reply only with JSON: {"clues":[{"type":"exchange|wallet|hardware|transfer|device|note|other","name":"short name","evidence":"short quote from the document"}]}. Never repeat a recovery phrase or password; write "possible recovery phrase" instead. If nothing is found reply {"clues":[]}.',
                },
                { role: "user", content: chunk },
              ],
            }),
          });
          if (!res.ok) throw new Error(`Ollama replied ${res.status}`);
          const data = (await res.json()) as { message?: { content?: string } };
          try {
            const parsed = JSON.parse(data.message?.content ?? "{}") as { clues?: { type?: string; name?: string; evidence?: string }[] };
            for (const c of parsed.clues ?? []) {
              if (c.name) found.push({ type: String(c.type ?? "other"), name: String(c.name), evidence: String(c.evidence ?? "").slice(0, 240), file: name });
            }
          } catch {
            /* model returned non-JSON; skip this chunk */
          }
        }
      }
      setAiClues(found);
      setTab("findings");
    } catch (e) {
      setError(
        e instanceof Error && e.message.startsWith("Ollama")
          ? e.message
          : "Could not reach Ollama. Start it with OLLAMA_ORIGINS set to this site's address (see the note below).",
      );
    } finally {
      setBusy(null);
    }
  }

  // ---------- report math ----------
  const rows = useMemo(() => {
    if (!lookup) return [];
    return lookup.reports.flatMap((r) =>
      r.ok
        ? r.holdings.map((h, hi) => {
            const p = lookup.prices[h.asset];
            const nowUsd = p?.now.usd ?? null;
            const dodUsd = p?.atDate?.usd ?? null;
            return {
              report: r,
              holding: h,
              first: hi === 0,
              valueNow: nowUsd !== null ? h.balanceNow * nowUsd : null,
              valueAtDate: dodUsd !== null && h.balanceAtDate !== null ? h.balanceAtDate * dodUsd : null,
            };
          })
        : [],
    );
  }, [lookup]);
  const totalNow = rows.reduce((s, r) => s + (r.valueNow ?? 0), 0);
  const totalDod = rows.reduce((s, r) => s + (r.valueAtDate ?? 0), 0);
  const dodComplete = rows.length > 0 && rows.every((r) => r.valueAtDate !== null || (r.holding.balanceNow === 0 && r.holding.balanceAtDate === 0));
  const failed = lookup?.reports.filter((r) => !r.ok) ?? [];

  async function exportJson() {
    if (!lookup) return;
    const fp = await downloadSealed({ generatedBy: "TraceSworn estate scan", ...lookup }, `tracesworn-ledger-reading-${lookup.readAt.slice(0, 10)}.json`);
    setFingerprint(fp);
  }

  return (
    <div className="wrap desk">
      {/* ---------- left: inputs ---------- */}
      <div className="no-print">
        <div className="desk-panel">
          <div className="label" style={{ marginBottom: 12 }}>1 · Documents</div>
          <div
            className={`dropzone${over ? " over" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <span className="serif" style={{ fontSize: 20 }}>Drop files here</span>
            <span className="faint" style={{ fontSize: 13 }}>PDF statements, email exports (.eml, .mbox), notes, CSV</span>
          </div>
          <input ref={input} type="file" multiple hidden accept=".pdf,.txt,.eml,.mbox,.csv,.tsv,.json,.md,.log,.html,.htm,.xml,.rtf,text/*" onChange={(e) => addFiles(e.target.files)} />
          {files.length > 0 ? (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={i}>
                  <span>{f.name}</span>
                  <span className={f.error ? "" : "faint"} style={f.error ? { color: "var(--none)" } : undefined}>
                    {f.error ?? `${f.chars.toLocaleString()} chars`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="paste">Or paste text</label>
            <textarea id="paste" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="An email, a note, a statement…" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-small" onClick={scanPaste} disabled={!paste.trim()}>Scan pasted text</button>
            {files.length > 0 ? <button className="btn btn-small" onClick={clearAll}>Clear all</button> : null}
          </div>
          <p className="faint" style={{ fontSize: 12.5, margin: "14px 0 0" }}>
            Documents are read in this browser only. Nothing is uploaded. Only the addresses you choose to look up are
            sent, to read their public balances.
          </p>
        </div>

        <div className="desk-panel">
          <div className="label" style={{ marginBottom: 12 }}>2 · Addresses &amp; date</div>
          <div className="field">
            <label htmlFor="manual">Add addresses by hand</label>
            <textarea id="manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Bitcoin, Ethereum or Solana addresses, one per line" style={{ minHeight: 72 }} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="dod">Date of death</label>
            <input id="dod" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={runLookup} disabled={addresses.length === 0 || !!busy}>
            Read {addresses.length || ""} address{addresses.length === 1 ? "" : "es"} on the ledger
          </button>
        </div>

        <details className="desk-panel">
          <summary className="label" style={{ cursor: "pointer" }}>3 · Deeper scan with local AI (optional)</summary>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Uses <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a>, a free AI model running on your
            own computer, to spot clues the pattern scan misses. Your documents still never leave your machine.
          </p>
          <div className="field">
            <label htmlFor="ourl">Ollama address</label>
            <input id="ourl" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="omodel">Model</label>
            <input id="omodel" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} />
          </div>
          <button className="btn btn-small" style={{ marginTop: 14 }} onClick={runLocalAi} disabled={files.length === 0 || !!busy}>
            Run local AI scan
          </button>
          <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
            Setup: install Ollama, run <span className="mono">ollama pull {ollamaModel}</span>, then start it with{" "}
            <span className="mono">OLLAMA_ORIGINS={typeof window !== "undefined" ? window.location.origin : "<this site>"} ollama serve</span>.
          </p>
        </details>
      </div>

      {/* ---------- right: results ---------- */}
      <div>
        <div className="tabs no-print" role="tablist">
          <button role="tab" aria-selected={tab === "findings"} onClick={() => setTab("findings")}>
            Findings ({addresses.length + new Set(sources.map((s) => s.name)).size + phrases.length + aiClues.length})
          </button>
          <button role="tab" aria-selected={tab === "report"} onClick={() => setTab("report")}>Ledger report</button>
          <button role="tab" aria-selected={tab === "next"} onClick={() => setTab("next")}>Next steps</button>
        </div>

        {busy ? <div className="notice" role="status" style={{ marginBottom: 16 }}>{busy}</div> : null}
        {error ? <div className="notice err" role="alert" style={{ marginBottom: 16 }}>{error}</div> : null}

        {tab === "findings" ? (
          <Findings addresses={addresses} sources={sources} phrases={phrases} aiClues={aiClues} />
        ) : null}

        {tab === "report" ? (
          !lookup ? (
            <div className="empty">Add documents or addresses, then read them on the ledger.</div>
          ) : (
            <div className="desk-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <div className="label">Ledger reading</div>
                  <h2 className="serif" style={{ fontSize: 32, margin: "4px 0 0" }}>Estate holdings report</h2>
                </div>
                <div className="no-print" style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-small" onClick={exportJson}>Download sealed record</button>
                  <button className="btn btn-small" onClick={() => window.print()}>Print / PDF</button>
                </div>
              </div>

              <div className="totals">
                <div>
                  <div className="label">Value now</div>
                  <div className="big">{fmtUsd(totalNow)}</div>
                </div>
                <div>
                  <div className="label">Value on date of death</div>
                  <div className="big">{lookup.dateOfDeath ? (rows.some((r) => r.valueAtDate !== null) ? fmtUsd(totalDod) : "—") : "—"}</div>
                  {lookup.dateOfDeath && rows.length > 0 && !dodComplete ? (
                    <div className="faint" style={{ fontSize: 12 }}>Partial — some holdings have no historical reading (see notes)</div>
                  ) : null}
                </div>
                <div>
                  <div className="label">Addresses read</div>
                  <div className="big">
                    {lookup.reports.length - failed.length}/{lookup.reports.length}
                  </div>
                </div>
              </div>

              <div className="table-scroll">
                <table className="clue-table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Asset</th>
                      <th style={{ textAlign: "right" }}>Balance now</th>
                      <th style={{ textAlign: "right" }}>Value now</th>
                      {lookup.dateOfDeath ? <th style={{ textAlign: "right" }}>Balance {lookup.dateOfDeath}</th> : null}
                      {lookup.dateOfDeath ? <th style={{ textAlign: "right" }}>Value {lookup.dateOfDeath}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ report, holding, first, valueNow, valueAtDate }, i) => (
                      <tr key={i}>
                        <td className="addr-cell">
                          <a className="addr" href={report.explorer} target="_blank" rel="noreferrer">{report.address}</a>
                          <div className="snippet">
                            {CHAIN_LABEL[report.chain]}
                            {report.txCount !== undefined ? ` · ${report.txCount} tx` : ""}
                            {report.lastSeen ? ` · last active ${report.lastSeen.slice(0, 10)}` : ""}
                          </div>
                          {first && holding.atDateNote ? <div className="snippet">{holding.atDateNote}</div> : null}
                          {first && report.unreadNetworks ? <div className="snippet" style={{ color: "var(--pending)" }}>Not read (public node did not answer): {report.unreadNetworks.join(", ")}</div> : null}
                        </td>
                        <td className="mono">{holding.asset}<div className="snippet">{holding.network}</div></td>
                        <td className="num">{fmtAmt(holding.balanceNow)}</td>
                        <td className="num">{valueNow === null ? "—" : fmtUsd(valueNow)}</td>
                        {lookup.dateOfDeath ? <td className="num">{holding.balanceAtDate === null ? "—" : fmtAmt(holding.balanceAtDate)}</td> : null}
                        {lookup.dateOfDeath ? <td className="num">{valueAtDate === null ? "—" : fmtUsd(valueAtDate)}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {failed.length > 0 ? (
                <div className="notice warn" style={{ marginTop: 16 }}>
                  Could not read {failed.length} address{failed.length === 1 ? "" : "es"} right now:
                  {failed.map((f) => (
                    <div key={f.address} className="addr">{f.address} — {f.error}</div>
                  ))}
                  Try again shortly; free public endpoints sometimes rate-limit.
                </div>
              ) : null}

              <div style={{ marginTop: 24 }}>
                <div className="label" style={{ marginBottom: 8 }}>Prices used</div>
                <ul className="ledger-rows wrap-rows">
                  {Object.entries(lookup.prices).map(([asset, p]) => (
                    <li key={asset}>
                      <span className="k">
                        {asset} now — {p.now.source}
                        {p.atDate ? ` · ${lookup.dateOfDeath}: ${p.atDate.source}${p.atDate.note ? ` (${p.atDate.note})` : ""}` : ""}
                      </span>
                      <span>
                        {p.now.usd === null ? "unavailable" : fmtUsd(p.now.usd)}
                        {p.atDate ? ` · ${p.atDate.usd === null ? "unavailable" : fmtUsd(p.atDate.usd)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {fingerprint ? <p className="fine" style={{ marginTop: 10, wordBreak: "break-all" }}>Sealed. Fingerprint (SHA-256): <span className="mono">{fingerprint}</span>. Anyone can check it at <a href="/verify">/verify</a>.</p> : null}
              <p className="faint" style={{ fontSize: 12.5, marginTop: 16 }}>
                Read {lookup.readAt.replace("T", " ").slice(0, 19)} UTC from Blockstream (Bitcoin), PublicNode (Ethereum),
                Solana mainnet RPC, Coinbase Exchange and CoinGecko. Balances shown are what each address holds on the
                public ledger; they do not include exchange accounts. This is a factual reading, not a legal or tax
                valuation.
              </p>
            </div>
          )
        ) : null}

        {tab === "next" ? <NextSteps exchanges={exchangeNames} wallets={walletNames} phrases={phrases.length} /> : null}
      </div>
    </div>
  );
}

function Findings({
  addresses,
  sources,
  phrases,
  aiClues,
}: {
  addresses: { chain: Chain; address: string; source: string }[];
  sources: Extract<Clue, { kind: "exchange" | "wallet" }>[];
  phrases: Extract<Clue, { kind: "phrase" }>[];
  aiClues: AiClue[];
}) {
  if (addresses.length + sources.length + phrases.length + aiClues.length === 0) {
    return <div className="empty">No findings yet. Add documents on the left — they are read on this device only.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {phrases.length > 0 ? (
        <div className="notice warn">
          <b>Possible recovery phrase found</b> in{" "}
          {phrases.map((p, i) => (
            <span key={i}>
              {i ? "; " : ""}
              {p.file}, line {p.line} ({p.words} words)
            </span>
          ))}
          . It is not displayed here. Do not type it into any website or share it by email or chat. Keep the original
          document safe and offline.
        </div>
      ) : null}

      {addresses.length > 0 ? (
        <section>
          <div className="label" style={{ marginBottom: 8 }}>Wallet addresses · {addresses.length}</div>
          <div className="table-scroll">
            <table className="clue-table">
              <tbody>
                {addresses.map((a) => (
                  <tr key={a.chain + a.address}>
                    <td style={{ width: 90 }} className="mono">{CHAIN_LABEL[a.chain]}</td>
                    <td>
                      <span className="addr">{a.address}</span>
                      <div className="snippet">{a.source}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sources.length > 0 ? (
        <section>
          <div className="label" style={{ marginBottom: 8 }}>Exchanges &amp; wallets mentioned · {sources.length}</div>
          <table className="clue-table">
            <tbody>
              {sources.map((s, i) => (
                <tr key={i}>
                  <td style={{ width: 90 }}>
                    <span className={`stamp ${s.kind === "exchange" ? "stamp-found" : "stamp-pending"}`}>{s.kind}</span>
                  </td>
                  <td>
                    <b style={{ fontWeight: 500 }}>{s.name}</b>
                    <div className="snippet">{s.file}, line {s.line}: {s.snippet}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {aiClues.length > 0 ? (
        <section>
          <div className="label" style={{ marginBottom: 8 }}>Local AI suggestions · verify each one · {aiClues.length}</div>
          <table className="clue-table">
            <tbody>
              {aiClues.map((c, i) => (
                <tr key={i}>
                  <td style={{ width: 90 }} className="mono">{c.type}</td>
                  <td>
                    <b style={{ fontWeight: 500 }}>{c.name}</b>
                    <div className="snippet">{c.file}: {c.evidence}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function NextSteps({ exchanges, wallets, phrases }: { exchanges: string[]; wallets: string[]; phrases: number }) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section className="desk-panel">
        <h3>Exchange accounts{exchanges.length ? `: ${exchanges.join(", ")}` : ""}</h3>
        <p className="muted">
          Exchanges hold the assets themselves and each has a process for deceased account holders. Search the
          exchange&rsquo;s official help center for &ldquo;deceased&rdquo; and only use contact details from its own
          website. Most ask for:
        </p>
        <ul className="muted">
          <li>A certified death certificate</li>
          <li>Court letters (testamentary or administration) naming the executor or administrator</li>
          <li>Government ID for the executor</li>
          <li>The account holder&rsquo;s name, email address and, if known, the account email or ID</li>
          <li>For some exchanges, a small-estate affidavit instead of court letters</li>
        </ul>
      </section>
      <section className="desk-panel">
        <h3>Self-custody wallets{wallets.length ? `: ${wallets.join(", ")}` : ""}</h3>
        <p className="muted">
          Keep any phone, computer or hardware wallet powered off and unchanged. Do not reset or update devices. A
          wallet can be opened with its recovery phrase, or with its file and password. Partial phrases and forgotten
          passwords can sometimes be recovered offline.
        </p>
        {phrases > 0 ? <div className="notice warn">This scan flagged a possible recovery phrase. Treat the source document like cash.</div> : null}
      </section>
      <section className="desk-panel">
        <h3>Beware recovery scams</h3>
        <p className="muted" style={{ margin: 0 }}>
          Anyone who contacts you offering to recover crypto for an upfront fee, or who asks for a recovery phrase, is
          almost certainly a scammer. Legitimate help never needs your phrase sent online.
        </p>
      </section>
      <a href="/#open-a-case" className="btn btn-primary no-print" style={{ justifySelf: "start" }}>Open a case with TraceSworn</a>
    </div>
  );
}
