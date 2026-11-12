import { requireOrganization } from "@/lib/enterprise/session";
import { CompanyForm } from "@/components/CompanyForms";
import { submitCompanyReport, publishCompanyReport } from "../../actions";
export default async function Reports({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const { client, user, role } = await requireOrganization(org);
  const { data, error } = await client
    .from("kl_org_reports")
    .select(
      "id,submitted_by,reviewed_by,published_at,created_at,fingerprint,title:sealed->record->document->>title",
    )
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Company reports unavailable");
  return (
    <>
      <a href={`/workspace/${org}`}>← Company</a>
      <h1>Company report publication</h1>
      <p>
        Issued files are fingerprint-verified again in the database. Publishing
        requires a different authenticated owner, administrator or reviewer.
        Declared names within the source file are distinct from these
        authenticated publication identities.
      </p>
      {["owner", "admin", "editor"].includes(role) ? (
        <CompanyForm
          key={`${org}-upload`}
          action={submitCompanyReport.bind(null, org)}
          label="Submit for authenticated review"
        >
          <label>
            Issued report JSON (up to 850 KB)
            <input
              type="file"
              name="report"
              accept=".json,application/json"
              required
            />
          </label>
        </CompanyForm>
      ) : null}
      {data.map((r) => (
        <article className="form-card" key={r.id}>
          <h2>{r.title}</h2>
          <p>
            {r.published_at
              ? "Published " + r.published_at
              : "Pending independent review"}{" "}
            · Submitted by {r.submitted_by}
            {r.reviewed_by ? " · Authenticated reviewer " + r.reviewed_by : ""}
          </p>
          <p className="mono" style={{ overflowWrap: "anywhere" }}>
            {r.fingerprint}
          </p>
          <a href={`/workspace/${org}/reports/${r.id}/record`}>
            Download original sealed record
          </a>
          {!r.published_at &&
          r.submitted_by !== user.id &&
          ["owner", "admin", "reviewer"].includes(role) ? (
            <CompanyForm
              action={publishCompanyReport.bind(null, org)}
              label="Approve publication with my identity"
            >
              <input type="hidden" name="report" value={r.id} />
            </CompanyForm>
          ) : null}
        </article>
      ))}
    </>
  );
}
