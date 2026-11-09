"use client";

import { useState } from "react";

// A stack of case folders: the three stages of an estate case. Illustrative, no data.
const FOLDERS = [
  {
    tab: "Trace",
    title: "Where did it go?",
    copy: "Bank statements, emails and devices show which exchanges and wallets were used. We follow every lead.",
    href: "/tools/statements",
    cta: "Scan statements free",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="M15 15l5 5" />
      </svg>
    ),
  },
  {
    tab: "Value",
    title: "What was it worth?",
    copy: "Every address read on the public ledger and valued on the date that matters: death, separation or petition.",
    href: "#check",
    cta: "Read an address",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="8" cy="12" r="4" />
        <path d="M12 12h9M18 12v3M21 12v2" />
      </svg>
    ),
  },
  {
    tab: "Seal",
    title: "Can they check it?",
    copy: "Each record is sealed with a SHA-256 fingerprint, so opposing counsel or a court can confirm nothing was changed.",
    href: "/verify",
    cta: "Verify a record",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </svg>
    ),
  },
];

export function CaseFolders() {
  const [active, setActive] = useState(0);
  return (
    <div className="folders" role="tablist" aria-label="How TraceSworn works">
      {FOLDERS.map((f, i) => {
        // The active folder comes to the front; the others step back behind it.
        const depth = (i - active + FOLDERS.length) % FOLDERS.length;
        const on = i === active;
        return (
          <div
            key={f.tab}
            className={`folder f${i}`}
            style={{
              zIndex: 10 - depth,
              transform: `translateY(${-depth * 22}px) scale(${1 - depth * 0.04})`,
              transformOrigin: "top center",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={on}
              className="folder-tab"
              onClick={() => setActive(i)}
            >
              <span>0{i + 1}</span>
              {f.tab}
            </button>
            <div className="folder-body" role="tabpanel" aria-hidden={!on} style={{ visibility: on ? "visible" : "hidden" }}>
              <div className="glyph">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
              <a className="btn btn-small go" href={f.href} tabIndex={on ? 0 : -1}>
                {f.cta} <span className="arrow">→</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
