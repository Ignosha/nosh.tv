"use client";

import { useState } from "react";

const ROLES = [
  ["family", "Family member"],
  ["executor", "Executor"],
  ["attorney", "Attorney"],
  ["advisor", "Advisor / CPA"],
] as const;

export function IntakeForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as Record<string, unknown>;
    body.consent = form.get("consent") === "on";
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
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
          <span className="serif" style={{ fontSize: 24 }}>Your case is open.</span>
          <span className="stamp stamp-found">Filed</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          We&rsquo;ll reply by email within one business day. Meanwhile, keep any devices, papers and notes exactly as
          they are, and don&rsquo;t share passwords or recovery phrases with anyone who contacts you.
        </p>
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
      <div className="field">
        <label htmlFor="dateOfDeath">Date of death</label>
        <input id="dateOfDeath" name="dateOfDeath" type="date" max={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="field">
        <label htmlFor="hasAuthority">Court letters issued?</label>
        <select id="hasAuthority" name="hasAuthority" defaultValue="unknown">
          <option value="yes">Yes</option>
          <option value="in-progress">In progress</option>
          <option value="no">Not yet</option>
          <option value="unknown">Not sure</option>
        </select>
      </div>
      <div className="field full">
        <label htmlFor="knownHoldings">What do you know about their crypto?</label>
        <textarea id="knownHoldings" name="knownHoldings" placeholder="Exchanges they mentioned, coins, rough amounts, anything at all." />
      </div>
      <div className="field full">
        <label htmlFor="devices">Devices and papers you have</label>
        <textarea id="devices" name="devices" placeholder="Phone, laptop, a hardware wallet, a notebook… Do not include passwords or recovery phrases." />
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
          I&rsquo;m entitled to act for this estate or am asking on behalf of someone who is, and I agree Kinledger may
          contact me about this request. I have not included any password or recovery phrase.
        </span>
      </label>
      {state === "error" ? <div className="notice err full" role="alert">{error}</div> : null}
      <div className="full">
        <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Open my case"}
        </button>
      </div>
    </form>
  );
}
