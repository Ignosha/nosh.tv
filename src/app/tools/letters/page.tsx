import type { Metadata } from "next";
import { LetterBuilder } from "@/components/LetterBuilder";
import { ToolHeader } from "@/components/ToolHeader";

export const metadata: Metadata = {
  title: "Exchange claim letters — Kinledger",
  description: "Write a deceased-account request letter to any crypto exchange, ready to print. Free, and nothing leaves your browser.",
};

export default function LettersPage() {
  return (
    <>
      <ToolHeader kicker="Exchange claim letters" title="Ask the exchange," accent="the right way." intro="Fill in the estate's details once and get a clear, complete request letter for any exchange. It stays in your browser." />
      <section className="wrap" style={{ paddingBottom: 88 }}>
        <LetterBuilder />
      </section>
    </>
  );
}
