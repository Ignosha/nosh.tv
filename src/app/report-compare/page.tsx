import { ReportComparison } from "@/components/ReportComparison";
export const metadata = { title: "Compare issued reports — TraceSworn" };
export default function Compare() {
  return (
    <div className="wrap assurance-page" style={{ padding: "40px 0" }}>
      <header className="no-print">
        <a href="/report-builder">← Report Studio</a>
        <h1>See exactly what changed.</h1>
        <p>
          Verify two issued reports, then compare findings, source fingerprints,
          review checks and report metadata before relying on a revision.
        </p>
      </header>
      <ReportComparison />
    </div>
  );
}
