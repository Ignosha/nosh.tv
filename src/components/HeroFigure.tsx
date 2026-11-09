"use client";

import { useState } from "react";

// FIG. 01: three engraved plates, the three stages of every matter. Explanatory geometry, not a chart.
const STAGES = [
  { tab: "Trace", title: "Where did it go?", copy: "Statements, emails and devices show which exchanges and wallets were used. We follow the money, hop by hop, to where it landed.", href: "/tools/trace", cta: "Follow the money" },
  { tab: "Value", title: "What was it worth?", copy: "Every address read on the public ledger and valued on the date that matters: death, separation or petition.", href: "#check", cta: "Read an address" },
  { tab: "Seal", title: "Can they check it?", copy: "Every record is sealed with a SHA-256 fingerprint and delivered as numbered court exhibits anyone can verify.", href: "/verify", cta: "Verify a record" },
];

function Plate({ y, i, on, label }: { y: number; i: number; on: boolean; label: string }) {
  const cx = 270, w = 220, h = 78, t = 9;
  const top = `M${cx},${y - h} L${cx + w},${y} L${cx},${y + h} L${cx - w},${y} Z`;
  const side = `M${cx - w},${y} L${cx},${y + h} L${cx + w},${y} L${cx + w},${y + t} L${cx},${y + h + t} L${cx - w},${y + t} Z`;
  const stroke = on ? "url(#plate-gold)" : "var(--line-2)";
  return (
    <g className="plate" style={{ opacity: on ? 1 : 0.85, transform: on ? "translateY(-6px)" : "none" }}>
      <path d={side} fill="var(--paper)" stroke={stroke} strokeWidth="1" />
      {Array.from({ length: 14 }).map((_, k) => {
        const x = cx - w + (k + 1) * ((2 * w) / 15);
        const yy = x < cx ? y + ((x - (cx - w)) / w) * h : y + ((cx + w - x) / w) * h;
        return <line key={k} x1={x} y1={yy} x2={x} y2={yy + t} stroke={stroke} strokeWidth="0.5" opacity="0.6" />;
      })}
      <path d={top} fill="var(--card)" stroke={stroke} strokeWidth={on ? 1.2 : 1} />
      <g fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.9">
        {i === 0 ? (
          <>
            <ellipse cx={cx} cy={y} rx="120" ry="42" />
            <ellipse cx={cx} cy={y} rx="74" ry="26" />
            <ellipse cx={cx} cy={y} rx="30" ry="10.5" />
            <path d={`M${cx - 150},${y} H${cx + 150} M${cx},${y - 52} V${y + 52}`} />
          </>
        ) : i === 1 ? (
          [-2, -1, 0, 1, 2].map((k) => <path key={k} d={`M${cx - 110 + k * 22},${y + 38} L${cx + k * 22},${y} L${cx + 110 + k * 22},${y - 38}`} opacity={0.4 + 0.12 * (k + 2)} />)
        ) : (
          <>
            <path d={`M${cx},${y - 40} L${cx + 46},${y - 16} L${cx + 46},${y + 10} C${cx + 46},${y + 30} ${cx + 18},${y + 42} ${cx},${y + 48} C${cx - 18},${y + 42} ${cx - 46},${y + 30} ${cx - 46},${y + 10} L${cx - 46},${y - 16} Z`} />
            <path d={`M${cx - 16},${y + 4} L${cx - 4},${y + 16} L${cx + 20},${y - 10}`} />
          </>
        )}
      </g>
      <text x={cx - w + 34} y={y + 4} fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2" fill={on ? "var(--ink)" : "var(--ink-3)"}>
        0{i + 1} / {label.toUpperCase()}
      </text>
    </g>
  );
}

export function HeroFigure() {
  const [active, setActive] = useState(0);
  const s = STAGES[active];
  return (
    <figure className="plate-fig" style={{ margin: 0 }}>
      <div className="fig-head">
        <span>Fig. 01 / Inside the record</span>
        <span>Sealed instrument</span>
      </div>
      <svg viewBox="0 0 540 400" role="img" aria-label="Three stages of a matter: trace, value, seal">
        <defs>
          <linearGradient id="plate-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#93702f" />
            <stop offset="0.5" stopColor="#f1dfae" />
            <stop offset="1" stopColor="#a8823f" />
          </linearGradient>
        </defs>
        <ellipse cx="270" cy="250" rx="262" ry="96" fill="none" stroke="var(--line)" strokeDasharray="2 5" />
        {[2, 1, 0].map((i) => (
          <Plate key={i} y={110 + i * 92} i={i} on={i === active} label={STAGES[i].tab} />
        ))}
      </svg>
      <div className="fig-foot">
        <span>Trace → Value → Seal</span>
        <span>SHA-256</span>
      </div>
      <div className="plate-tabs" role="tablist" aria-label="How TraceSworn works">
        {STAGES.map((st, i) => (
          <button key={st.tab} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)}>
            <span>0{i + 1}</span>
            {st.tab}
          </button>
        ))}
      </div>
      <div className="plate-copy" role="tabpanel">
        <h3>{s.title}</h3>
        <p>{s.copy}</p>
        <a className="go" href={s.href}>
          {s.cta} <span className="arrow">↗</span>
        </a>
      </div>
    </figure>
  );
}
