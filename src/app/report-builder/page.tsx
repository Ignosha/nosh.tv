import { ReportStudio } from "@/components/ReportStudio";
export const metadata = {
  title: "Report Studio — branded evidence reports",
  description:
    "Build branded investigation reports with source citations, review checks and sealed JSON exports. Browser-first; original files are never uploaded.",
};
export default function Builder() {
  return (
    <div className="wrap" style={{ padding: "40px 0 80px" }}>
      <header className="no-print">
        <p className="kicker">TraceSworn Report Studio · preview</p>
        <h1>Reports your clients can follow.</h1>
        <p>
          Branded layouts, reusable drafts, evidence references and reviewed
          versions. Build a draft, print to PDF, or issue a verifiable JSON
          record.
        </p>
        <p>
          <a href="/assurance">Track risks &amp; actions</a> · <a href="/report-compare">Compare revisions</a> · <a href="/verify">Verify an issued record</a> ·{" "}
          <a href="/report-studio">Features &amp; pilot plans</a>
        </p>
      </header>
      <ReportStudio />
    </div>
  );
}
