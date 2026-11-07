"use client";

import { useState } from "react";

// Explanatory geometry: three layers of an estate case. It represents no measured quantity.
const PLATES = [
  {
    no: "01",
    name: "Find",
    title: "Where is it?",
    copy: "Exchanges, wallets and addresses, found in the documents they left behind.",
    href: "/scan",
    link: "Run the estate scan",
  },
  {
    no: "02",
    name: "Open",
    title: "Who can open it?",
    copy: "Exchange claims for the executor, and offline password or partial-phrase recovery.",
    href: "#services",
    link: "See recovery services",
  },
  {
    no: "03",
    name: "Prove",
    title: "What was it worth?",
    copy: "Balances and prices on the date of death, each with its public source named.",
    href: "#instrument",
    link: "Read an address",
  },
];

const S = 92; // half-size of a plate in its own plane
const ISO = (cx: number, cy: number) => `matrix(0.866 0.5 -0.866 0.5 ${cx} ${cy})`;

function Motif({ i }: { i: number }) {
  if (i === 0)
    // ruled document + magnifier
    return (
      <g className="motif" strokeWidth={1}>
        {[-48, -30, -12, 6, 24, 42].map((y) => (
          <line key={y} x1={-62} y1={y} x2={y > 20 ? 10 : 58} y2={y} />
        ))}
        <circle cx={30} cy={-8} r={26} strokeWidth={1.4} />
        <line x1={48} y1={10} x2={68} y2={30} strokeWidth={1.4} />
      </g>
    );
  if (i === 1)
    // key: ruled bow and toothed shaft
    return (
      <g className="motif" strokeWidth={1.3}>
        <circle cx={-38} cy={0} r={28} />
        <circle cx={-38} cy={0} r={14} strokeWidth={0.9} />
        <line x1={-10} y1={0} x2={66} y2={0} />
        <line x1={44} y1={0} x2={44} y2={16} />
        <line x1={58} y1={0} x2={58} y2={12} />
      </g>
    );
  // seal with a check
  return (
    <g className="motif" strokeWidth={1.2}>
      <circle cx={0} cy={0} r={52} />
      <circle cx={0} cy={0} r={42} strokeWidth={0.8} />
      <path d="M-18 2 L-5 15 L22 -14" strokeWidth={1.6} />
    </g>
  );
}

export function EstateFigure() {
  const [active, setActive] = useState(0);
  const tops = [120, 214, 300];
  const p = PLATES[active];
  return (
    <div>
      <div className="figure-head">
        <span>Fig. 01 / Inside an estate</span>
        <span>Explanatory instrument</span>
      </div>
      <svg className="iso" viewBox="0 0 520 430" role="img" aria-label="Three stacked layers of an estate case: find, open, prove">
        <ellipse className="orbit" cx={260} cy={300} rx={245} ry={110} />
        <ellipse className="orbit" cx={260} cy={300} rx={200} ry={88} strokeDasharray="2 5" />
        {[2, 1, 0].map((i) => {
          const on = i === active;
          const lift = on ? -14 : 0;
          return (
            <g
              key={i}
              className={`plate${on ? " on" : ""}`}
              style={{ transform: `translateY(${lift}px)` }}
              onClick={() => setActive(i)}
            >
              <g transform={ISO(260, tops[i] + 8)}>
                <rect className="edge" x={-S} y={-S} width={S * 2} height={S * 2} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </g>
              <g transform={ISO(260, tops[i])}>
                <rect className="face" x={-S} y={-S} width={S * 2} height={S * 2} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <Motif i={i} />
              </g>
              <text className="plate-label" x={92} y={tops[i] + 6} textAnchor="end">
                {PLATES[i].no} / {PLATES[i].name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="fig-foot">
        <span>FIND → OPEN → PROVE</span>
        <span>K / ESTATE</span>
      </div>
      <div className="plate-tabs">
        {PLATES.map((pl, i) => (
          <button key={pl.no} type="button" aria-pressed={i === active} onClick={() => setActive(i)}>
            <span>{pl.no}</span>
            {pl.name}
          </button>
        ))}
      </div>
      <div className="plate-copy" aria-live="polite">
        <h3>{p.title}</h3>
        <p>{p.copy}</p>
        <a href={p.href}>
          {p.link} <span className="arrow">↗</span>
        </a>
      </div>
      <p className="fine" style={{ margin: "14px 0 0", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
        Explanatory geometry. Not a measured chart.
      </p>
    </div>
  );
}
