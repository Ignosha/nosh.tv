"use client";

import { useState } from "react";
import { buildLetter, type REQUESTS } from "@/lib/letters";

// Builds a deceased-account request letter for an exchange. Everything stays in this browser.
const EXCHANGES = [
  "Coinbase", "Kraken", "Binance.US", "Binance", "Gemini", "Crypto.com", "Bitstamp", "KuCoin", "OKX", "Bybit",
  "Robinhood", "Cash App", "PayPal", "Uphold", "eToro", "River", "Strike", "Swan Bitcoin", "Blockchain.com",
];
const ROLES = ["Executor", "Administrator", "Personal Representative", "Trustee", "Next of kin (small estate)"];
const DOCS = [
  "Certified copy of the death certificate",
  "Letters testamentary / letters of administration",
  "Small-estate affidavit",
  "Government-issued photo ID of the representative",
  "Copy of the will or trust (relevant pages)",
  "Estate tax ID (EIN) letter",
];


type F = {
  exchange: string;
  custom: string;
  decedent: string;
  dod: string;
  accountEmail: string;
  accountId: string;
  rep: string;
  role: string;
  repEmail: string;
  repPhone: string;
  repAddress: string;
  court: string;
  caseNo: string;
  request: keyof typeof REQUESTS;
  docs: string[];
};

export function LetterBuilder() {
  const [f, setF] = useState<F>({
    exchange: "Coinbase", custom: "", decedent: "", dod: "", accountEmail: "", accountId: "",
    rep: "", role: ROLES[0], repEmail: "", repPhone: "", repAddress: "", court: "", caseNo: "",
    request: "transfer", docs: [DOCS[0], DOCS[1], DOCS[3]],
  });
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));
  const name = f.exchange === "Other" ? f.custom || "[Exchange name]" : f.exchange;
  const ready = f.decedent && f.rep && f.dod;
  const letter = buildLetter({ ...f, exchange: name });

  function copy() {
    navigator.clipboard?.writeText(letter).catch(() => {});
  }

  return (
    <div className="instrument">
      <form className="no-print" onSubmit={(e) => e.preventDefault()}>
        <div className="pane-head"><span>Details</span><span>Stays in your browser</span></div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ex">Exchange</label>
            <select id="ex" value={f.exchange} onChange={(e) => set("exchange", e.target.value)}>
              {EXCHANGES.map((x) => <option key={x}>{x}</option>)}
              <option>Other</option>
            </select>
          </div>
          {f.exchange === "Other" ? (
            <div className="field"><label htmlFor="cx">Exchange name</label><input id="cx" value={f.custom} onChange={(e) => set("custom", e.target.value)} /></div>
          ) : <div />}
          <div className="field"><label htmlFor="dn">Full legal name of the deceased</label><input id="dn" value={f.decedent} onChange={(e) => set("decedent", e.target.value)} /></div>
          <div className="field"><label htmlFor="dd">Date of death</label><input id="dd" type="date" value={f.dod} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("dod", e.target.value)} /></div>
          <div className="field"><label htmlFor="ae">Account email (if known)</label><input id="ae" value={f.accountEmail} onChange={(e) => set("accountEmail", e.target.value)} /></div>
          <div className="field"><label htmlFor="ai">Account / user ID (if known)</label><input id="ai" value={f.accountId} onChange={(e) => set("accountId", e.target.value)} /></div>
          <div className="field"><label htmlFor="rn">Your full name</label><input id="rn" value={f.rep} onChange={(e) => set("rep", e.target.value)} /></div>
          <div className="field">
            <label htmlFor="rr">Your role</label>
            <select id="rr" value={f.role} onChange={(e) => set("role", e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="re">Your email</label><input id="re" type="email" value={f.repEmail} onChange={(e) => set("repEmail", e.target.value)} /></div>
          <div className="field"><label htmlFor="rp">Your phone</label><input id="rp" value={f.repPhone} onChange={(e) => set("repPhone", e.target.value)} /></div>
          <div className="field full"><label htmlFor="ra">Your mailing address</label><input id="ra" value={f.repAddress} onChange={(e) => set("repAddress", e.target.value)} /></div>
          <div className="field"><label htmlFor="ct">Court (optional)</label><input id="ct" value={f.court} onChange={(e) => set("court", e.target.value)} placeholder="e.g. Probate Court of … County" /></div>
          <div className="field"><label htmlFor="cn">Case number (optional)</label><input id="cn" value={f.caseNo} onChange={(e) => set("caseNo", e.target.value)} /></div>
          <div className="field full">
            <label htmlFor="rq">What you are asking for</label>
            <select id="rq" value={f.request} onChange={(e) => set("request", e.target.value as F["request"])}>
              <option value="transfer">Transfer the assets to the estate</option>
              <option value="liquidate">Sell and send the proceeds to the estate</option>
              <option value="statement">Only a statement of holdings for now</option>
            </select>
          </div>
          <fieldset className="field full choice-row" style={{ display: "block" }}>
            <legend>Documents you are enclosing</legend>
            <div className="choice-row">
              {DOCS.map((d) => (
                <label key={d}>
                  <input type="checkbox" checked={f.docs.includes(d)} onChange={(e) => set("docs", e.target.checked ? [...f.docs, d] : f.docs.filter((x) => x !== d))} /> {d}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </form>

      <div>
        <div className="pane-head no-print"><span>Your letter</span><span>{ready ? "Ready to send" : "Fill in the required details"}</span></div>
        <pre className="letter">{letter}</pre>
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button type="button" className="btn btn-small" onClick={() => window.print()}>Print / save PDF</button>
          <button type="button" className="btn btn-small" onClick={copy}>Copy text</button>
        </div>
        <p className="fine no-print" style={{ marginTop: 14 }}>
          Send it only through the exchange&rsquo;s official website or help center (search &ldquo;deceased&rdquo;). Some exchanges
          require their own form as well. This is a template, not legal advice; your attorney may adjust it.
        </p>
      </div>
    </div>
  );
}
