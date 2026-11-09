import type { Metadata } from "next";
import { XpubScanner } from "@/components/XpubScanner";
import { ToolHeader } from "@/components/ToolHeader";

export const metadata: Metadata = {
  title: "Hardware wallet scan — TraceSworn",
  description: "Find every address a Bitcoin hardware wallet used, from its extended public key, with live balances.",
};

export default function WalletKeyPage() {
  return (
    <>
      <ToolHeader kicker="Hardware wallet scan" title="One key." accent="Every address." intro="Hardware wallets spread funds across many addresses. Their extended public key reveals all of them, read-only, so nothing is missed." />
      <section className="wrap" style={{ paddingBottom: 88 }}>
        <XpubScanner />
      </section>
    </>
  );
}
