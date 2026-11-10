import { AssuranceWorkspace } from "@/components/AssuranceWorkspace";
export const metadata = {
  title: "Assurance Workspace — risks, evidence and recurring obligations",
};
export default function AssurancePage() {
  return (
    <div className="wrap assurance-page" style={{ padding: "40px 0" }}>
      <header className="no-print">
        <p className="kicker">Company assurance · local preview</p>
        <h1>Turn findings into accountable follow-through.</h1>
        <p>
          Assess risk, link evidence, track dependent actions, review closure
          and schedule recurring work. Import issued Report Studio findings to
          start a risk register.
        </p>
        <p>
          <a href="/report-studio">Plans &amp; capabilities</a> ·{" "}
          <a href="/report-builder">Report Studio</a> ·{" "}
          <a href="/admin/assurance">Hosted programs</a> ·{" "}
          <a href="/report-compare">Compare reports</a>
        </p>
      </header>
      <AssuranceWorkspace />
    </div>
  );
}
