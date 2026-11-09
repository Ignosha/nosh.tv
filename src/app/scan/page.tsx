import type { Metadata } from "next";
import { ScanDesk } from "@/components/ScanDesk";

export const metadata: Metadata = {
  title: "Document scan — TraceSworn",
  description: "Find exchanges, wallets and addresses in an estate's documents, privately in your browser, then read them on the public ledger.",
};

export default function ScanPage() {
  return (
    <>
      <section style={{ borderBottom: "1px solid var(--line)", padding: "40px 0 28px" }} className="no-print">
        <div className="wrap">
          <span className="kicker">Free document scan</span>
          <h1 className="serif" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "10px 0 12px" }}>
            Find what the documents <em style={{ color: "var(--accent)" }}>already know.</em>
          </h1>
          <p className="muted" style={{ maxWidth: "40em", margin: 0 }}>
            Your documents are read in this browser and never uploaded. The scan finds exchanges, wallets, addresses and
            possible recovery phrases, then reads each address&rsquo;s balance on the public ledger and values it on the
            valuation date.
          </p>
        </div>
      </section>
      <ScanDesk />
    </>
  );
}
