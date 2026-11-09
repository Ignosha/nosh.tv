"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PACKAGES, priceLabel } from "@/lib/pricing";

const ROLES = [
  ["attorney", "Attorney"],
  ["executor", "Executor / fiduciary"],
  ["trustee", "Trustee"],
  ["advisor", "CPA / advisor"],
  ["family", "Individual"],
] as const;

const MATTERS = [
  ["estate", "Estate / probate", "Date of death"],
  ["divorce", "Divorce", "Date of separation"],
  ["bankruptcy", "Bankruptcy", "Petition date"],
  ["other", "Other dispute", "Valuation date"],
] as const;

export function IntakeForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [pkg, setPkg] = useState("unsure");
  const [portal, setPortal] = useState("");
  const [matter, setMatter] = useState<(typeof MATTERS)[number][0]>("estate");
  const dateLabel = MATTERS.find((m) => m[0] === matter)![2];
  const params = useSearchParams();

  useEffect(() => {
    // A package button links here with ?package=<id>; follow it even when the page doesn't reload.
    const id = params.get("package");
    if (id && PACKAGES.some((p) => p.id === id)) setPkg(id);
  }, [params]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as Record<string, unknown>;
    body.consent = form.get("consent") === "on";
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { ok?: boolean; error?: string; portal?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.portal) setPortal(data.portal);
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="exhibit" data-tab="Received">
        <div className="exhibit-head">
          <span className="serif" style={{ fontSize: 24 }}>Your matter is open.</span>
          <span className="stamp stamp-found">Filed</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          We&rsquo;ll reply by email within one business day with the engagement letter. Meanwhile, keep any devices
          exactly as they are, and never share passwords, keys or recovery phrases with anyone.
        </p>
        {portal ? (
          <a className="btn btn-primary" href={portal} style={{ marginTop: 18 }}>
            Open the matter page <span className="arrow">→</span>
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="form-grid" noValidate>
      <fieldset className="field full choice-row" style={{ display: "block" }}>
        <legend>I am</legend>
        <div className="choice-row">
          {ROLES.map(([value, label], i) => (
            <label key={value}>
              <input type="radio" name="role" value={value} defaultChecked={i === 0} /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field full">
        <label htmlFor="package">Package</label>
        <select id="package" name="package" value={pkg} onChange={(e) => setPkg(e.target.value)}>
          <option value="unsure">Not sure yet, help me choose</option>
          {PACKAGES.filter((p) => p.id !== "scan").map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}: {priceLabel(p)}
              {p.cadence === "once" ? " flat" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="region">State / country</label>
        <input id="region" name="region" autoComplete="address-level1" />
      </div>
      <fieldset className="field full choice-row" style={{ display: "block" }}>
        <legend>Type of matter</legend>
        <div className="choice-row">
          {MATTERS.map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="matterType" value={value} checked={matter === value} onChange={() => setMatter(value)} /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="dateOfDeath">{dateLabel}</label>
        <input id="dateOfDeath" name="dateOfDeath" type="date" max={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="field">
        <label htmlFor="hasAuthority">{matter === "estate" ? "Court letters issued?" : "Case filed?"}</label>
        <select id="hasAuthority" name="hasAuthority" defaultValue="unknown">
          <option value="yes">Yes</option>
          <option value="in-progress">In progress</option>
          <option value="no">Not yet</option>
          <option value="unknown">Not sure</option>
        </select>
      </div>
      <div className="field full">
        <label htmlFor="knownHoldings">What is known or suspected about the crypto?</label>
        <textarea id="knownHoldings" name="knownHoldings" placeholder="Exchanges mentioned, transfers seen on statements, coins, rough amounts, anything at all." />
      </div>
      <div className="field full">
        <label htmlFor="devices">Records and devices available</label>
        <textarea id="devices" name="devices" placeholder="Bank statements, tax returns, emails, a phone, a hardware wallet… Do not include passwords, keys or recovery phrases." />
      </div>
      <div className="field full">
        <label htmlFor="message">Anything else</label>
        <textarea id="message" name="message" />
      </div>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="consent full">
        <input type="checkbox" name="consent" required />
        <span>
          I act for, or am authorised by, a party to this matter, and I agree TraceSworn may contact me about this
          request. I have not included any password, private key or recovery phrase.
        </span>
      </label>
      {state === "error" ? <div className="notice err full" role="alert">{error}</div> : null}
      <div className="full">
        <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Open the matter"}
        </button>
      </div>
    </form>
  );
}
