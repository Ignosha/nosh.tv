// Fixed prices. Edit them here and the whole site updates.
// No percentages of the estate are ever charged.
// Each paid package has a live Stripe Payment Link below; NEXT_PUBLIC_PAY_<ID> can override it.

export type Package = {
  id: "scan" | "report" | "recovery" | "complex" | "plan" | "partner";
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
    price: 1250,
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
    price: 4950,
    cadence: "once",
    tagline: "A standard estate, start to finish, for one fixed price.",
    includes: [
      "Everything in the Estate Report",
      "Exchange claims handled for up to 5 exchanges",
      "Offline recovery for up to 2 wallets or devices",
      "Final valuation and close-out file for the estate",
    ],
    highlight: true,
  },
  {
    id: "complex",
    name: "Complex Recovery",
    price: 9500,
    cadence: "once",
    tagline: "For larger estates with many accounts, wallets or DeFi.",
    includes: [
      "Everything in Full Recovery",
      "6+ exchanges and multiple wallets or devices",
      "DeFi positions, staking and cross-chain tracing",
      "Dedicated case lead and weekly updates",
    ],
  },
  {
    id: "plan",
    name: "Legacy Plan",
    price: 750,
    cadence: "once",
    tagline: "For the living: make sure your family can find it. Couples $1,100.",
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
    price: 750,
    cadence: "month",
    tagline: "For firms that see crypto in estates regularly.",
    includes: [
      "1 Estate Report per month included",
      "25% off every additional case",
      "Priority turnaround and co-branded reports",
      "Cancel any month",
    ],
  },
];

// Add-ons keep one flat price fair when a case is bigger than its package.
export const ADDONS: { name: string; price: string; note: string }[] = [
  { name: "Extra exchange", price: "$495", note: "each, beyond the package" },
  { name: "Extra wallet or device", price: "$1,250", note: "each, beyond the package" },
  { name: "Rush delivery", price: "+$1,000", note: "findings within 5 business days" },
];

export function priceLabel(p: Package): string {
  if (p.cadence === "free") return "Free";
  return "$" + p.price.toLocaleString("en-US") + (p.cadence === "month" ? "/mo" : "");
}

// Live Stripe Payment Links (created in the Kinledger Stripe account). An env var overrides any of them.
const STRIPE_LINKS: Record<Exclude<Package["id"], "scan">, string> = {
  report: "https://buy.stripe.com/bJe6oH3WE0pl2ud7Su6Vq00",
  recovery: "https://buy.stripe.com/7sY28r0Ks9ZV8SB4Gi6Vq01",
  complex: "https://buy.stripe.com/7sYfZh64M2xt5GpegS6Vq02",
  plan: "https://buy.stripe.com/aFa5kDfFmc830m57Su6Vq03",
  partner: "https://buy.stripe.com/aFa8wP50I0pld8R1u66Vq05",
};
export const COUPLE_PLAN_LINK = "https://buy.stripe.com/9B67sL50Ic83fgZ6Oq6Vq04";
export const ADDONS_LINK = "https://buy.stripe.com/eVqdR9dxeb3Z1q97Su6Vq06";

export function payLink(id: Package["id"]): string | null {
  if (id === "scan") return null;
  const env: Record<Exclude<Package["id"], "scan">, string | undefined> = {
    report: process.env.NEXT_PUBLIC_PAY_REPORT,
    recovery: process.env.NEXT_PUBLIC_PAY_RECOVERY,
    complex: process.env.NEXT_PUBLIC_PAY_COMPLEX,
    plan: process.env.NEXT_PUBLIC_PAY_PLAN,
    partner: process.env.NEXT_PUBLIC_PAY_PARTNER,
  };
  const url = env[id] || STRIPE_LINKS[id];
  return /^https:\/\//.test(url) ? url : null;
}

/** A payment link tied to one case, so the Stripe webhook marks that case paid. */
export function casePayLink(base: string, caseId: string, email?: string | null): string {
  const u = new URL(base);
  u.searchParams.set("client_reference_id", caseId);
  if (email) u.searchParams.set("prefilled_email", email);
  return u.toString();
}

export function packageById(id: string | null | undefined): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}
