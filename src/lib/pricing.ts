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
    price: 6500,
    cadence: "once",
    tagline: "Court-ready, with the exhibits done.",
    includes: [
      "Everything in the Discovery Report",
      "Numbered court exhibit pack with balance-history charts",
      "Methodology appendix and declaration template",
      "Records or claim requests for up to 5 exchanges",
      "Up to 2 wallets or devices, and one revision",
    ],
    highlight: true,
  },
  {
    id: "complex",
    name: "Complex Matter",
    price: 12500,
    cadence: "once",
    tagline: "Hidden, contested or multi-party matters.",
    includes: [
      "Everything in the Evidence Package",
      "Follow-the-money tracing map: three hops, same-owner wallets, exchange landing points",
      "Multiple parties or valuation dates",
      "6+ exchanges, DeFi and staking positions",
      "A dedicated case lead",
    ],
  },
  {
    id: "partner",
    name: "Firm Plan",
    price: 4500,
    cadence: "month",
    tagline: "For firms with crypto in their caseload.",
    includes: [
      "2 Discovery Reports per month included",
      "Asset-movement alerts on one matter included",
      "25% off every additional matter",
      "Priority turnaround and co-branded reports",
      "Cancel any month",
    ],
  },
];

// Add-ons keep one flat price fair when a matter is bigger than its package.
export const ADDONS: { name: string; price: string; note: string; link?: string }[] = [
  { name: "Asset-movement alerts", price: "$750/mo", note: "every address watched daily; a sealed alert the day anything moves", link: "https://buy.stripe.com/8x26oH3WE8VR9WF2ya6Vq0e" },
  { name: "Tax cost-basis schedule", price: "$1,950", note: "every lot valued on the day received, FIFO, for the estate return or division", link: "https://buy.stripe.com/28E14nal2fkfecV8Wy6Vq0f" },
  { name: "Dissipation analysis", price: "$1,500", note: "every transfer out in the look-back and after the key date, valued", link: "https://buy.stripe.com/aFacN50Ksb3Zb0J2ya6Vq0g" },
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
  recovery: "https://buy.stripe.com/8x28wPeBi1tp0m52ya6Vq0c",
  complex: "https://buy.stripe.com/9B6bJ164M8VR0m5gp06Vq0d",
  partner: "https://buy.stripe.com/9B68wP64Mc83gl32ya6Vq0h",
};
export const ADDONS_LINK = "https://buy.stripe.com/aFa28ral2egbfgZ5Km6Vq0b";
export const ALERTS_LINK = "https://buy.stripe.com/8x26oH3WE8VR9WF2ya6Vq0e";
export const COST_BASIS_LINK = "https://buy.stripe.com/28E14nal2fkfecV8Wy6Vq0f";
export const DISSIPATION_LINK = "https://buy.stripe.com/aFacN50Ksb3Zb0J2ya6Vq0g";

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
