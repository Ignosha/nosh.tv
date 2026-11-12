type Icon =
  | "grid"
  | "proof"
  | "review"
  | "clock"
  | "change"
  | "arrow"
  | "team"
  | "shield";
const paths: Record<Icon, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  proof: (
    <>
      <path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5" />
      <path d="m3 11 2 2 4-4" />
    </>
  ),
  review: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  change: (
    <>
      <path d="M5 3v12a4 4 0 0 0 4 4h10M14 14l5 5-5 4M5 9h10a4 4 0 0 0 4-4V3" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
};
export function ProductIcon({
  name,
  className = "",
}: {
  name: Icon;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
