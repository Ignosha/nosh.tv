// Fixed prices for professional clients (attorneys, fiduciaries, trustees). Edit them here and the site updates.
// No percentage of the estate, settlement or recovery is ever charged.
// Each paid package has a live Stripe Payment Link below; NEXT_PUBLIC_PAY_<ID> can override it.

export type Package = {
  id: "scan" | "report" | "recovery" | "complex" | "partner";
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
    name: "Free tools",
    price: 0,
    cadence: "free",
    tagline: "Run the first pass yourself, privately.",
    includes: [
      "Bank and card statement scan for exchange payments",
      "Document scan for exchanges, wallets and addresses",
      "Live balances on 7 networks plus hardware-wallet key scan",
      "Seal and verify any record with a SHA-256 fingerprint",
    ],
  },
  {
    id: "report",
    name: "Discovery Report",
    price: 2500,
    cadence: "once",
    tagline: "Find it and value it, for one matter.",
    includes: [
      "Statement, document and device tracing for one person",
      "Every address and wallet key read on the public ledger",
      "Valuation on one date: death, separation or petition",
      "Sealed evidence record anyone can verify",
    ],
  },
  {
    id: "recovery",
    name: "Evidence Package",
    price: 4950,
    cadence: "once",
    tagline: "Court-ready, with the paperwork done.",
    includes: [
      "Everything in the Discovery Report",
      "Records or claim requests for up to 5 exchanges",
      "Analysis of up to 2 wallets or devices",
      "Written methodology appendix and one revision",
    ],
    highlight: true,
  },
  {
    id: "complex",
    name: "Complex Matter",
    price: 7500,
    cadence: "once",
    tagline: "Contested, multi-party or DeFi-heavy matters.",
    includes: [
      "Everything in the Evidence Package",
      "Multiple parties or valuation dates",
      "6+ exchanges, DeFi and staking positions",
      "Wallet-to-wallet tracing and a dedicated case lead",
    ],
  },
  {
    id: "partner",
    name: "Firm Plan",
    price: 1500,
    cadence: "month",
    tagline: "For firms with crypto in their caseload.",
    includes: [
      "2 Discovery Reports per month included",
      "25% off every additional matter",
      "Priority turnaround and co-branded reports",
      "Cancel any month",
    ],
  },
];

// Add-ons keep one flat price fair when a matter is bigger than its package.
export const ADDONS: { name: string; price: string; note: string }[] = [
  { name: "Additional valuation date", price: "$350", note: "each, e.g. separation and trial dates" },
  { name: "Additional exchange", price: "$495", note: "each, beyond the package" },
  { name: "Additional wallet or device", price: "$1,250", note: "each, beyond the package" },
  { name: "Rush delivery", price: "+$1,500", note: "findings within 5 business days" },
];

export function priceLabel(p: Package): string {
  if (p.cadence === "free") return "Free";
  return "$" + p.price.toLocaleString("en-US") + (p.cadence === "month" ? "/mo" : "");
}

// Live Stripe Payment Links (TraceSworn Stripe account). An env var overrides any of them.
const STRIPE_LINKS: Record<Exclude<Package["id"], "scan">, string> = {
  report: "https://buy.stripe.com/eVq00j2SA0pl0m5egS6Vq07",
  recovery: "https://buy.stripe.com/00weVd3WE9ZV7Oxb4G6Vq08",
  complex: "https://buy.stripe.com/6oU14nctaegb1q9a0C6Vq09",
  partner: "https://buy.stripe.com/eVq7sLbp64FBd8Rgp06Vq0a",
};
export const ADDONS_LINK = "https://buy.stripe.com/aFa28ral2egbfgZ5Km6Vq0b";

export function payLink(id: Package["id"]): string | null {
  if (id === "scan") return null;
  const env: Record<Exclude<Package["id"], "scan">, string | undefined> = {
    report: process.env.NEXT_PUBLIC_PAY_REPORT,
    recovery: process.env.NEXT_PUBLIC_PAY_RECOVERY,
    complex: process.env.NEXT_PUBLIC_PAY_COMPLEX,
    partner: process.env.NEXT_PUBLIC_PAY_PARTNER,
  };
  const url = env[id] || STRIPE_LINKS[id];
  return /^https:\/\//.test(url) ? url : null;
}

/** A payment link tied to one matter, so the Stripe webhook marks that matter paid. */
export function casePayLink(base: string, caseId: string, email?: string | null): string {
  const u = new URL(base);
  u.searchParams.set("client_reference_id", caseId);
  if (email) u.searchParams.set("prefilled_email", email);
  return u.toString();
}

export function packageById(id: string | null | undefined): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}
