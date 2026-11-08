"use client";

import { useState } from "react";

// A stack of case folders: the three stages of an estate case. Illustrative, no data.
const FOLDERS = [
  {
    tab: "Find",
    title: "Where is it?",
    copy: "We trace exchanges, wallets and addresses through the emails, statements and notes they left behind.",
    href: "/scan",
    cta: "Run the free scan",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="M15 15l5 5" />
      </svg>
    ),
  },
  {
    tab: "Open",
    title: "Who can open it?",
    copy: "Exchange claims for the executor, and offline recovery of forgotten passwords or partial phrases.",
    href: "#services",
    cta: "See recovery services",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="8" cy="12" r="4" />
        <path d="M12 12h9M18 12v3M21 12v2" />
      </svg>
    ),
  },
  {
    tab: "Prove",
    title: "What was it worth?",
    copy: "Balances and prices on the date of death, every figure with its public source, ready for the attorney.",
    href: "#check",
    cta: "Check an address",
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
    <div className="folders" role="tablist" aria-label="Stages of an estate case">
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
