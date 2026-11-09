// The TraceSworn seal: a double-ringed monogram, engraved in gold.
export function Mark({ size = 34 }: { size?: number }) {
  const id = `ts-gold-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8823f" />
          <stop offset="0.45" stopColor="#f1dfae" />
          <stop offset="1" stopColor="#93702f" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="none" stroke={`url(#${id})`} strokeWidth="1" />
      <circle cx="20" cy="20" r="16" fill="none" stroke={`url(#${id})`} strokeWidth="0.6" strokeDasharray="0.6 1.6" />
      <text x="20" y="26.4" textAnchor="middle" fontFamily="var(--font-display)" fontSize="19" fill="var(--ink)">
        T<tspan fontStyle="italic" fill={`url(#${id})`} dx="-1">s</tspan>
      </text>
    </svg>
  );
}
