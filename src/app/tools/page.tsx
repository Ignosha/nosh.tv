import type { Metadata } from "next";
import Link from "next/link";
import { ToolHeader } from "@/components/ToolHeader";

export const metadata: Metadata = {
  title: "Free tools — Kin Ledger",
  description: "Free crypto estate tools: document scan, address check, hardware wallet scan, exchange letters and a legacy plan builder.",
};

const TOOLS = [
  { href: "/scan", name: "Estate scan", body: "Drop in emails, statements and notes. Finds exchanges, wallets, addresses and possible recovery phrases, privately in your browser.", tag: "Find" },
  { href: "/#check", name: "Address check", body: "Read one address's balance now and on the date of death across Bitcoin, Ethereum, Base, Arbitrum, Optimism, Polygon and Solana.", tag: "Prove" },
  { href: "/tools/wallet-key", name: "Hardware wallet scan", body: "Paste a Ledger, Trezor or Sparrow extended public key and see every address the wallet used, with live balances.", tag: "Find" },
  { href: "/tools/letters", name: "Exchange claim letters", body: "A complete deceased-account request letter for any exchange, ready to print or send.", tag: "Open" },
  { href: "/tools/plan", name: "Legacy plan builder", body: "For the living: a letter of instruction that tells your family what you hold and where, never your keys.", tag: "Plan" },
];

export default function ToolsPage() {
  return (
    <>
      <ToolHeader kicker="Free tools" title="Everything you need" accent="to get started." intro="Free, no account. Documents stay on your device, and every figure is read live from public sources." />
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
