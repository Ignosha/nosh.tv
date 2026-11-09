import type { Metadata } from "next";
import { ToolHeader } from "@/components/ToolHeader";
import { Verifier } from "@/components/Verifier";

export const metadata: Metadata = {
  title: "Verify a record — TraceSworn",
  description: "Confirm a TraceSworn evidence record has not been altered, by recomputing its SHA-256 fingerprint in your browser.",
};

export default function VerifyPage() {
  return (
    <>
      <ToolHeader kicker="Verify a record" title="Sealed means" accent="unchanged." intro="Every TraceSworn record carries a SHA-256 fingerprint. Opposing counsel, a court or an auditor can confirm here, or with any standard tool, that no figure was altered." />
      <section className="wrap" style={{ paddingBottom: 88, maxWidth: 820 }}>
        <Verifier />
      </section>
    </>
  );
}
