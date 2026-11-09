// An engraved guilloché rosette, the kind printed on banknotes and certificates. Pure geometry, no data.
function trochoid(R: number, r: number, d: number, turns: number, steps: number, scale: number, phase = 0) {
  let p = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI + phase;
    const k = (R - r) / r;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    p += (i ? "L" : "M") + (x * scale).toFixed(1) + "," + (y * scale).toFixed(1);
  }
  return p + "Z";
}

function wave(radius: number, amp: number, lobes: number, steps: number, phase: number) {
  let p = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const rr = radius + amp * Math.sin(lobes * t + phase);
    p += (i ? "L" : "M") + (rr * Math.cos(t)).toFixed(1) + "," + (rr * Math.sin(t)).toFixed(1);
  }
  return p + "Z";
}

export function Guilloche({ size = 560, className }: { size?: number; className?: string }) {
  const outer = [0, 1, 2, 3, 4, 5].map((k) => wave(250, 9, 36, 720, (k * Math.PI) / 18));
  const band = [0, 1, 2, 3].map((k) => wave(206 - k * 5, 14, 24, 600, (k * Math.PI) / 12));
  const rosette = [
    trochoid(80, 30, 62, 3, 900, 1.5),
    trochoid(80, 30, 62, 3, 900, 1.5, Math.PI / 24),
    trochoid(84, 21, 40, 1, 700, 1.15),
    trochoid(84, 21, 40, 1, 700, 1.15, Math.PI / 21),
  ];
  return (
    <svg className={className} width={size} height={size} viewBox="-270 -270 540 540" aria-hidden="true">
      <defs>
        <linearGradient id="g-gold" gradientUnits="userSpaceOnUse" x1="-270" y1="-270" x2="270" y2="270">
          <stop offset="0" stopColor="#8f6c2d" />
          <stop offset="0.5" stopColor="#f1dfae" />
          <stop offset="1" stopColor="#a8823f" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#g-gold)">
        <circle r="262" strokeWidth="0.8" />
        <circle r="258" strokeWidth="0.4" />
        {outer.map((d, i) => <path key={"o" + i} d={d} strokeWidth="0.45" opacity="0.7" />)}
        <circle r="232" strokeWidth="0.5" strokeDasharray="1 3" />
        {band.map((d, i) => <path key={"b" + i} d={d} strokeWidth="0.5" opacity="0.8" />)}
        <circle r="176" strokeWidth="0.6" />
        <g className="rosette-spin">
          {rosette.map((d, i) => <path key={"r" + i} d={d} strokeWidth="0.5" opacity={i < 2 ? 0.75 : 0.9} />)}
        </g>
        <circle r="36" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
