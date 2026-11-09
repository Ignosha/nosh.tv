import Link from "next/link";

// Three engraved line illustrations, joined by a chain: the custody of every figure from lead to sealed record.
function Trace() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <g fill="none" stroke="url(#coc-gold)" strokeWidth="1.2" strokeLinecap="round">
        <rect x="14" y="58" width="44" height="22" rx="11" />
        <rect x="46" y="58" width="44" height="22" rx="11" transform="rotate(-8 68 69)" />
        <rect x="78" y="54" width="44" height="22" rx="11" />
        <circle cx="104" cy="50" r="28" strokeWidth="1.4" />
        <circle cx="104" cy="50" r="23" strokeWidth="0.5" strokeDasharray="1 2.5" />
        <path d="M124 70 L146 96" strokeWidth="5" />
        <path d="M124 70 L146 96" stroke="var(--card)" strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${86 + i * 4},${36 + i * 2} q14,-4 28,4`} strokeWidth="0.4" opacity="0.6" />
        ))}
      </g>
    </svg>
  );
}

function Value() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <g fill="none" stroke="url(#coc-gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M80 18 V98" />
        <path d="M60 104 H100 M66 98 H94" />
        <circle cx="80" cy="16" r="4" />
        <path d="M30 34 H130" />
        <path d="M30 34 L16 70 M30 34 L44 70 M130 34 L116 64 M130 34 L144 64" strokeWidth="0.7" />
        <path d="M12 70 Q30 84 48 70 Z" />
        <path d="M112 64 Q130 78 148 64 Z" />
        <path d="M74 50 Q80 44 86 50" strokeWidth="0.6" />
        {[0, 1, 2].map((i) => <ellipse key={i} cx="130" cy={60 - i * 3} rx="8" ry="2" strokeWidth="0.6" />)}
      </g>
    </svg>
  );
}

function Seal() {
  const scallops = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `${i ? "L" : "M"}${(80 + 38 * Math.cos(a)).toFixed(1)},${(52 + 38 * Math.sin(a)).toFixed(1)} Q${(80 + 43 * Math.cos(a + 0.13)).toFixed(1)},${(52 + 43 * Math.sin(a + 0.13)).toFixed(1)} ${(80 + 38 * Math.cos(a + 0.26)).toFixed(1)},${(52 + 38 * Math.sin(a + 0.26)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <g fill="none" stroke="url(#coc-gold)" strokeWidth="1.1" strokeLinejoin="round">
        <path d="M62 82 L50 116 L62 108 L70 118 L76 86" />
        <path d="M98 82 L110 116 L98 108 L90 118 L84 86" />
        <path d={scallops + " Z"} fill="var(--card)" />
        <circle cx="80" cy="52" r="28" />
        <circle cx="80" cy="52" r="24" strokeWidth="0.5" strokeDasharray="1 2" />
        <text x="80" y="61" textAnchor="middle" fontFamily="var(--font-display)" fontSize="26" fill="url(#coc-gold)" stroke="none">
          T<tspan fontStyle="italic">s</tspan>
        </text>
      </g>
    </svg>
  );
}

const STEPS = [
  { n: "I", title: "Trace", line: "Where did it go?", copy: "Statements, emails and devices show which exchanges and wallets were used. We follow the money hop by hop to where it landed.", href: "/tools/trace", cta: "Follow the money", Art: Trace },
  { n: "II", title: "Value", line: "What was it worth?", copy: "Every address read on the public ledger and valued on the date that matters: death, separation or petition.", href: "#check", cta: "Read an address", Art: Value },
  { n: "III", title: "Seal", line: "Can they check it?", copy: "Every record carries a SHA-256 fingerprint and ships as numbered court exhibits anyone can verify.", href: "/verify", cta: "Verify a record", Art: Seal },
];

export function ChainOfCustody() {
  return (
    <section className="section custody" id="custody">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="coc-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="120">
            <stop offset="0" stopColor="#8f6c2d" />
            <stop offset="0.5" stopColor="#f1dfae" />
            <stop offset="1" stopColor="#a8823f" />
          </linearGradient>
        </defs>
      </svg>
      <div className="wrap">
        <div className="section-head split">
          <div>
            <span className="kicker">The chain of custody</span>
            <h2>
              From a lead <em>to a sealed record.</em>
            </h2>
          </div>
          <p className="section-intro">Every figure keeps an unbroken chain: where it was found, where it was read, and the fingerprint that proves it was never changed.</p>
        </div>
        <ol className="custody-chain">
          {STEPS.map(({ n, title, line, copy, href, cta, Art }) => (
            <li key={n}>
              <div className="custody-art"><Art /></div>
              <div className="custody-n">{n}</div>
              <h3>{title}</h3>
              <div className="custody-line">{line}</div>
              <p>{copy}</p>
              <Link className="go" href={href}>{cta} <span className="arrow">→</span></Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
