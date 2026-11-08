"use client";

import { useState } from "react";

// A crypto letter of instruction for the living. It records WHERE things are, never the secrets themselves.
// Nothing is sent anywhere; the owner prints it or saves it as a file.
type Item = { kind: string; name: string; contents: string; where: string; backup: string };
const KINDS = ["Exchange account", "Hardware wallet", "Phone or desktop wallet", "Paper or metal backup", "Other"];
const SECRETISH = /\b([a-z]{3,8}\s+){11,}[a-z]{3,8}\b|\b(xprv|zprv|yprv)[1-9A-HJ-NP-Za-km-z]{20,}|\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/i;

export function PlanBuilder() {
  const [owner, setOwner] = useState("");
  const [trusted, setTrusted] = useState("");
  const [attorney, setAttorney] = useState("");
  const [items, setItems] = useState<Item[]>([{ kind: KINDS[0], name: "", contents: "", where: "", backup: "" }]);
  const [notes, setNotes] = useState("");

  const update = (i: number, k: keyof Item, v: string) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const allText = [owner, trusted, attorney, notes, ...items.flatMap((x) => Object.values(x))].join(" ");
  const leak = SECRETISH.test(allText);
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const doc = `CRYPTO LETTER OF INSTRUCTION
Prepared by ${owner || "[your name]"} · ${date}

This letter explains what digital assets I hold and where to find them. It deliberately contains no passwords,
PINs or recovery phrases. Those are stored separately, as described below.

Person I trust to act: ${trusted || "[name and contact]"}
${attorney ? `Estate attorney: ${attorney}\n` : ""}
WHAT I HOLD
${items
  .map(
    (x, i) => `
${i + 1}. ${x.kind}${x.name ? ` — ${x.name}` : ""}
   What it holds (roughly): ${x.contents || "—"}
   Where it is: ${x.where || "—"}
   Where the backup or login help is kept: ${x.backup || "—"}`,
  )
  .join("\n")}

${notes ? `NOTES\n${notes}\n\n` : ""}IMPORTANT
• Do not share any recovery phrase with anyone who contacts you offering help. Real help never needs it sent online.
• Exchange accounts are claimed through each exchange's deceased-account process with a death certificate and court letters.
• Keep hardware wallets powered off and unchanged until someone qualified helps.`;

  function download() {
    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "crypto-letter-of-instruction.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="instrument">
      <form className="no-print" onSubmit={(e) => e.preventDefault()}>
        <div className="pane-head"><span>Your plan</span><span>Never leaves this device</span></div>
        <div className="notice warn" style={{ marginBottom: 18 }}>
          Write <b>where</b> things are, never the secrets themselves. No recovery phrases, passwords or PINs in this letter.
        </div>
        <div className="form-grid">
          <div className="field"><label htmlFor="ow">Your name</label><input id="ow" value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
          <div className="field"><label htmlFor="tr">Person you trust (name, contact)</label><input id="tr" value={trusted} onChange={(e) => setTrusted(e.target.value)} /></div>
          <div className="field full"><label htmlFor="at">Estate attorney (optional)</label><input id="at" value={attorney} onChange={(e) => setAttorney(e.target.value)} /></div>
        </div>
        {items.map((x, i) => (
          <div key={i} className="desk-panel" style={{ marginTop: 16, background: "var(--paper)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <b>Holding {i + 1}</b>
              {items.length > 1 ? <button type="button" className="btn btn-small" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>Remove</button> : null}
            </div>
            <div className="form-grid">
              <div className="field"><label>Type</label><select value={x.kind} onChange={(e) => update(i, "kind", e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
              <div className="field"><label>Name</label><input value={x.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="e.g. Coinbase, Ledger Nano X" /></div>
              <div className="field full"><label>What it holds, roughly</label><input value={x.contents} onChange={(e) => update(i, "contents", e.target.value)} placeholder="e.g. mostly Bitcoin, some Ethereum" /></div>
              <div className="field full"><label>Where it is</label><input value={x.where} onChange={(e) => update(i, "where", e.target.value)} placeholder="e.g. desk drawer at home; account email is …" /></div>
              <div className="field full"><label>Where its backup or login help is kept</label><input value={x.backup} onChange={(e) => update(i, "backup", e.target.value)} placeholder="e.g. metal backup in the bank safe-deposit box" /></div>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-small" style={{ marginTop: 14 }} onClick={() => setItems((xs) => [...xs, { kind: KINDS[0], name: "", contents: "", where: "", backup: "" }])}>
          + Add another holding
        </button>
        <div className="field" style={{ marginTop: 16 }}><label htmlFor="nt">Notes</label><textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </form>

      <div>
        <div className="pane-head no-print"><span>Your letter</span><span>Print it and store it safely</span></div>
        {leak ? <div className="notice err no-print" style={{ marginBottom: 12 }}>This looks like it contains a recovery phrase or private key. Remove it before printing.</div> : null}
        <pre className="letter">{doc}</pre>
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button type="button" className="btn btn-small" onClick={() => window.print()} disabled={leak}>Print / save PDF</button>
          <button type="button" className="btn btn-small" onClick={download} disabled={leak}>Download as text</button>
        </div>
      </div>
    </div>
  );
}
