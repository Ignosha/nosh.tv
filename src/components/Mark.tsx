// The TraceSworn mark: an archive folder with a keyhole.
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 9.5A2.5 2.5 0 0 1 5.5 7H12l2.6 3H26.5A2.5 2.5 0 0 1 29 12.5v12A2.5 2.5 0 0 1 26.5 27h-21A2.5 2.5 0 0 1 3 24.5z" fill="var(--accent)" />
      <circle cx="16" cy="17" r="2.6" fill="var(--paper)" />
      <path d="M14.9 18.6h2.2l.7 4h-3.6z" fill="var(--paper)" />
    </svg>
  );
}
