// Fixed prices. Edit them here and the whole site updates.
// No percentages of the estate are ever charged.
// Optional: set NEXT_PUBLIC_PAY_<ID> (e.g. NEXT_PUBLIC_PAY_REPORT) to a Stripe Payment Link
// and the package's button takes clients straight to checkout. Without it, the button opens a case.

export type Package = {
  id: "scan" | "report" | "recovery" | "plan" | "partner";
  name: string;
  price: number; // USD
  cadence: "free" | "once" | "month";
  tagline: string;
  includes: string[];
  highlight?: boolean;
};

export const PACKAGES: Package[] = [
  {
    id: "scan",
    name: "Estate Scan",
    price: 0,
    cadence: "free",
    tagline: "Do it yourself, privately, in your browser.",
    includes: [
      "Find exchanges, wallets and addresses in documents",
      "Live balances on Bitcoin, Ethereum, Base, Arbitrum, Optimism, Polygon and Solana",
      "Hardware-wallet master key (xpub/zpub) scan",
      "Exchange claim letters and legacy plan builder",
    ],
  },
  {
    id: "report",
    name: "Estate Report",
    price: 499,
    cadence: "once",
    tagline: "We do the discovery and hand your attorney the numbers.",
    includes: [
      "Discovery across documents and devices you provide",
      "Every address read on the public ledger",
      "Date-of-death valuation with named sources",
      "Findings call with the family or executor",
    ],
  },
  {
    id: "recovery",
    name: "Full Recovery",
    price: 1999,
    cadence: "once",
    tagline: "Everything, start to finish, for one fixed price.",
    includes: [
      "Everything in the Estate Report",
      "Exchange claims handled for up to 5 exchanges",
      "Offline wallet password and partial-phrase recovery",
      "Final valuation and close-out file for the estate",
    ],
    highlight: true,
  },
  {
    id: "plan",
    name: "Legacy Plan",
    price: 299,
    cadence: "once",
    tagline: "For the living: make sure your family can find it.",
    includes: [
      "Guided session to map your holdings without exposing keys",
      "A written letter of instruction for your executor",
      "Safe storage recommendations for backups",
      "One free update within 12 months",
    ],
  },
  {
    id: "partner",
    name: "Attorney Partner",
    price: 199,
    cadence: "month",
    tagline: "For firms that see crypto in estates regularly.",
    includes: [
      "2 Estate Reports per month included",
      "Priority turnaround for your clients",
      "Co-branded findings reports",
      "Cancel any month",
    ],
  },
];

export function priceLabel(p: Package): string {
  if (p.cadence === "free") return "Free";
  return "$" + p.price.toLocaleString("en-US") + (p.cadence === "month" ? "/mo" : "");
}

export function payLink(id: Package["id"]): string | null {
  const links: Record<Package["id"], string | undefined> = {
    scan: undefined,
    report: process.env.NEXT_PUBLIC_PAY_REPORT,
    recovery: process.env.NEXT_PUBLIC_PAY_RECOVERY,
    plan: process.env.NEXT_PUBLIC_PAY_PLAN,
    partner: process.env.NEXT_PUBLIC_PAY_PARTNER,
  };
  const url = links[id];
  return url && /^https:\/\//.test(url) ? url : null;
}
