import type { Metadata } from "next";
import { PlanBuilder } from "@/components/PlanBuilder";
import { ToolHeader } from "@/components/ToolHeader";

export const metadata: Metadata = {
  title: "Legacy plan builder — Kin Ledger",
  description: "Write a crypto letter of instruction so your family can find what you hold, without ever writing down your keys.",
};

export default function PlanPage() {
  return (
    <>
      <ToolHeader kicker="Legacy plan builder" title="Leave a map," accent="not your keys." intro="Most lost crypto is lost because nobody knew it existed. Write down what you hold and where, never the secrets, and keep it with your will." />
      <section className="wrap" style={{ paddingBottom: 88 }}>
        <PlanBuilder />
      </section>
    </>
  );
}
