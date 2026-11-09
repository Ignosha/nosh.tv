import type { Metadata } from "next";
import { ToolHeader } from "@/components/ToolHeader";
import { TraceTool } from "@/components/TraceTool";

export const metadata: Metadata = {
  title: "Follow the money — TraceSworn",
  description: "See where Bitcoin was sent from an address, which wallets were spent together, and which transfers landed at an exchange. Live from the public ledger.",
};

export default function TracePage() {
  return (
    <>
      <ToolHeader kicker="Tracing map" title="Follow the money," accent="hop by hop." intro="Enter a Bitcoin address to see where its funds went, which addresses were spent together (and so likely share an owner), and which transfers reached an exchange or custodian." />
      <section className="wrap" style={{ paddingBottom: 96 }}>
        <TraceTool />
      </section>
    </>
  );
}
