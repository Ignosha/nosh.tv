import type { Metadata } from "next";
import Link from "next/link";
import { ToolHeader } from "@/components/ToolHeader";

export const metadata: Metadata = {
  title: "Free tools — TraceSworn",
  description: "Free crypto estate tools: document scan, address check, hardware wallet scan, exchange letters and a legacy plan builder.",
};

const TOOLS = [
  { href: "/tools/statements", name: "Statement scan", body: "Find every payment to or from a crypto exchange, app or Bitcoin ATM in bank and card statements, with dates and totals.", tag: "Trace" },
  { href: "/scan", name: "Document scan", body: "Drop in emails, statements and notes. Finds exchanges, wallets, addresses and possible recovery phrases, privately in your browser.", tag: "Trace" },
  { href: "/tools/wallet-key", name: "Hardware wallet scan", body: "Paste a Ledger, Trezor or Sparrow extended public key and see every address the wallet used, with live balances.", tag: "Trace" },
  { href: "/#check", name: "Address check", body: "Read one address's balance today and on any valuation date across Bitcoin, Ethereum, Base, Arbitrum, Optimism, Polygon and Solana.", tag: "Value" },
  { href: "/verify", name: "Verify a record", body: "Confirm any TraceSworn record is unchanged by recomputing its SHA-256 fingerprint. For courts, opposing counsel and auditors.", tag: "Seal" },
  { href: "/tools/letters", name: "Exchange request letters", body: "A complete records or deceased-account request letter for any exchange, ready to print or send.", tag: "Recover" },
];

export default function ToolsPage() {
  return (
    <>
      <ToolHeader kicker="Free tools" title="Everything you need" accent="to get started." intro="Free, no account. Documents stay on your device, every figure is read live from public sources, and every record can be sealed and verified." />
      <section className="wrap" style={{ paddingBottom: 96 }}>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="tool-card">
              <span className="stamp stamp-found">{t.tag}</span>
              <h3>{t.name}</h3>
              <p>{t.body}</p>
              <span className="tool-go">Open <span className="arrow">→</span></span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
