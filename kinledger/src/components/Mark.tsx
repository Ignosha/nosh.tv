// The Kinledger mark: a key whose bow is a ruled ledger seal.
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="11" cy="16" r="9" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="16" r="6" stroke="currentColor" strokeWidth="0.8" />
      <path d="M7.5 14h7M7.5 16h7M7.5 18h4.5" stroke="currentColor" strokeWidth="0.9" />
      <path d="M20 16h10M26 16v4M29 16v3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}
