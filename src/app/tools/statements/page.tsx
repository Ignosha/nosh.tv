import type { Metadata } from "next";
import { ToolHeader } from "@/components/ToolHeader";
import { StatementScanner } from "@/components/StatementScanner";

export const metadata: Metadata = {
  title: "Statement scan — TraceSworn",
  description: "Find payments to and from crypto exchanges in bank and card statements, privately in your browser.",
};

export default function StatementsPage() {
  return (
    <>
      <ToolHeader kicker="Statement scan" title="Crypto leaves a trail" accent="in the bank." intro="Money has to reach an exchange somehow. Drop in bank or card statements and see every payment to, or from, a crypto exchange, with dates and totals." />
      <section className="wrap" style={{ paddingBottom: 88 }}>
        <StatementScanner />
      </section>
    </>
  );
}
