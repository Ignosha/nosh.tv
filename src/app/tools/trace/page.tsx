import type { Metadata } from "next";
import { ToolHeader } from "@/components/ToolHeader";
import { TraceTool } from "@/components/TraceTool";

export const metadata: Metadata = {
  title: "Follow the money — TraceSworn",
  description: "Follow Bitcoin and Ethereum native transfers with sourced explorer labels and explicit coverage limits.",
};

export default function TracePage() {
  return (
    <>
      <ToolHeader kicker="Tracing map" title="Follow the money," accent="hop by hop." intro="Choose Bitcoin or an Ethereum network to follow native transfers. Review sourced explorer labels, transaction links and coverage limits before drawing conclusions." />
      <section className="wrap" style={{ paddingBottom: 96 }}>
        <TraceTool />
      </section>
    </>
  );
}
